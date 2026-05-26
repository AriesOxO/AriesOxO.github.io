---
author: meow
comments: true
title: 用 AI 深度优化 GitHub Profile：从发现问题到自动化部署
categories:
  - 工具分享
  - 效率提升
tags:
  - GitHub Profile
  - github-readme-stats
  - Vercel
  - 自动化
  - Claude Code
description: "记录一次完整的 GitHub 主页优化过程：AI 诊断设计隐患、动态统计替换硬编码、自部署 Vercel 实例解决图片加载问题，以及 bio 定位优化。"
---

# 用 AI 深度优化 GitHub Profile：从发现问题到自动化部署

> GitHub Profile 是开发者的门面，但很多人（包括我）设置完就忘了维护。这次用 Claude Code 做了一次深度体检，发现了不少隐患，顺手全部修复。

---

## 一、问题诊断：你的主页可能也有这些坑

### 1.1 数据硬编码，悄悄过时

之前的 README 用手写的 shields.io badge 展示统计：

```markdown
![公开仓库](https://img.shields.io/badge/公开仓库-35-blue)
![总Stars](https://img.shields.io/badge/总Stars-31-yellow)
```

问题是这些数字是写死的。实际检查发现：

| 指标 | 显示值 | 实际值 |
|------|--------|--------|
| 公开仓库 | 35 | 11 |
| 总 Stars | 31 | 42 |

数据不一致会给访问者留下「不维护」或「数据造假」的印象。这是最容易被忽视的隐患——静态 badge 永远不会自动更新。

### 1.2 技术栈过于宽泛

列了 Rust/Go/Java/Python/C + 前端全家桶，但公开仓库主要是 Rust 和 Python。没有项目佐证的技术标签反而降低可信度。

### 1.3 缺少活跃度证明

没有贡献日历、连续提交记录等动态组件。对独立开发者来说，展示持续活跃比展示技术栈标签更有说服力。

### 1.4 访问计数器不可靠

用了 `count.getloli.com` 的第三方服务，key 是 `:meow` 而不是用户名，稳定性存疑。

---

## 二、动态统计：告别手动更新

### 2.1 精选项目用 shields.io 动态 badge

shields.io 提供基于 GitHub API 的动态 badge，全球 CDN 分发，非常稳定：

```markdown
![Stars](https://img.shields.io/github/stars/AriesOxO/piz?style=flat-square)
```

这个 badge 会实时反映仓库的 star 数，不需要手动维护。

### 2.2 GitHub Stats 卡片

[github-readme-stats](https://github.com/anuraghazra/github-readme-stats) 提供漂亮的统计卡片，包括总 star、commit 数、PR 数、贡献评级等。但公共实例 `github-readme-stats.vercel.app` 有速率限制，高峰期经常加载失败。

### 2.3 Streak 统计

连续提交记录用 `streak-stats.demolab.com`，由原作者 DenverCoder1 官方维护，比旧的 herokuapp 实例稳定得多：

```markdown
[![GitHub Streak](https://streak-stats.demolab.com?user=AriesOxO&theme=dark&hide_border=true)](https://git.io/streak-stats)
```

---

## 三、自部署 Vercel 实例：彻底解决加载问题

公共 `github-readme-stats.vercel.app` 实例的速率限制是个老问题。根本解决方案是自己部署一个实例。

### 3.1 部署步骤

1. **Fork 仓库**：`gh repo fork anuraghazra/github-readme-stats --clone=false`
2. **生成 GitHub Token**：Settings → Fine-grained tokens → Public Repositories (read-only)
3. **Vercel 部署**：Import fork 的仓库，环境变量加 `PAT_1 = <token>`
4. **获取专属域名**：部署完成后 Vercel 分配独立域名

### 3.2 替换 URL

部署完成后，把 README 中所有 `github-readme-stats.vercel.app` 替换为自己的域名：

```markdown
![Stats](https://your-instance.vercel.app/api?username=AriesOxO&show_icons=true&theme=dark&hide_border=true)
![Top Langs](https://your-instance.vercel.app/api/top-langs/?username=AriesOxO&layout=compact&theme=dark&hide_border=true)
```

自己的实例没有共享速率限制，图片加载问题彻底解决。

---

## 四、访问计数器替换

将不稳定的第三方计数器换成 `komarev.com/ghpvc`，绑定自己的 GitHub 用户名：

```markdown
![profile views](https://komarev.com/ghpvc/?username=AriesOxO&style=flat-square&color=blue)
```

---

## 总结

1. **数据要动态**：任何会变化的数字都不应该硬编码，用 API 驱动的 badge 代替
2. **Bio 要有信息量**：3 秒让陌生人判断你是谁，别浪费这个高曝光位
3. **公共服务有瓶颈**：依赖第三方免费实例要有 Plan B，自部署是最优解
4. **定期体检**：Profile 设置完容易忘记维护，数据会悄悄过时
