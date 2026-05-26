---
author: meow
comments: true
title: 换电脑不慌：一套跨平台方案管理你的 Claude Code 环境
categories:
  - 开发记录
  - AI工具
tags:
  - Claude Code
  - 环境管理
  - 跨平台
  - dotfiles
---

用 Claude Code 一段时间后，你会积累不少配置：自定义指令（CLAUDE.md）、技能（Skills）、插件、Hooks、代理设置……这些东西散落在 `~/.claude/` 目录下，换台电脑就得从头来过。更麻烦的是不同机器的环境差异：有的用系统环境变量存 API Token，有的用 .env 文件；有的需要代理，有的不需要。直接复制配置目录行不通。

本文分享我们的解决方案：一套**可选择、可合并、可跨平台**的 Claude Code 环境管理工具。

---

## 一、核心思路

我们把 Claude Code 的配置做版本化管理，但不是简单的"备份-恢复"，而是围绕四个原则设计：

1. **配置模块化** — settings.json 拆成独立片段（API、代理、权限、插件……），按需组合
2. **智能合并** — 不覆盖已有配置，而是深度合并，保留用户自定义内容
3. **环境感知** — 自动检测系统环境变量，已有的不重复写入
4. **敏感信息分离** — 密钥通过 .env 管理，不入仓库

---

## 二、模块化 Settings

一个完整的 settings.json 可能有几十行，但换电脑时未必全都需要。我们把它拆成独立片段：

```
settings.d/
├── 01-env-api.json       # API Token、Base URL
├── 02-env-proxy.json     # 代理（国内环境需要，海外不需要）
├── 03-permissions.json   # 权限模式
├── 04-hooks.json         # 自动化 Hooks
├── 05-plugins.json       # 插件列表
└── 06-preferences.json   # 主题等偏好
```

安装时选 `1,3,5,6`，跳过代理和 Hooks——因为新机器的网络环境和工作流可能不同。每个片段是一个独立的 JSON 文件，包含 `description` 字段用于安装时展示说明。

---

## 三、合并而非覆盖

如果目标机器已经有 settings.json（比如你手动配了一些东西），脚本不会直接覆盖，而是：

1. 以已有文件为基础
2. 把选中的模块深度合并进去
3. 新增字段追加，同名字段覆盖
4. 用户原有的自定义配置不丢失

同样，CLAUDE.md 已存在时会询问确认，默认不覆盖。安装前还会自动备份原有配置到带时间戳的目录中，确保可回滚。

---

## 四、环境变量智能检测

很多人的 API Token 是通过系统环境变量配置的，不需要写进 settings.json。脚本会自动检测：

- 系统已有 `ANTHROPIC_AUTH_TOKEN` → 跳过，不写入 settings.json
- 系统没有但 .env 中有 → 替换后写入
- 都没有 → 保留 `${...}` 占位符，提示手动编辑

两种配置方式共存，不冲突。这解决了一个常见问题：团队共享配置仓库时，每个人的 Token 来源不同。

---

## 五、实现方案

最终用 Bash + PowerShell 双版本脚本，覆盖 macOS/Linux/Windows。核心依赖只有 git 和 Node.js（用于 JSON 深度合并）。

仓库结构：

```
├── bootstrap.sh / .ps1     # 远程一键安装（curl | bash）
├── install.sh / .ps1       # 本地安装脚本
├── .env.example            # 敏感信息模板（可选）
├── profiles/default/       # 配置集
│   ├── CLAUDE.md
│   ├── instructions/
│   └── settings.d/
└── skills/                 # 所有技能（安装时选择）
```

新电脑上一行命令搞定：

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/AriesOxO/awesome-ai-skills/master/bootstrap.sh | bash

# Windows PowerShell
irm https://raw.githubusercontent.com/AriesOxO/awesome-ai-skills/master/bootstrap.ps1 | iex
```

安装流程：检测配置目录 → 备份原有配置 → 选择 settings 模块 → 选择 skills → 智能合并生成。

---

## 总结

1. **模块化**：配置拆片段，按需组合，不同环境选不同模块
2. **非破坏性**：合并而非覆盖，保留用户已有的自定义配置
3. **环境感知**：系统变量和 .env 两种方式兼容，不冲突
4. **跨平台**：Bash + PowerShell 双版本，一套仓库三端通用
5. **一键恢复**：远程 bootstrap 脚本，新电脑一行命令搞定

AI 编码助手的配置管理本质上和 dotfiles 管理是同一个问题，但多了"模块化选择"和"智能合并"的需求。不是所有配置都适合所有环境，也不是每次安装都该从零开始。

项目地址：[github.com/AriesOxO/awesome-ai-skills](https://github.com/AriesOxO/awesome-ai-skills)
