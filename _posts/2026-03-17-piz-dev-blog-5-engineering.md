---
title: "piz 开发日志（五）：跨平台工程化实践"
date: 2026-03-17
categories: [Rust, CLI, Engineering]
tags: [piz, rust, cross-platform, ci, testing, 开发日志]
description: "piz 开发日志最终篇。讲解 Windows 编码处理、Shell 集成的 eval 模式设计、SQLite 缓存系统、CI/CD 流水线、测试体系和自动更新机制。"
---

# piz 开发日志（五）：跨平台工程化实践

> 这是 piz 开发日志系列的最后一篇。一个 CLI 工具要在三个平台上稳定运行，需要处理大量的工程细节。

## Windows 编码：GBK 的噩梦与非侵入式解决方案

### 问题

Windows 中文版默认使用 GBK (CP936) 编码输出。Rust 字符串是 UTF-8。当命令输出包含中文时：

```
$ piz 列出当前目录文件
  ➜ dir
  [执行]

  驱动器 D 中的卷是 数据盘   ← 如果不处理，这里会显示乱码
```

很多工具的做法是在 PowerShell 命令前注入：

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; dir
```

或者执行 `chcp 65001` 切换代码页。

### 为什么不这样做

这些方法**修改了用户的 Shell 环境**。`OutputEncoding` 的改变会影响当前 Shell 会话中后续所有命令的输出编码。piz 的设计哲学是非侵入性——不动用户的任何环境配置。

### piz 的解决方案：接收端 GBK 回退

```rust
fn decode_output(bytes: &[u8]) -> String {
    match std::str::from_utf8(bytes) {
        Ok(s) => s.to_string(),        // UTF-8 解码成功
        Err(_) => {
            #[cfg(target_os = "windows")]
            { decode_gbk(bytes) }        // Windows 上回退到 GBK
            #[cfg(not(target_os = "windows"))]
            { String::from_utf8_lossy(bytes).to_string() }  // 其他平台用 lossy
        }
    }
}
```

先尝试 UTF-8，失败了在 Windows 上回退到 GBK 解码。GBK 解码使用 Windows API `MultiByteToWideChar`：

```rust
#[cfg(target_os = "windows")]
fn decode_gbk(bytes: &[u8]) -> String {
    use windows_sys::Win32::Globalization::*;
    unsafe {
        // 1. 获取需要的宽字符数量
        let len = MultiByteToWideChar(936, 0, bytes.as_ptr(), bytes.len() as i32,
                                       std::ptr::null_mut(), 0);
        // 2. 分配缓冲区
        let mut wide = vec![0u16; len as usize];
        // 3. 执行转换
        MultiByteToWideChar(936, 0, bytes.as_ptr(), bytes.len() as i32,
                            wide.as_mut_ptr(), len);
        // 4. 转为 Rust 字符串
        OsString::from_wide(&wide).to_string_lossy().to_string()
    }
}
```

936 是 GBK 的代码页编号。这个方案的优点：
- **零侵入**：不修改 Shell 环境
- **按需处理**：UTF-8 输出不受影响
- **条件编译**：`#[cfg(target_os = "windows")]`，非 Windows 平台不编译 GBK 代码

### Windows ANSI 颜色支持

另一个 Windows 特有的问题：PowerShell 5.1 默认不启用虚拟终端处理，ANSI 转义码会显示为 `[0;32m` 这样的乱码。

```rust
fn enable_ansi_support() {
    #[cfg(target_os = "windows")]
    {
        // 尝试启用 VT 处理
        if SetConsoleMode(handle, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING) == 0 {
            // 老版 Windows 不支持，全局关闭颜色
            colored::control::set_override(false);
        }
    }
}
```

失败时不是报错，而是优雅降级——关闭颜色输出。用户可能在 Windows Server 2012 这样的老系统上运行，没有 VT 支持，但工具应该仍然可用。

## Shell 集成：eval 模式

### 核心问题

piz 作为子进程运行，`cd`、`export`、`source` 等命令只在子进程生效，不影响父 Shell：

```bash
$ piz "切换到 home 目录"
  ➜ cd ~
  [执行]
$ pwd
/original/directory  # cd 没有生效！
```

### 解决方案：Shell 包装函数 + eval 模式

```
Shell 包装函数 (piz)
    ↓
调用 piz --eval (子进程)
    ↓
piz 正常运行：LLM → 解析 → 安全检查 → 用户确认
    ↓ 确认
写入 ~/.piz/eval_command (不执行)
    ↓
返回到包装函数
    ↓
读取 eval_command 内容
    ↓
eval "$cmd"  ← 在当前 Shell 中执行！
```

`piz init bash` 生成的包装函数：

```bash
piz() {
  # 子命令直接透传（config、chat 等不需要 eval）
  if [ "$1" = "init" ] || [ "$1" = "config" ] || [ "$1" = "chat" ]; then
    command piz "$@"
    return
  fi
  # 翻译请求走 eval 模式
  command piz --eval "$@"
  if [ $? -eq 0 ] && [ -f ~/.piz/eval_command ]; then
    local cmd=$(cat ~/.piz/eval_command)
    rm -f ~/.piz/eval_command
    eval "$cmd"
  fi
}
```

### 为什么用文件传递而不是 stdout

- **stdout 已被占用**：piz 的 UI 输出（确认提示、颜色文本、加载动画）通过 stdout 显示
- **安全性**：文件内容只包含确认后的命令，不会混入 UI 输出
- **健壮性**：包装函数通过检查文件是否存在来判断是否成功

### 四种 Shell 的适配

piz 为 bash/zsh/fish/PowerShell 各生成不同的包装函数。差异主要在语法上：

- fish 没有 `$()`，用 `(cat file)` 代替
- fish 没有 `$?`，用 `$status` 代替
- PowerShell 用 `Test-Path`、`Get-Content`、`Invoke-Expression`
- PowerShell 需要 `Set-Alias -Name piz -Value Invoke-Piz` 来覆盖原始命令

用户只需在 shell 配置文件中加一行：

```bash
# bash/zsh
eval "$(piz init bash)"

# fish
piz init fish | source

# PowerShell
Invoke-Expression (piz init powershell | Out-String)
```

## SQLite 缓存系统

### 为什么选 SQLite

缓存方案有很多选择——文件系统、JSON 文件、内存缓存。piz 选择 SQLite：

| 特性 | SQLite | 文件系统 | JSON |
|------|--------|----------|------|
| 原子写入 | 天然支持 | 需要 rename trick | 全文重写 |
| TTL + LRU | SQL 查询 | 需要自己实现 | 需要自己实现 |
| 模糊搜索 | LIKE 查询 | 遍历文件名 | 遍历数组 |
| 并发安全 | 内置文件锁 | 需要外部锁 | 需要外部锁 |
| 编译成本 | rusqlite/bundled | 零 | 零 |

权衡：引入 `rusqlite/bundled` 增加了编译时间（静态链接 SQLite），但功能收益很大。

### 数据模型

两张表，职责分离：

```sql
-- 查询缓存：加速重复查询
CREATE TABLE cache (
    key TEXT PRIMARY KEY,        -- SHA256(query|os|shell)
    command TEXT NOT NULL,
    danger TEXT NOT NULL,
    created_at INTEGER NOT NULL  -- Unix 时间戳
);

-- 执行历史：记录所有执行（含失败）
CREATE TABLE history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    command TEXT NOT NULL,
    exit_code INTEGER NOT NULL,
    danger TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
```

cache 表只存成功的命令（先执行后缓存），history 表记录所有执行（包括失败的），给 `piz history` 用。

### 缓存键设计

```
Key = SHA256( query.trim().to_lowercase() + "|" + os + "|" + shell )
```

- **大小写归一化**：`List Files` 和 `list files` 命中同一缓存
- **空白归一化**：`  list files  ` 去掉前后空白
- **平台隔离**：`linux|bash` 和 `windows|powershell` 的同一查询生成不同命令
- **SHA256**：固定长度，高效索引

### 淘汰策略

双重淘汰：TTL 过期 + LRU 驱逐。

```
数据库打开时：
    DELETE FROM cache WHERE (created_at + TTL) <= now
    -- 默认 TTL = 168 小时 (7 天)

写入新条目时：
    IF count > max_entries:  -- 默认 1000
        DELETE WHERE key NOT IN (
            SELECT key FROM cache ORDER BY created_at DESC LIMIT max_entries
        )
```

打开数据库时清理过期条目，写入时检查总量并 LRU 驱逐。这保证了缓存不会无限增长。

## 国际化：编译时保证的零成本方案

piz 支持中英双语 UI（108 个翻译字段），采用静态翻译表方案：

```rust
pub struct T {
    pub cached: &'static str,
    pub thinking: &'static str,
    pub cancelled: &'static str,
    pub inject_env_exfiltration: &'static str,
    // ... 108 个字段
}

static ZH: T = T { cached: "(缓存命中)", thinking: "思考中...", ... };
static EN: T = T { cached: "(cached)", thinking: "Thinking...", ... };

pub fn t(lang: Lang) -> &'static T {
    match lang { Lang::Zh => &ZH, Lang::En => &EN }
}
```

### 为什么不用 gettext / fluent / i18n 库

对于一个 CLI 工具来说，108 个字段的翻译量不大，引入完整的 i18n 框架是过度工程化。静态翻译表的优势：

1. **编译时保证完整性**：如果某个语言漏了某个字段，编译直接报错
2. **零成本抽象**：`&'static T` 引用，无堆分配、无克隆、无运行时开销
3. **简单直接**：添加新字段时编译器会告诉你哪些语言需要补充翻译
4. **无全局状态**：`tr` 引用在函数间传递，测试友好

还有完整性测试来额外保障：

```rust
#[test]
fn all_translations_non_empty() {
    for lang in [Lang::Zh, Lang::En] {
        let tr = t(lang);
        assert!(!tr.cached.is_empty());
        assert!(!tr.thinking.is_empty());
        // ... 检查所有字段
    }
}
```

## CI/CD 与测试体系

### 测试矩阵

piz 有 177 个测试：169 个单元测试 + 8 个集成测试。

```bash
cargo test                    # 运行全部
cargo test test_injection     # 运行注入检测相关
cargo test test_cache         # 运行缓存相关
```

测试覆盖的关键区域：
- 12 种注入模式各自的正反例
- 19 种危险模式 + 25 种警告模式的匹配
- 4 级响应解析回退
- 缓存 CRUD + TTL + LRU
- 修复响应解析
- 国际化完整性
- 配置序列化/反序列化
- Shell 包装函数生成

### CI 流水线

CI 在三个平台上运行：

```yaml
jobs:
  lint:        # Ubuntu - fmt + clippy
  test-linux:  # Ubuntu - cargo test
  test-win:    # Windows - cargo test
```

macOS 测试在 v0.2.5 后被移除——因为没有 macOS 特有的平台代码（条件编译只区分 Windows 和非 Windows），在 Linux 上的测试已经覆盖了所有非 Windows 路径。

CI 的关键要求：
- `cargo fmt --all -- --check`：代码格式必须一致
- `cargo clippy -- -D warnings`：lint 警告视为错误
- `cargo test`：所有测试通过

### Release 流水线

打 tag 触发 Release 流水线，为三平台编译：

| 平台 | Target | 产物 |
|------|--------|------|
| Windows x64 | x86_64-pc-windows-msvc | .zip + .msi |
| macOS x64 | x86_64-apple-darwin | .tar.gz |
| macOS ARM | aarch64-apple-darwin | .tar.gz |
| Linux x64 | x86_64-unknown-linux-musl | .tar.gz + .deb |
| Linux ARM | aarch64-unknown-linux-musl | .tar.gz |

Linux 使用 musl 而不是 glibc——musl 静态链接，不依赖系统的 libc 版本，一个二进制在所有 Linux 发行版上都能运行。这是从 v0.2.6 才改过来的，之前用 glibc 在一些旧版本的系统上会有兼容性问题。

## 自动更新机制

### 后台检查

每次正常执行结束后调用 `check_update_hint()`：
- 24 小时内最多检查一次（读取 `~/.piz/update_state.json`）
- HTTP 超时 5 秒，不阻塞用户
- 有新版本时显示一行提示

### 交互式升级

`piz update` 流程：

```
获取 GitHub 最新 Release → 语义版本比较
    ↓ 有新版本
选择升级方式:
    ├── 覆盖安装: rename 旧文件 → copy 新文件 → 删除旧文件
    └── 卸载重装: rename → copy → 设置权限 → 删除旧文件
    ↓ 失败
自动回滚（旧文件被 rename 而不是删除）
```

Windows 上无法删除正在运行的 exe，所以先 rename 为 `.old`，copy 新文件后再删除旧文件。

### 代理和镜像

考虑到国内网络环境，piz 支持：
- **代理**：自动检测 `https_proxy`、`HTTPS_PROXY`、`ALL_PROXY`
- **镜像**：`GITHUB_MIRROR` 环境变量替换 GitHub 域名
- **回退**：镜像失败自动回退到原始 URL

## 配置系统

### 零配置启动

首次运行时，如果 `~/.piz/config.toml` 不存在，自动触发交互式配置向导：

```
🔧 piz 初始化向导
选择 LLM 后端:
  1. OpenAI (gpt-4o-mini)
  2. DeepSeek (deepseek-chat)
  3. 硅基流动 (Qwen/Qwen3-8B)
  4. Claude (claude-sonnet-4-20250514)
  5. Gemini (gemini-2.0-flash)
  6. Ollama (qwen2.5:7b)
  ... (12 个预设)
```

选择后自动填充 API endpoint、模型名称，用户只需输入 API Key。

### 配置项

```toml
[general]
default_backend = "openai"
language = "zh"
auto_confirm_safe = false
cache_ttl_hours = 168
cache_max_entries = 1000
chat_history_size = 20

[openai]
api_key = "sk-..."
model = "gpt-4o-mini"
base_url = "https://api.openai.com"
```

`base_url` 支持让 OpenAI 后端对接任何兼容 API——DeepSeek、硅基流动、Moonshot 等国内供应商都是通过 `base_url` 接入的。

## 依赖选型

| 依赖 | 选择理由 |
|------|----------|
| clap (derive) | Rust CLI 解析的事实标准，derive 宏减少样板代码 |
| tokio | 异步运行时，LLM API 调用需要 |
| reqwest (rustls-tls) | HTTP 客户端，rustls 避免 OpenSSL 交叉编译问题 |
| rusqlite (bundled) | SQLite 绑定，bundled 静态链接不依赖系统 |
| serde + serde_json | 序列化/反序列化标准方案 |
| colored | 终端颜色输出 |
| dialoguer | 交互式 UI（确认、选择、输入） |
| sha2 | SHA256 哈希（缓存键） |
| regex | 正则表达式（安全检测、响应解析） |
| anyhow + thiserror | 错误处理组合：anyhow 用于应用层，thiserror 用于库层 |
| indicatif | 进度条和加载动画 |
| async-trait | 异步 Trait 支持（稳定版 Rust 还不原生支持） |

特别说明 **reqwest 选择 rustls 而不是 native-tls**：native-tls 在 Linux 上依赖 OpenSSL，交叉编译（特别是 ARM64）时经常出问题。rustls 是纯 Rust 实现的 TLS，编译简单。

## 项目统计

到 v0.2.6 为止：

- 23 个源文件，约 5500 行 Rust 代码
- 177 个测试（169 单元 + 8 集成）
- 108 个国际化翻译字段 × 2 种语言
- 12 种注入检测模式
- 19 条危险模式 + 25 条警告模式
- 4 种 LLM 后端 + 12 个供应商预设
- 支持 5 种 Shell（bash/zsh/fish/PowerShell/cmd）
- 编译产物覆盖 5 个平台 target

## 回顾与展望

从第一个 commit 到 v0.2.6，piz 的开发过程中有几个重要的经验：

1. **安全不能后加**——从 v0.1.0 就建立了安全检测框架，后续每个版本只是在框架上添加新模式
2. **LLM 的输出不可信**——不仅格式不可控（需要 4 级回退解析），内容也不可信（需要独立的安全检测）
3. **非侵入性很重要**——用户的 Shell 环境是他们自己的，工具不应该擅自修改
4. **跨平台的坑在细节里**——Windows 编码、Shell 检测、exe 自更新，每一个都有独特的陷阱
5. **编译器是最好的测试工具**——108 个翻译字段、12 种注入模式，漏了哪个编译器直接告诉你

后续的计划包括：更多 LLM 后端支持、TUI 界面、插件系统等。欢迎在 GitHub 上提 issue 或 PR。

---

*本文是 piz 开发日志系列的第 5 篇（完结），共 5 篇。*

- [第 1 篇：为什么要做 piz](/2026/03/17/piz-dev-blog-1-why/)
- [第 2 篇：架构设计与 LLM 抽象层](/2026/03/17/piz-dev-blog-2-architecture/)
- [第 3 篇：安全体系——三层纵深防御](/2026/03/17/piz-dev-blog-3-security/)
- [第 4 篇：容错与智能——解析回退与自动修复](/2026/03/17/piz-dev-blog-4-resilience/)
- **第 5 篇：跨平台工程化实践**（本文）

项目地址：[GitHub](https://github.com/AriesOxO/piz) | [crates.io](https://crates.io/crates/piz)

感谢阅读！如果觉得有用，给个 Star 就是最大的鼓励。
