---
category: 设计
status: 草案
references: []
last_updated: 2026-04-01
---

# 开源项目官网 Landing Page 设计方案

## 1. 背景与目标

### 1.1 背景

博客已有较完整的内容体系（文章、归档、说说、友链），但缺少一个独立的开源项目展示入口。现有的项目相关内容（如 piz 系列 5 篇博客）散落在文章列表中，属于「开发过程记录」，缺乏面向访客的「项目是什么 → 为什么用 → 怎么用」的结构化展示。

### 1.2 目标

为每个开源项目提供**独立的官网级 Landing Page**，具备视觉冲击力和信息完整性，同时提供统一的项目列表入口页。

### 1.3 预期效果

- 访客能在 30 秒内理解一个项目的定位和价值
- 每个项目有独立 URL，可用于社交分享和 README 引用
- 新增项目只需添加一个 Markdown 文件，维护成本低
- 与博客整体风格（forest 主题）视觉统一

---

## 2. 整体架构

### 2.1 页面结构

```
                    ┌──────────────┐
                    │  博客首页     │
                    └──────┬───────┘
                           │
    ┌──────┬──────┬────────┼────────┬──────┬──────┐
    │归档  │说说   │ 开源(新) │关于    │友链   │ ...  │
    └──────┘──────┘────┬───┘───────┘──────┘──────┘
                       │
              ┌────────┴────────┐
              │ 项目列表入口页   │  projects.html
              │ (官网风格首页)   │
              └───┬────────┬────┘
                  │        │
         ┌────────┘        └────────┐
         ▼                          ▼
  ┌──────────────┐          ┌──────────────┐
  │ 项目 A 官网   │          │ 项目 B 官网   │  _projects/*.md
  │ Landing Page │          │ Landing Page │
  └──────────────┘          └──────────────┘
```

### 2.2 文件结构

```
AriesOxO.github.io/
├── _config.yml                              # [修改] 添加 projects collection
├── _data/navigation.yml                     # [修改] 添加「开源」导航项
├── _projects/                               # [新建] Jekyll Collection 目录
│   ├── piz.md                               #         项目 A 的完整官网内容
│   └── another-project.md                   #         项目 B
├── _layouts/project.html                    # [新建] 项目 Landing Page 布局
├── projects.html                            # [新建] 项目列表入口页
├── _sass/additional/_projects.scss          # [新建] 项目页专用样式
└── assets/css/main.scss                     # [修改] 引入 _projects.scss
```

### 2.3 URL 设计

| 页面 | URL | 说明 |
|------|-----|------|
| 项目列表 | `/projects.html` | 所有项目的入口 |
| 项目详情 | `/projects/piz/` | 每个项目独立 URL，简洁可分享 |

---

## 3. 技术方案

### 3.1 Jekyll Collection 配置

在 `_config.yml` 中添加：

```yaml
collections:
  projects:
    output: true
    permalink: /projects/:name/

defaults:
  # ... 保留现有 posts 配置 ...
  - scope:
      path: ""
      type: projects
    values:
      layout: project
      comment: false
      sharing: false
```

**选择 Collection 而非纯数据文件的理由**：
- Collection 中的每个 `.md` 自动生成独立 HTML 页面（`output: true`）
- 正文支持完整 Markdown 渲染（Mermaid、代码高亮、图片等）
- Front Matter 提供结构化元数据，正文提供自由内容，两者结合
- Jekyll 原生支持，无需额外插件，GitHub Pages 兼容

### 3.2 项目文件 Front Matter 设计

```yaml
---
layout: project
title: piz
tagline: "一句话定位，显示在 Hero 和列表卡片上"
description: "SEO 用的详细描述，用于 meta description"
repo: https://github.com/AriesOxO/piz
demo: ""                          # 可选，在线演示地址
status: active                    # active | maintained | archived
tags: [Java, Spring Boot]
color: "#2d8cf0"                  # 项目主题色，渲染 Hero 渐变背景
icon: /assets/images/projects/piz.png  # 可选，项目 Logo
features:
  - title: 轻量高效
    icon: fas fa-bolt
    excerpt: 核心依赖少，启动快
  - title: 开箱即用
    icon: fas fa-rocket
    excerpt: 零配置快速接入
  - title: 易于扩展
    icon: fas fa-puzzle-piece
    excerpt: 插件化架构设计
related_tag: piz                   # 自动关联含此标签的博文
---

（Markdown 正文：快速开始、架构设计、截图展示等自由内容）
```

**字段说明**：

| 字段 | 必填 | 用途 |
|------|------|------|
| `title` | 是 | 项目名称 |
| `tagline` | 是 | 一句话介绍，列表页和 Hero 区共用 |
| `description` | 是 | SEO meta description |
| `repo` | 是 | GitHub 仓库地址 |
| `demo` | 否 | 在线演示/文档站点 |
| `status` | 是 | 项目状态，影响徽章颜色 |
| `tags` | 是 | 技术标签 |
| `color` | 是 | 主题色，控制该项目 Hero 渐变和卡片边框 |
| `icon` | 否 | 项目 Logo，无则使用首字母占位 |
| `features` | 否 | 特性列表，3~4 个为佳 |
| `related_tag` | 否 | 自动匹配博文的标签名 |

### 3.3 布局设计

#### 3.3.1 项目详情页布局（`_layouts/project.html`）

继承 `base.html`（而非 `page.html`），原因：
- 需要全宽沉浸式 Hero，`page.html` 的居中容器会限制视觉
- 不需要 sidebar/toc，官网是视觉驱动的线性阅读
- 仍保留 header/footer，导航和站点底部与博客一致

**板块结构**：

```
┌─────────────────────────────────────────────────────┐
│  HEADER（复用博客全局导航）                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│                 🎯 HERO 区域                         │
│          全宽渐变背景（基于项目 color）                 │
│                                                     │
│              项目名称（H1）                           │
│              tagline（副标题）                        │
│         状态徽章  ·  技术标签                          │
│                                                     │
│       [ GitHub ]    [ 在线演示 ]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│              ⚡ FEATURES 功能特性                     │
│         （仅当 front matter 中定义了 features）        │
│                                                     │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│    │  图标     │  │  图标     │  │  图标     │        │
│    │  标题     │  │  标题     │  │  标题     │        │
│    │  描述     │  │  描述     │  │  描述     │        │
│    └──────────┘  └──────────┘  └──────────┘        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│            📖 CONTENT 自由内容区域                    │
│         居中容器，渲染 Markdown 正文                   │
│         支持 Mermaid / MathJax / 代码高亮             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│            📝 RELATED POSTS 相关博文                  │
│      （自动匹配 related_tag，无匹配则不显示）           │
│                                                     │
│    ┌──────────────┐  ┌──────────────┐               │
│    │ 博文标题      │  │ 博文标题      │               │
│    │ 日期 · 摘要   │  │ 日期 · 摘要   │               │
│    └──────────────┘  └──────────────┘               │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│              🔗 CTA 底部号召区域                      │
│       "觉得不错？给个 Star 支持一下"                    │
│           [ ⭐ Star on GitHub ]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER（复用博客全局底部）                            │
└─────────────────────────────────────────────────────┘
```

**模板伪代码**：

```html
---
layout: base
header: true
---
<!-- Hero 区域：全宽渐变背景 -->
<section class="project-hero" style="background: linear-gradient(135deg, {{ page.color }}, ...)">
  <div class="project-hero__content">
    <!-- 可选 icon -->
    <h1>{{ page.title }}</h1>
    <p class="project-hero__tagline">{{ page.tagline }}</p>
    <div class="project-hero__meta">
      <span class="status-badge status-badge--{{ page.status }}">{{ page.status }}</span>
      {% for tag in page.tags %}<span class="tech-tag">{{ tag }}</span>{% endfor %}
    </div>
    <div class="project-hero__actions">
      <a href="{{ page.repo }}" class="button button--outline-info button--pill button--lg">GitHub</a>
      {% if page.demo %}<a href="{{ page.demo }}" class="button button--info button--pill button--lg">在线演示</a>{% endif %}
    </div>
  </div>
</section>

<!-- Features 区域：仅当定义了 features 时渲染 -->
{% if page.features %}
<section class="project-features">
  <div class="project-features__grid">
    {% for feature in page.features %}
    <div class="feature-card">
      <i class="{{ feature.icon }}"></i>
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.excerpt }}</p>
    </div>
    {% endfor %}
  </div>
</section>
{% endif %}

<!-- Content 区域：渲染 Markdown 正文 -->
<section class="project-content">
  <div class="main">
    {{ content }}
  </div>
</section>

<!-- Related Posts 区域：自动匹配 -->
{% assign related = site.posts | where_exp: "post", "post.tags contains page.related_tag" %}
{% if related.size > 0 %}
<section class="project-related">
  <h2>相关博文</h2>
  <div class="project-related__grid">
    {% for post in related limit:6 %}
    <a href="{{ post.url }}" class="related-card">
      <span class="related-card__date">{{ post.date | date: "%Y-%m-%d" }}</span>
      <span class="related-card__title">{{ post.title }}</span>
    </a>
    {% endfor %}
  </div>
</section>
{% endif %}

<!-- CTA 区域 -->
<section class="project-cta">
  <p>觉得不错？给个 Star 支持一下</p>
  <a href="{{ page.repo }}" class="button button--primary button--pill button--xl">⭐ Star on GitHub</a>
</section>
```

#### 3.3.2 项目列表页（`projects.html`）

```
┌─────────────────────────────────────────────────────┐
│  HEADER                                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│              HERO 头部区域                            │
│          "我的开源世界"                               │
│         一句个人开源理念                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│    ┌───────────────────┐  ┌───────────────────┐     │
│    │  项目主题色边框     │  │  项目主题色边框     │     │
│    │                   │  │                   │     │
│    │  Logo / 首字母     │  │  Logo / 首字母     │     │
│    │  项目名称          │  │  项目名称          │     │
│    │  tagline          │  │  tagline          │     │
│    │                   │  │                   │     │
│    │  [Java] [Spring]  │  │  [Go] [Docker]    │     │
│    │  ● active         │  │  ● maintained     │     │
│    │                   │  │                   │     │
│    │    [ 查看详情 → ]  │  │    [ 查看详情 → ]  │     │
│    └───────────────────┘  └───────────────────┘     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER                                             │
└─────────────────────────────────────────────────────┘
```

---

## 4. 可行性分析

### 4.1 主题组件复用评估

对现有 jekyll-TeXt-theme 的组件进行逐一评估：

| 组件 | 来源文件 | 复用度 | 说明 |
|------|---------|--------|------|
| Hero 容器 | `_sass/common/components/_hero.scss` | **100%** | 支持 dark/light/center，背景图片，响应式标题。直接可用 |
| 按钮系统 | `_sass/common/components/_button.scss` | **100%** | 7 色 × 填充/轮廓，5 种尺寸，pill/rounded 形状。完全满足 CTA 需求 |
| 栅格系统 | `_sass/common/classes/_grid.scss` | **100%** | 12 列，sm/md/lg 三断点（0/500/1024px），flex 布局。Features 网格直接使用 |
| 卡片组件 | `_sass/common/components/_card.scss` | **90%** | 支持 clickable、flat、图片覆盖层。需微调为项目卡片样式 |
| 菜单组件 | `_sass/common/components/_menu.scss` | **90%** | 水平/垂直/居中。按钮组直接使用 |
| 间距工具 | `_sass/common/classes/_spacing.scss` | **100%** | m/p × t/b/l/r/x/y × 0-5 级。布局微调无需自写 |
| Forest 配色 | `_sass/skins/_forest.scss` | **80%** | 三主色（玫瑰红/淡金/薄荷绿）+ 四功能色。项目自定义 color 需额外处理 |
| Landing 布局 | `_sass/layout/_landing.scss` | **参考** | 全宽容器、Hero cover 等思路可借鉴，但不直接继承 |

**结论**：现有主题组件可覆盖约 **85%** 的 UI 需求，只需新增约 150~200 行 SCSS。

### 4.2 需要新写的部分

| 内容 | 工作量 | 复杂度 |
|------|--------|--------|
| `_layouts/project.html` 模板 | ~80 行 Liquid/HTML | 低 — 主要是组装现有组件 |
| `_sass/additional/_projects.scss` 样式 | ~180 行 SCSS | 中 — Hero 渐变、Features 网格、响应式 |
| `projects.html` 列表页 | ~50 行 HTML | 低 — 遍历 collection 渲染卡片 |
| `_config.yml` 配置 | ~15 行 YAML | 低 — 声明 collection 和 defaults |
| `_data/navigation.yml` | ~5 行 YAML | 低 — 添加一个导航项 |

**总新增代码量**：约 330 行，无第三方依赖。

### 4.3 GitHub Pages 兼容性

| 关注点 | 结论 |
|--------|------|
| Jekyll Collection | **兼容** — Jekyll 原生功能，GitHub Pages 完全支持 |
| 自定义布局 | **兼容** — `_layouts/` 下自定义文件无任何限制 |
| SCSS 编译 | **兼容** — 通过 `main.scss` 统一入口，构建流程不变 |
| 构建命令 | **无变化** — `npm run build` / `bundle exec jekyll build` 不受影响 |
| GitHub Actions | **无变化** — 现有 `.github/workflows/jekyll.yml` 无需修改 |
| 额外插件 | **不需要** — 零新插件依赖 |

### 4.4 性能影响

| 指标 | 影响 |
|------|------|
| 构建时间 | **可忽略** — 每个项目仅增加一个页面，Collection 比 posts 量级小得多 |
| CSS 体积 | **+3~5KB**（未压缩）— 新增约 180 行 SCSS，gzip 后约 1KB |
| 页面加载 | **无额外 JS** — 纯 CSS + HTML，无运行时开销 |
| 首次渲染 | **快** — Hero 区域用 CSS 渐变而非背景图片，无需等待图片加载 |

### 4.5 维护性评估

**新增一个项目的步骤**：

1. 在 `_projects/` 下创建 `project-name.md`
2. 填写 Front Matter（复制已有项目改字段即可）
3. 编写 Markdown 正文
4. （可选）在 `assets/images/projects/` 放 Logo

**无需触碰**的文件：布局模板、样式文件、配置文件、导航配置。

### 4.6 风险点与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| 项目 `color` 与 forest 主题不协调 | 中 | 低 | 提供推荐配色方案，Hero 渐变加统一的暗色覆盖层保证可读性 |
| Features 数量不定导致布局异常 | 低 | 低 | 栅格系统自动响应：1 个全宽，2 个各半，3~4 个三列/四列 |
| Related Posts 匹配不准 | 低 | 低 | 使用精确的 `related_tag` 字段，而非模糊匹配标题 |
| Markdown 正文中的 H1 与 Hero 标题冲突 | 中 | 低 | 正文建议从 H2 开始，可在文档中约定 |
| 项目无 Logo 图片 | 高 | 低 | 使用首字母 + 项目主题色作为 fallback（友链页已有此模式） |

---

## 5. 样式方案

### 5.1 Hero 区域

```scss
.project-hero {
  // 全宽，渐变背景通过 inline style 注入（基于项目 color）
  // 叠加半透明暗层确保文字可读性
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  position: relative;

  &::before {
    // 暗色覆盖层，统一不同 color 下的对比度
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
  }
}
```

### 5.2 Features 网格

复用主题栅格系统 `.grid` + `.cell--lg-4`（3 列）/ `.cell--lg-3`（4 列），卡片样式参考现有 `.card` 组件扩展。

### 5.3 状态徽章配色

| 状态 | 颜色 | 含义 |
|------|------|------|
| `active` | `#52c41a`（主题 success 色） | 积极开发中 |
| `maintained` | `#1890ff`（主题 info 色） | 稳定维护 |
| `archived` | `#8c8c8c` | 已归档 |

### 5.4 推荐的项目主题色

为保证与 forest 主题协调，建议项目 `color` 从以下范围选取：

```
#2d8cf0  蓝色系（技术工具）
#19be6b  绿色系（效率工具）
#ff9900  橙色系（创意项目）
#7c4dff  紫色系（框架类）
#e91e63  粉色系（社区项目）
#00bcd4  青色系（数据/API）
```

---

## 6. 与现有博文的关系

| 维度 | 博客文章（_posts） | 项目官网（_projects） |
|------|-------------------|---------------------|
| 定位 | 开发过程记录、技术探索 | 面向访客的项目介绍 |
| 视角 | 开发者视角（我做了什么） | 用户视角（这是什么、怎么用） |
| 阅读动线 | 时间线浏览 | 目标导向（了解 → 使用 → 参与） |
| 互相关联 | 文章中可链接到项目官网 | 官网底部自动列出相关博文 |

两者互补而非重复。项目官网是「入口」，博文是「深度内容」。

---

## 7. 实施步骤

按优先级排列，每步独立可交付：

| 步骤 | 内容 | 涉及文件 | 可独立部署 |
|------|------|---------|-----------|
| 1 | `_config.yml` 添加 collection 配置 | `_config.yml` | 是（无可见变化） |
| 2 | 创建 `_layouts/project.html` 布局模板 | `_layouts/project.html` | 否（需配合步骤 3） |
| 3 | 创建 `_sass/additional/_projects.scss` 并在 `main.scss` 引入 | 2 个文件 | 否 |
| 4 | 创建第一个项目文件 `_projects/piz.md`，验证详情页效果 | `_projects/piz.md` | 是 |
| 5 | 创建 `projects.html` 列表入口页 | `projects.html` | 是 |
| 6 | `_data/navigation.yml` 添加「开源」导航 | `navigation.yml` | 是 |
| 7 | 本地验证全流程，调优样式 | — | — |

**预计步骤 1~6 的总工作量**：新建 4 个文件，修改 3 个文件，约 330 行新增代码。

---

## 8. 未来扩展

以下功能**不在本次范围内**，但架构设计已预留扩展空间：

| 扩展方向 | 实现思路 | 难度 |
|---------|---------|------|
| GitHub Stars 实时显示 | 通过 shields.io 徽章或 GitHub API + JS 渲染 | 低 |
| 项目截图轮播 | 利用主题已有的 swiper 组件 | 低 |
| 项目时间线（开发历程） | 复用说说页面的 timeline 组件 | 低 |
| 贡献者头像墙 | GitHub API 获取 contributors 列表 | 中 |
| 项目间依赖关系图 | Mermaid 图表（已启用） | 低 |
| 多语言项目介绍 | 参考现有 titles 的 YAML anchor 模式 | 中 |
