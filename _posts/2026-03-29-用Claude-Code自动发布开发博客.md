---
author: meow
comments: true
title: 用 Claude Code 自动发布开发博客：从 Git 提交到 GitHub Pages 一键搞定
categories:
  - 工具分享
  - 效率提升
tags:
  - Claude Code
  - GitHub CLI
  - 自动化
  - 博客
  - 飞书通知
description: "分享如何用 Claude Code 技能系统 + GitHub CLI，实现从 Git 提交记录自动生成开发博客、一键推送到 GitHub Pages、自动飞书通知的完整工作流。"
---

# 用 Claude Code 自动发布开发博客：从 Git 提交到 GitHub Pages 一键搞定

> 写代码容易，写博客难——不是不会写，而是懒得整理。本文分享一个完整的自动化方案：一条命令，自动从 Git 提交记录中提炼开发日志，推送到 GitHub Pages 博客，并发送飞书通知。

---

## 一、痛点：为什么需要自动化发博客

作为独立开发者，项目开发节奏很快，三天就能产出 60+ 次提交。但每次想写开发博客时，面对的流程是这样的：

1. 翻 `git log`，回忆做了什么
2. 打开博客仓库，clone 或 pull 最新代码
3. 按 Jekyll 格式写 frontmatter、正文
4. git add → commit → push
5. 等 GitHub Pages 构建完成

**整个流程 30-60 分钟**，其中大部分时间花在"从提交记录中提炼有价值的内容"和"处理发布流程"上。

目标很简单：**一条命令，5 分钟搞定**。

---

## 二、核心思路：gh API 直接推送，无需 clone

传统方案需要 clone 博客仓库到本地，写入文件后再 push。但 GitHub CLI（`gh`）提供了 Contents API，可以**直接在远程仓库中创建或更新文件**：

```bash
# 创建新文件 —— 一条命令，无需 clone
CONTENT=$(base64 -w 0 < article.md)
gh api repos/用户名/仓库名/contents/_posts/2026-03-29-文章标题.md \
  --method PUT \
  -f message="发布: 文章标题" \
  -f content="$CONTENT"
```

这比 clone → write → commit → push 的流程简洁得多。关键注意点：

| 事项 | 说明 |
|------|------|
| `base64 -w 0` | **必须加**，否则长内容折行会导致 API 拒绝 |
| 中文文件名 | `gh api` 自动处理 URL 编码，直接传中文即可 |
| 更新已有文件 | 必须先获取 SHA，否则返回 409 冲突 |
| 默认分支 | 不传 `branch` 参数则写入默认分支 |

**更新已有文件的完整命令：**

```bash
# 先获取文件的 SHA
SHA=$(gh api "repos/用户名/仓库名/contents/_posts/已有文件.md" --jq '.sha')

# 带 SHA 更新
CONTENT=$(base64 -w 0 < updated-article.md)
gh api "repos/用户名/仓库名/contents/_posts/已有文件.md" \
  --method PUT \
  -f message="更新: 文章标题" \
  -f content="$CONTENT" \
  -f sha="$SHA"
```

---

## 三、技能架构：Claude Code Skill 系统

Claude Code 的技能（Skill）系统可以将复杂的工作流封装为可复用的指令。一个技能本质上是一个 Markdown 文件，描述了 Claude 应该如何执行某类任务。

### 3.1 技能文件结构

```
~/.claude/skills/publish-blog/
├── SKILL.md                        # 技能主文件（工作流定义）
└── references/
    └── blog-conventions.md         # 博客格式规范参考
```

`SKILL.md` 包含 YAML 元数据和完整的工作流指令：

```yaml
---
name: publish-blog
description: 从当前项目的 Git 提交记录、docs 文档、代码变更生成开发博客文章，
  发布到 GitHub Pages 博客仓库。支持新建和更新已有文章，发布后自动飞书通知。
---
```

Claude Code 启动时会加载所有技能的 `name` 和 `description`，当用户输入匹配时自动触发。也可以用 `/publish-blog` 手动调用。

### 3.2 参考文件：博客格式规范

`references/blog-conventions.md` 存储了博客的 frontmatter 模板、中文编号映射表（一、二、三...三十）、文件命名规则、写作风格指南等。这些信息只在技能触发时加载，不会占用日常对话的上下文。

---

## 四、完整工作流设计

整个流程分为五个阶段：

```
Phase 0: 项目识别
    ↓
Phase 1: 多层内容采集（git log → docs → code diff）
    ↓
Phase 2: 博客仓库分析（系列识别 → 编号递增）
    ↓
Phase 3: 草稿生成 → 用户确认
    ↓
Phase 4: gh api 推送 → 飞书通知
```

### 4.1 Phase 0: 项目识别

技能首先读取当前项目的标识文件，自动提取项目元信息：

```bash
# 按优先级读取：CLAUDE.md > README.md > package.json / go.mod
# 提取：项目名称、一句话定位、核心技术栈
```

这些信息决定了博客的标题前缀、分类和标签。

### 4.2 Phase 1: 多层内容采集

这是最核心的设计。这里不是简单地把 `git log` 丢给 AI 总结，而是分三层按需采集：

**L1 — Git 提交记录（始终执行）：**

```bash
git log --since="3 days ago" --all --pretty=format:"%h %s (%ai)" --stat
```

按 commit message 前缀分类统计：feat / fix / refactor / docs / chore / test 各有多少，快速了解这段时间的工作分布。

**L2 — docs/ 目录文档（有变更时执行）：**

```bash
git diff --name-only HEAD~20 -- docs/  # 排除 docs/post/ 自身
```

如果 docs/ 下有新增或修改的文档（比如用户手册、CHANGELOG），读取这些文档作为博客素材。文档中往往包含比 commit message 更完整的功能描述。

**L3 — 代码 diff（选择性执行）：**

不是所有提交都需要看代码。只对**关键提交**读取 diff：

| 提交类型 | 触发条件 | 采集方式 |
|---------|---------|---------|
| `feat:` | 文件变更 > 50 行 | 读取新增的核心文件 |
| `refactor:` | 文件变更 > 50 行 | 读取重构前后的关键差异 |
| `fix:` | commit message 描述不清晰 | 读取修复的代码片段 |
| `chore:` / `style:` | — | 跳过，不读代码 |

这种分层策略的好处是：**既不会因为信息不足写出空洞的文章，也不会因为信息过载浪费上下文窗口**。

### 4.3 Phase 2: 博客仓库分析

通过 `gh api` 直接查询远程博客仓库，不需要 clone：

```bash
# 列出所有文章
gh api repos/AriesOxO/AriesOxO.github.io/contents/_posts --jq '.[].name'

# 搜索当前项目的已有系列，确定下一篇编号
```

如果是新项目首篇，会读取博客中最近一篇文章的 frontmatter 和结构作为风格参考，确保新系列与博客整体风格一致。

### 4.4 Phase 3: 草稿管理

生成的文章不会直接推送，而是先写入项目的 `docs/post/` 目录：

```
项目根/
├── docs/
│   └── post/
│       ├── 2026-03-29-v0.9.0大版本冲刺.md      # 已发布的
│       └── 2026-03-29-自动发布开发博客.md        # 新生成的草稿
├── src/
└── ...
```

**为什么放在项目目录而不是临时目录？**

1. **版本追踪**：草稿随项目 git 管理，可以看到修改历史
2. **支持更新**：修改 `docs/post/` 中的文件后再次运行，会自动检测变更并更新远程博客
3. **多次迭代**：不满意可以直接编辑文件，不需要重新生成

草稿生成后展示给用户确认，只有确认后才会推送。

### 4.5 Phase 4 & 5: 推送与通知

用户确认后，技能执行两个操作：

**推送到 GitHub Pages：**

```bash
CONTENT=$(base64 -w 0 < docs/post/文章.md)
gh api "repos/AriesOxO/AriesOxO.github.io/contents/_posts/文章.md" \
  --method PUT \
  -f message="docs: 发布开发博客 - 文章标题" \
  -f content="$CONTENT"
```

**自动飞书通知（无需确认）：**

采用文件中转方式避免 Windows 终端中文乱码：

```json
{
  "msg_type": "post",
  "content": {
    "post": {
      "zh_cn": {
        "title": "📝 开发博客已发布",
        "content": [
          [{"tag": "text", "text": "项目：项目名"}],
          [{"tag": "text", "text": "标题：文章标题"}],
          [{"tag": "text", "text": "摘要：文章核心内容概括..."}],
          [{"tag": "a", "text": "查看文章 →", "href": "https://ariesoxo.github.io/"}]
        ]
      }
    }
  }
}
```

```bash
curl -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d @feishu.json \
  https://open.feishu.cn/open-apis/bot/v2/hook/你的webhook地址
```

---

## 五、Windows 环境踩坑记录

在 Windows + Git Bash 环境下开发这套流程，遇到了几个值得记录的坑：

### 5.1 base64 折行

Git Bash 自带的 `base64` 命令默认在 76 字符处插入换行。GitHub API 会拒绝包含换行的 base64 内容。**必须加 `-w 0` 参数**：

```bash
# ❌ 会折行，API 报错
base64 < article.md

# ✅ 不折行
base64 -w 0 < article.md
```

### 5.2 printf 与 YAML frontmatter

YAML frontmatter 以 `---` 开头，而 `printf` 在某些 shell 中会把以 `-` 开头的参数解释为选项。用文件输入替代 echo/printf：

```bash
# ❌ 可能报错
printf '---\ntitle: 标题\n---' | base64 -w 0

# ✅ 直接从文件读取
base64 -w 0 < docs/post/article.md
```

### 5.3 中文文件名

好消息：`gh api` 会自动处理中文 URL 编码，不需要手动 encode。直接在路径中写中文文件名即可。

---

## 六、使用效果

### 首次使用

```bash
# 在任意项目目录下执行
/publish-blog 3d
```

Claude Code 会自动：
1. 识别当前项目（名称、技术栈）
2. 读取最近 3 天的 git log
3. 按需读取 docs/ 和代码 diff
4. 查询博客仓库已有文章，确定编号
5. 生成文章草稿到 `docs/post/`
6. 等你确认后一键推送 + 飞书通知

### 更新已有文章

直接编辑 `docs/post/` 中的文件，然后再次运行 `/publish-blog`，技能会检测到本地文件与远程版本不同，自动执行更新（带 SHA 参数）。

### 参数灵活

```bash
/publish-blog 3d          # 最近 3 天
/publish-blog 2w          # 最近 2 周
/publish-blog v0.9.0      # 从某个 tag 开始
/publish-blog 2026-03-27  # 从指定日期开始
/publish-blog             # 默认最近 7 天
```

---

## 七、如何复刻这套方案

如果你也想搭建类似的自动化博客发布流程，需要准备：

### 7.1 前置条件

1. **Claude Code**：安装并配置好（[官方文档](https://claude.ai/code)）
2. **GitHub CLI**：安装 `gh` 并完成认证（`gh auth login`）
3. **Jekyll 博客**：部署在 GitHub Pages（其他静态博客框架同理，只需调整文件路径）
4. **飞书机器人**（可选）：创建自定义机器人，获取 Webhook 地址

### 7.2 创建技能

```bash
# 创建技能目录
mkdir -p ~/.claude/skills/publish-blog/references

# 创建 SKILL.md（工作流定义）
# 创建 references/blog-conventions.md（博客格式规范）
```

`SKILL.md` 中需要配置：
- 你的博客仓库地址（如 `用户名/用户名.github.io`）
- 文章目录路径（Jekyll 默认 `_posts/`）
- 本地草稿目录（建议 `docs/post/`）
- 飞书 Webhook 地址（如果需要通知）

### 7.3 适配你的博客格式

在 `references/blog-conventions.md` 中定义：
- frontmatter 模板（每个博客框架格式不同）
- 文件命名规则
- 写作风格偏好
- 项目与博客系列的映射关系

---

## 总结

1. **`gh api` 是关键**：直接通过 GitHub API 创建/更新文件，完全跳过 clone → commit → push 的流程，一条命令搞定发布。

2. **分层采集策略**：git log 始终读、docs/ 变更时读、代码 diff 选择性读——既保证内容质量，又避免信息过载。

3. **草稿存项目目录**：`docs/post/` 随项目版本管理，支持多次编辑和更新已发布文章，比临时文件更可靠。

4. **Claude Code 技能系统**：将复杂的多步骤工作流封装为一条命令，`SKILL.md` + `references/` 的结构既保持了灵活性，又不会污染日常对话上下文。

5. **端到端自动化**：从 git log 到博客发布到飞书通知，全程只需要在"确认草稿"时介入一次。把时间花在审核内容质量上，而不是格式和发布流程上。
