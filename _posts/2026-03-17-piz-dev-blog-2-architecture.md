---
title: "piz 开发日志（二）：架构设计与 LLM 抽象层"
date: 2026-03-17
categories: [Rust, CLI, AI]
tags: [piz, rust, llm, architecture, 开发日志]
description: "深入讲解 piz 的分层架构设计、LLM 后端抽象层的 Trait 设计、工厂模式，以及提示词工程中的关键细节。"
---

# piz 开发日志（二）：架构设计与 LLM 抽象层

> 这是 piz 开发日志系列的第二篇。本文深入讲解 piz 的分层架构和 LLM 后端抽象层设计。

## 分层架构

piz 的代码组织采用了清晰的分层架构，共 5 层、23 个源文件：

```
┌─────────────────────────────────────────────────────────┐
│                     CLI 入口层                           │
│  cli.rs (clap 参数解析) → main.rs (流程调度)             │
├─────────────────────────────────────────────────────────┤
│                     业务逻辑层                           │
│  chat.rs │ fix.rs │ explain.rs │ update.rs              │
├─────────────────────────────────────────────────────────┤
│                     核心服务层                           │
│  danger.rs │ cache.rs │ executor.rs │ context.rs        │
├─────────────────────────────────────────────────────────┤
│                     LLM 抽象层                           │
│  mod.rs (trait + factory) │ prompt.rs                   │
│  openai.rs │ claude.rs │ gemini.rs │ ollama.rs          │
├─────────────────────────────────────────────────────────┤
│                     基础设施层                           │
│  config.rs │ i18n.rs │ ui.rs │ shell_init.rs │ history │
└─────────────────────────────────────────────────────────┘
```

每一层有明确的职责边界：

- **CLI 入口层**：参数解析和流程调度，是所有功能的入口
- **业务逻辑层**：各个子命令的具体实现（聊天、修复、解释、更新）
- **核心服务层**：被多个业务共享的底层能力（安全检测、缓存、命令执行、环境上下文）
- **LLM 抽象层**：统一不同 LLM API 的差异，构建提示词
- **基础设施层**：配置管理、国际化、UI 输出等基础组件

这个分层的好处是：添加新的 LLM 后端只需在 LLM 层增加文件，不影响上层；添加新的子命令只需在业务层增加文件，核心服务层可复用。

## LLM 后端抽象：一个 Trait 统一四种 API

piz 支持四种 LLM 后端：OpenAI、Claude、Gemini、Ollama。它们的 API 格式完全不同——认证方式不同、请求结构不同、响应路径不同、甚至 system 消息的位置都不同。

如何用一套代码处理这些差异？答案是 Trait 抽象。

### Trait 定义

```rust
#[async_trait]
pub trait LlmBackend: Send + Sync {
    /// 单轮对话（翻译、解释、修复场景）
    async fn chat(&self, system: &str, user: &str) -> Result<String>;

    /// 多轮对话（Chat 模式场景）
    async fn chat_with_history(
        &self, system: &str, messages: &[Message]
    ) -> Result<String>;
}
```

设计上有几个关键决策：

1. **`Send + Sync` 约束**：tokio 异步运行时要求 Future 可以跨线程传递
2. **两个方法分离**：单轮对话只需 system + user 两个字符串，更简单高效；多轮对话需要完整的消息历史
3. **返回 `String`**：后端只负责获取 LLM 的原始文本响应，解析逻辑统一在调用层处理。这避免了每个后端重复写解析代码

### 工厂模式

```rust
pub fn create_backend(
    config: &Config,
    backend_override: Option<&str>,
) -> Result<Box<dyn LlmBackend>> {
    let backend_name = backend_override.unwrap_or(&config.default_backend);
    match backend_name {
        "openai" => Ok(Box::new(OpenAiBackend::new(cfg.clone()))),
        "claude" => Ok(Box::new(ClaudeBackend::new(cfg.clone()))),
        "gemini" => Ok(Box::new(GeminiBackend::new(cfg.clone()))),
        "ollama" => Ok(Box::new(OllamaBackend::new(cfg.clone()))),
        other => anyhow::bail!("Unknown backend: {}", other),
    }
}
```

用户可以通过配置文件设置默认后端，也可以通过 `--backend` 参数临时切换。工厂函数返回 `Box<dyn LlmBackend>`，上层代码完全不关心具体用的是哪个后端。

### 四种 API 的差异

这个差异表是我在实现过程中整理的，直观展示了为什么需要抽象层：

| 特性 | OpenAI | Claude | Gemini | Ollama |
|------|--------|--------|--------|--------|
| 认证方式 | `Bearer {key}` | `x-api-key` | `x-goog-api-key` | 无 |
| System 消息位置 | messages 数组首项 | 顶级 `system` 字段 | `system_instruction` | messages 数组首项 |
| JSON 模式 | `response_format` | 无（靠 Prompt） | `responseMimeType` | `format: "json"` |
| 响应提取路径 | `choices[0].message.content` | `content[0].text` | `candidates[0]...text` | `message.content` |

光是 system 消息的位置就有三种处理方式。如果不做抽象，上层代码会充斥着 `if openai ... else if claude ...` 的分支。

### 统一参数

所有后端共享相同的默认参数：

```rust
pub const DEFAULT_TEMPERATURE: f64 = 0.1;   // 低温度 → 稳定输出
pub const DEFAULT_MAX_TOKENS: u32 = 2048;   // 足够生成复杂命令
pub const MAX_RETRIES: u32 = 3;             // 最多重试 3 次
pub const INITIAL_BACKOFF_MS: u64 = 1000;   // 首次重试等 1 秒
```

Temperature 设为 0.1 而不是 0 是有意为之的——0 表示完全确定性，但在某些 API 上行为不一致；0.1 几乎等于确定性，同时避免了边界情况。

### 重试与退避

所有后端共享统一的重试逻辑：

```
请求失败 → 429/5xx？ → 是 → attempt < 3？ → 是 → 等待 1s × 2^attempt → 重试
                      ↓ 否                  ↓ 否
                    直接报错            报最后一次错误
```

指数退避时间：第 1 次 1s、第 2 次 2s、第 3 次 4s。429 是 API 限流，5xx 是服务端错误，这两种都值得重试；4xx 中的其他错误（如 401 认证失败）没有重试意义。

## 核心数据流

piz 的主流程是一条清晰的数据管道：

```
用户输入自然语言
    ↓
CLI 参数解析 (clap)
    ↓
环境上下文收集 (OS/Shell/CWD/Arch/Git/PM)
    ↓
缓存查询 (SHA256 key) ──命中──→ 注入检测 → 危险分级 → 确认 → 执行
    ↓ 未命中
构建提示词 (system + user + 环境 + 示例)
    ↓
调用 LLM (带重试)
    ↓
解析响应 (4 级回退)
    ↓
注入检测 → 危险分级 → 用户确认 → 执行
    ↓                              ↓
  阻断                        成功 → 缓存
                              失败 → 自动修复
```

注意两个关键点：

1. **缓存命中也要做注入检测**——防止被 Prompt 注入污染的命令通过缓存绕过安全检查
2. **先执行后缓存**——只缓存成功执行的命令，避免缓存错误命令

## 提示词工程

piz 的提示词是整个系统中最精心设计的部分之一。共 5 种场景的提示词，每种都经过反复调优。

### 翻译提示词的结构

翻译是最核心的场景，提示词包含以下组成部分：

1. **环境信息注入**：告诉 LLM 当前的 OS、Shell、CWD、CPU 架构、是否在 Git 仓库中、有哪些包管理器
2. **Shell 语法提示**：针对不同 Shell 给出特定语法提醒
   - PowerShell：`Get-ChildItem` 而不是 `ls`，`$env:VAR` 而不是 `$VAR`
   - cmd.exe：`cd /d` 用于跨盘符，`dir` 而不是 `ls`
   - fish：`set` 而不是 `export`，`; and` 而不是 `&&`
3. **输出格式要求**：严格的 JSON 格式，包含 `command`、`danger`、`explanation` 三个字段
4. **反斜杠转义规则**：明确要求 Windows 路径中的 `\` 在 JSON 中转义为 `\\`
5. **危险等级标准**：定义 safe/warning/dangerous 的判断依据
6. **Few-shot 示例**：几个输入输出样例，帮助 LLM 理解期望格式
7. **拒绝规则**：非命令请求（如闲聊、数学题）返回 `{"refuse": true}`
8. **安全约束**：禁止生成泄露环境变量、远程执行等恶意命令
9. **上下文**：如果有前一条命令的执行结果，附加在 user message 中，支持跟进请求

### 为什么 Shell 语法提示很重要

一个有趣的发现：如果不告诉 LLM 当前是 PowerShell，它可能会生成 `ls -la` —— 虽然 PowerShell 有 `ls` 别名，但参数不兼容。添加了 Shell 特定提示后，LLM 会正确生成 `Get-ChildItem -Force` 或者 `ls -Force`。

同样，fish shell 的语法和 bash 差异很大（没有 `&&`，变量赋值用 `set`），不提示的话 LLM 几乎总是生成 bash 语法。

### 多候选提示词

当用户使用 `-n 3` 请求多个候选时，提示词会修改输出格式要求为 JSON 数组：

```json
[
  {"command": "find . -size +100M", "danger": "safe", "explanation": "..."},
  {"command": "du -h | sort -rh | head", "danger": "safe", "explanation": "..."},
  {"command": "ls -lhS | head", "danger": "safe", "explanation": "..."}
]
```

每个候选都包含完整的 danger 和 explanation，不是简单地列出命令。

### 修复提示词

修复场景需要额外的信息：

```
你是一个命令修复助手。
失败命令: npm install
退出码: 1
错误输出: EACCES: permission denied, access '/usr/local/lib/node_modules'

常见故障模式：
- 权限不足 → sudo 或 --user
- 命令不存在 → 安装或路径修正
- 参数错误 → 修正参数
...

请返回 JSON：{diagnosis, command, danger}
```

把 stderr 截取前 1000 字符传给 LLM，避免太长的错误输出超出 token 限制。同时提供一个常见故障模式清单，引导 LLM 做结构化诊断。

## 系统上下文收集

piz 在每次调用 LLM 前都会收集当前环境信息：

```rust
pub struct SystemContext {
    pub os: String,              // "windows", "macos", "linux"
    pub shell: String,           // "powershell", "bash", "zsh", "fish", "cmd"
    pub cwd: String,             // 当前工作目录
    pub arch: String,            // "x86_64", "aarch64"
    pub is_git_repo: bool,       // 是否在 git 仓库中
    pub package_manager: String, // "cargo", "npm", "pip", "go" 等
}
```

这些信息会注入到提示词中。比如在 git 仓库中问"提交代码"，LLM 能生成 `git commit`；检测到有 `Cargo.toml` 就知道是 Rust 项目；在 Windows + PowerShell 下会生成 PowerShell 语法。

包管理器检测的逻辑是扫描当前目录下的特征文件：`Cargo.toml` → cargo，`package.json` → npm，`requirements.txt` → pip，`go.mod` → go，等等。

## 小结

piz 的架构核心思想是**分层隔离 + Trait 抽象**：

- LLM 后端通过 Trait 统一，上层代码不关心具体 API 差异
- 提示词通过环境感知和 Shell 特定提示，确保生成的命令匹配用户环境
- 安全检测、缓存、执行等核心服务在独立模块中，被多个业务复用

下一篇我会深入讲解安全体系——三层纵深防御是如何设计和实现的，12 种注入检测模式各自防范什么攻击。

---

*本文是 piz 开发日志系列的第 2 篇，共 5 篇。*

- [第 1 篇：为什么要做 piz](/2026/03/17/piz-dev-blog-1-why/)
- **第 2 篇：架构设计与 LLM 抽象层**（本文）
- [第 3 篇：安全体系——三层纵深防御](/2026/03/17/piz-dev-blog-3-security/)
- [第 4 篇：容错与智能——解析回退与自动修复](/2026/03/17/piz-dev-blog-4-resilience/)
- [第 5 篇：跨平台工程化实践](/2026/03/17/piz-dev-blog-5-engineering/)

项目地址：[GitHub](https://github.com/AriesOxO/piz) | [crates.io](https://crates.io/crates/piz)
