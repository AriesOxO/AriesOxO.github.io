---
layout: project
title: piz
tagline: "用自然语言操控终端的智能命令助手 — 告别死记硬背，描述即执行"
description: "piz 是一款 Rust 编写的 CLI 工具，将自然语言翻译为 Shell 命令。支持多 LLM 后端、三层安全防护、本地缓存、命令纠错、交互式对话，跨平台开箱即用。"
repo: https://github.com/AriesOxO/piz
status: active
version: v0.3.2
tags: [Rust, CLI, AI, LLM]
color: "#e8590c"
order: 1
features:
  - title: 自然语言驱动
    icon: fas fa-magic
    excerpt: 用日常语言描述需求，自动生成适配当前系统和 Shell 的精确命令
  - title: 三层安全防护
    icon: fas fa-shield-alt
    excerpt: Prompt 拒绝 + 注入检测（12 种攻击模式）+ 危险分级，杜绝恶意命令执行
  - title: 多 LLM 后端
    icon: fas fa-brain
    excerpt: 支持 OpenAI、Claude、Gemini、Ollama + 12 个兼容供应商，一键切换
  - title: 跨平台开箱即用
    icon: fas fa-laptop-code
    excerpt: Windows / macOS / Linux 统一体验，Homebrew、Cargo、一键脚本多种安装方式
related_tag: piz
nav:
  - title: 它能做什么？
    icon: fas fa-terminal
  - title: 快速安装
    icon: fas fa-download
  - title: 核心能力一览
    icon: fas fa-list
  - title: 安全机制
    icon: fas fa-shield-alt
  - title: 支持的 LLM 供应商
    icon: fas fa-brain
  - title: 技术指标
    icon: fas fa-chart-bar
---

## 它能做什么？

```bash
$ piz 查看磁盘使用情况
  ➜ df -h
  [Y] 执行  [n] 取消  [e] 编辑

$ piz 找出所有大于100M的文件
  ➜ find . -size +100M -type f

$ piz 查看3000端口被谁占用
  ➜ lsof -i :3000
```

你只需要说"想做什么"，piz 负责翻译成"怎么做"。

## 快速安装

**Homebrew（macOS / Linux）：**

```bash
brew install AriesOxO/tap/piz
```

**一键安装脚本：**

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/AriesOxO/piz/main/install.sh | bash

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/AriesOxO/piz/main/install.ps1 | iex
```

**Cargo（全平台）：**

```bash
cargo install piz
```

首次运行自动进入交互式配置向导，选择 LLM 供应商、填入 API Key 即可使用。

## 核心能力一览

| 能力 | 说明 |
|------|------|
| 🗣 自然语言 → 命令 | 描述需求，得到精确命令 |
| 🔧 命令纠错 | `piz fix` 自动诊断失败命令，修复重试最多 3 轮 |
| 💬 交互式对话 | `piz chat` 多轮对话模式，支持上下文跟进 |
| 📖 命令解释 | `piz -e 'command'` 逐参数拆解命令含义 |
| 🎯 多候选方案 | `-n 3` 生成多个命令方案，自主选择 |
| ⚡ 本地缓存 | SQLite + TTL + LRU 淘汰，重复查询秒返回 |
| 🐚 Shell 集成 | `piz init` 让 cd/export/source 在当前 Shell 生效，内置 p/pf/pc 快捷别名 |
| 🔄 自动更新 | `piz update` 一键升级，后台静默检查新版本 |

## 安全机制

piz 不盲目信任 LLM 输出，实现了**纵深防御**：

**第一层 · Prompt 拒绝** — 非命令输入（闲聊、注入尝试）被 LLM 拒绝，不生成可执行命令

**第二层 · 注入检测** — 本地正则扫描 12 种恶意模式（环境变量泄露、编码载荷、反弹 Shell、配置文件攻击等），命中直接拦截

**第三层 · 危险分级** — 44 条规则分三级处理：

| 级别 | 行为 | 示例 |
|------|------|------|
| ✅ 安全 | 自动执行 | `ls`、`df -h`、`git status` |
| ⚠️ 警告 | 弹出确认 | `sudo apt install`、`chmod 755` |
| 🚨 危险 | 红色警告 + 强制二次确认 | `rm -rf /`、`mkfs`、`DROP TABLE` |

## 支持的 LLM 供应商

原生支持 **4 种后端**：OpenAI · Claude · Gemini · Ollama（本地）

通过 OpenAI 兼容协议额外支持 **12 个供应商**：DeepSeek · 硅基流动 · OpenRouter · Moonshot · 智谱GLM · 百度千帆 · 阿里DashScope · Mistral · Together · Minimax · 字节BytePlus 等

## 技术指标

| 指标 | 数据 |
|------|------|
| 开发语言 | Rust (edition 2021) |
| 代码规模 | 21 个模块，约 8,700 行 |
| 自动化测试 | 437 个（344 单元 + 45 集成 + 48 平台专项） |
| CI 覆盖 | Ubuntu / macOS / Windows 三平台 |
| 当前版本 | v0.3.2 |
| 许可证 | MIT |
