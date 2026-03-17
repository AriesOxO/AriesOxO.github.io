---
title: "piz 开发日志（四）：容错与智能——解析回退与自动修复"
date: 2026-03-17
categories: [Rust, CLI, AI]
tags: [piz, rust, llm, parsing, auto-fix, 开发日志]
description: "深入讲解 piz 的 4 级 LLM 响应解析回退策略、自动修复机制、以及交互式 Chat 模式的实现。"
---

# piz 开发日志（四）：容错与智能——解析回退与自动修复

> 这是 piz 开发日志系列的第四篇。LLM 的输出格式不完全可控，命令执行也可能失败——piz 如何优雅地处理这些问题？

## LLM 输出的现实

理想情况下，LLM 应该返回完美的 JSON：

```json
{"command": "find . -size +100M -type f", "danger": "safe", "explanation": "查找大于100MB的文件"}
```

但现实中，LLM 的输出千奇百怪：

1. **Markdown 包裹**：输出被 ` ```json ... ``` ` 代码块包裹
2. **前后解释文字**：`Here is the command: {"command": ...}`
3. **Windows 路径破坏 JSON**：`{"command": "cd /d D:\"}` 中的 `\"` 被误读为转义引号
4. **直接返回命令**：没有 JSON 包裹，直接返回 `ls -la`
5. **字段顺序不固定**：有时 `danger` 在 `command` 前面

如果只做一级 JSON 解析，大约 30% 的情况会失败。这对于一个 CLI 工具来说是不可接受的。

## 四级回退解析策略

piz 的 `parse_llm_response()` 函数实现了 4 级回退，每级都尝试从 LLM 响应中提取有效命令：

### Level 1：直接 JSON 解析（成功率 ~70%）

```rust
if let Ok(v) = serde_json::from_str::<Value>(response.trim()) {
    if let Some(refusal) = check_refusal(&v) {
        return Ok(ParsedResponse::Refused(refusal));
    }
    if let Some(cmd) = v["command"].as_str() {
        return Ok(ParsedResponse::Command { ... });
    }
}
```

最简单直接，大多数情况 LLM 会返回有效 JSON。`trim()` 处理前后空白。

### Level 2：嵌入 JSON 提取（成功率 ~20%）

当 LLM 在 JSON 前后加了解释文字时，需要从文本中找到 `{...}` 块：

```rust
// 从文本中找到最外层的 { } 配对
fn extract_json_from_text(text: &str) -> Option<Value> {
    let start = text.find('{')?;
    let mut depth = 0;
    let mut in_string = false;
    for (i, ch) in text[start..].char_indices() {
        match ch {
            '"' if !escaped => in_string = !in_string,
            '{' if !in_string => depth += 1,
            '}' if !in_string => {
                depth -= 1;
                if depth == 0 {
                    // 找到完整的 JSON 块
                    return serde_json::from_str(&text[start..=start+i]).ok();
                }
            }
            _ => {}
        }
    }
    None
}
```

这个实现考虑了嵌套大括号和字符串内的大括号，不会被 `{"key": "value with {braces}"}` 这样的文本误导。

处理的场景：
- `Here is the command: {"command": "ls", "danger": "safe"}`
- ` ```json\n{"command": "ls"}\n``` `
- `Based on your request, I suggest: {"command": "ls"} This will list files.`

### Level 3：结构化正则提取（成功率 ~8%）

这是最巧妙的一级，专门解决 Windows 路径破坏 JSON 的问题。

**问题**：Windows 路径中的 `\` 在 JSON 中应该转义为 `\\`，但很多 LLM 不做转义：

```json
{"command": "cd /d D:\", "danger": "safe"}
```

JSON 解析器看到 `D:\"` 时，把 `\"` 当成转义引号，认为字符串没结束。Level 1 和 Level 2 都会失败。

**解决方案**：利用 `"danger"` 关键字作为锚点

```rust
// 正序：command 在前，danger 在后
let re = Regex::new(
    r#""command"\s*:\s*"(.*?)"\s*[,}]\s*"danger"\s*:\s*"(safe|warning|dangerous)""#
)?;

// 反序：danger 在前，command 在后
let re_reverse = Regex::new(
    r#""danger"\s*:\s*"(safe|warning|dangerous)"\s*,\s*"command"\s*:\s*"(.*?)""#
)?;
```

`(.*?)` 是惰性匹配——它会匹配尽可能少的字符，直到遇到 `"` + 后面的 `"danger"` 模式。这样即使 command 值中包含未转义的 `\`，也能正确提取。

来看这个例子：

```
{"command": "cd /d D:\", "danger": "safe"}
```

正则的 `(.*?)` 会匹配 `cd /d D:\`（因为后面紧跟着 `", "danger": "safe"`），正确提取出命令。

### Level 4：反引号提取（最后手段，成功率 ~2%）

有些 LLM 可能完全不返回 JSON，而是用 markdown 格式：

```
You can use this command:
`find . -size +100M`
```

Level 4 提取 `` ` `` 或 ` ``` ` 中的内容：

```rust
// 先尝试 ```...```
if let Some(caps) = re_triple.captures(text) {
    return Some((caps[1].to_string(), DangerLevel::Safe));
}
// 再尝试 `...`
if let Some(caps) = re_single.captures(text) {
    return Some((caps[1].to_string(), DangerLevel::Safe));
}
```

此时 danger 默认为 Safe——因为我们没有从 LLM 获取到危险等级信息。但后续的正则危险检测仍然会独立评估，所以安全性不受影响。

### 绝对底线：不执行原始文本

如果 4 级回退全部失败，piz 会报错而不是将原始文本当作命令执行：

```rust
anyhow::bail!("Failed to parse LLM response as a command. Raw response:\n{}", trimmed);
```

这是一个关键的安全决策。如果 LLM 返回 "I'm sorry, I can't help with that"，将其作为命令执行是荒谬且危险的。

### 拒绝检测贯穿全部层级

在任何解析层级中，都会检查 `{"refuse": true}`：

```rust
fn check_refusal(v: &Value) -> Option<String> {
    if v["refuse"].as_bool() == Some(true) {
        return Some(v["message"].as_str()
            .unwrap_or("Not a command request.").to_string());
    }
    if let Some(cmd) = v["command"].as_str() {
        if cmd.trim().is_empty() {
            return Some(v["message"].as_str()
                .unwrap_or("No command generated.").to_string());
        }
    }
    None
}
```

不仅检查显式的 `refuse: true`，还检查 command 字段为空的情况——有些 LLM 会返回 `{"command": "", "message": "这不是命令请求"}`。

## 自动修复机制

命令执行失败是常见的——权限不足、参数错误、包未安装等等。piz 提供两种修复入口：

### 主动修复：`piz fix`

读取 `~/.piz/last_exec.json`（上次命令的执行记录），如果上次命令失败则尝试修复。

### 自动修复：执行失败后提问

主流程中命令执行失败后，询问用户是否自动修复。

### 修复流程

```
命令失败 (exit_code != 0)
    ↓
询问用户: "命令执行失败，是否自动修复？"
    ↓ 是
┌─── 循环 (最多 3 次) ───────────────────┐
│                                         │
│  构建修复提示词                          │
│    ├── 环境信息                          │
│    ├── 失败命令                          │
│    ├── 退出码                            │
│    ├── stderr (截取前 1000 字符)          │
│    └── 常见故障模式清单                   │
│                                         │
│  调用 LLM → 解析修复响应                 │
│    └── {diagnosis, command, danger}      │
│                                         │
│  显示诊断结果                            │
│  显示命令差异 (红色删除线 → 绿色新命令)   │
│                                         │
│  注入检测 + 危险分级                     │
│  用户确认                                │
│                                         │
│  执行修复命令                            │
│    ├── 成功 → 退出循环                   │
│    └── 失败 → 下一次迭代                 │
│                                         │
└─────────────────────────────────────────┘
    ↓ 3 次都失败
报错: "Auto-fix failed, reached max retries (3)"
```

### 修复提示词

修复提示词和翻译提示词结构不同，包含了失败上下文：

```
你是一个命令修复助手。

当前环境：Windows 11, PowerShell, D:\dev\piz

失败命令: npm install
退出码: 1
错误输出: EACCES: permission denied, access '/usr/local/lib/node_modules'

常见故障模式：
- 权限不足 → 添加 sudo 或使用 --user 标志
- 命令不存在 → 检查安装或修正 PATH
- 参数错误 → 修正参数格式
- 端口占用 → 查找并释放端口
- 文件不存在 → 检查路径
...

请返回 JSON：{
  "diagnosis": "诊断原因",
  "command": "修复后的命令",
  "danger": "safe|warning|dangerous"
}
```

stderr 截取前 1000 字符，避免过长的错误输出超出 token 限制。常见故障模式清单引导 LLM 做结构化诊断，而不是笼统地"试试 sudo"。

### 可视化差异

修复后会显示原命令和修复命令的对比：

```
诊断: 权限不足，需要提升权限执行
  ̶n̶p̶m̶ ̶i̶n̶s̶t̶a̶l̶l̶              ← 红色删除线
  sudo npm install            ← 绿色加粗
```

这让用户直观看到修改了什么，而不是盲目确认。

### 修复响应的解析

修复响应也采用多级回退解析（和主流程类似），但结构不同——多了一个 `diagnosis` 字段：

```
Level 1: 直接 JSON 解析
Level 2: 文本中提取 JSON
Level 3: 结构化正则（用 "danger" 字段作为右边界，额外提取 "diagnosis"）
```

修复命令同样要经过注入检测和危险分级——修复过程本身不能成为安全漏洞。

### 执行记录

每次命令执行都保存到 `~/.piz/last_exec.json`：

```json
{
  "command": "npm install",
  "exit_code": 1,
  "stdout": "(前 500 字符预览)",
  "stderr": "EACCES: permission denied...",
  "timestamp": 1710000000
}
```

这个文件有两个用途：
1. `piz fix` 读取失败信息进行修复
2. 主流程中为 LLM 提供前一条命令的上下文，支持跟进请求（如"排序一下"、"只看前 10 条"）

## 交互式 Chat 模式

`piz chat` 提供多轮对话模式，适合连续调试场景。

### 核心设计

```
用户输入 → 添加到 history
    ↓
历史长度检查 → 超过限制则裁剪（保持 user/assistant 偶数配对）
    ↓
调用 LLM (system_prompt + 完整 history)
    ↓
解析响应:
    ├── 解析成功 → 显示命令 → 用户确认 → 执行（非致命）
    ├── 注入检测命中 → 显示警告 → 不添加到 history
    └── 解析失败 → 将原始响应作为文本显示
```

### 历史裁剪的偶数约束

LLM 的对话格式要求 user/assistant 消息成对出现。如果裁掉奇数条消息，可能出现两条连续的 user 消息，导致 LLM 困惑：

```rust
let excess = history.len() - max_history;
// 确保裁掉偶数条，保持配对
let drain_count = if excess % 2 == 0 { excess } else { excess + 1 };
let drain_count = drain_count.min(history.len() - 1);
history.drain(..drain_count);
```

### Chat 中的命令执行是"非致命"的

和主流程不同，Chat 模式中命令执行失败不会退出对话循环——用户可以继续对话、调整策略、请求不同的命令。也不会触发自动修复，因为 Chat 模式的交互本身就是一种手动修复过程。

### 斜杠命令

Chat 模式支持三个内置命令：
- `/help` — 显示帮助信息
- `/clear` — 清空对话历史
- `/history` — 显示当前对话历史

### 历史持久化

对话历史保存到 `~/.piz/chat_history.json`，跨会话保持。默认保留 20 条消息，可通过 `chat_history_size` 配置项调整。

## 上下文感知

piz 的一个实用特性是**上下文感知**——如果用户的输入看起来像是对上一条命令的跟进，piz 会把上一条命令的信息附加到提示词中。

比如：

```
$ piz 列出所有 js 文件
  ➜ find . -name "*.js" -type f
  [执行成功]

$ piz 按大小排序
  ➜ find . -name "*.js" -type f | sort -k5 -n
```

第二条请求"按大小排序"本身是模糊的，但因为 piz 知道上一条命令是什么以及它的输出，LLM 能理解用户想对同一组文件排序。

这通过 `last_exec.json` 中记录的命令和输出实现——如果上一条命令成功执行且输出不为空，就作为 user message 的一部分传给 LLM。

## 小结

piz 在容错方面的核心思路是：

1. **不信任 LLM 的输出格式**——4 级回退解析确保最大程度提取有效命令
2. **不信任命令一定能成功**——自动修复机制提供智能重试
3. **底线安全**——解析失败宁可报错也不执行原始文本，修复命令也要经过安全检查

下一篇（最后一篇）会讲跨平台工程化实践——Windows 编码、Shell 集成、缓存系统、CI/CD 和测试体系。

---

*本文是 piz 开发日志系列的第 4 篇，共 5 篇。*


项目地址：[GitHub](https://github.com/AriesOxO/piz) 
