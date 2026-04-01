---
layout: project
title: PIZ
tagline: "基于 Spring Boot 的快速开发脚手架，开箱即用的企业级基础框架"
description: "PIZ 是一个基于 Spring Boot 的快速开发脚手架，提供权限管理、代码生成、常用工具封装等企业级开发基础能力。"
repo: https://github.com/AriesOxO/piz
demo: ""
status: active
tags: [Java, Spring Boot, MyBatis]
color: "#2d8cf0"
order: 1
features:
  - title: 开箱即用
    icon: fas fa-rocket
    excerpt: 集成常用组件，创建即可运行，快速启动新项目
  - title: 权限管理
    icon: fas fa-shield-alt
    excerpt: 内置 RBAC 权限模型，灵活控制菜单和接口访问
  - title: 代码生成
    icon: fas fa-code
    excerpt: 一键生成 CRUD 代码，减少重复劳动，专注业务逻辑
related_tag: piz
---

## 快速开始

```bash
# 克隆项目
git clone https://github.com/AriesOxO/piz.git

# 进入项目目录
cd piz

# 安装依赖并启动
mvn clean install
mvn spring-boot:run
```

## 技术栈

| 技术 | 说明 |
|------|------|
| Spring Boot | 基础框架 |
| MyBatis-Plus | ORM 框架 |
| Spring Security | 安全框架 |
| Redis | 缓存 |
| MySQL | 数据库 |

## 项目结构

```
piz
├── piz-base2          # 基础模块
├── piz-common         # 公共工具
├── piz-extraction     # 数据抽取
├── piz-log            # 日志模块
└── piz-security       # 安全模块
```

## 核心特性

### 统一响应封装

所有接口返回统一的 JSON 格式，包含状态码、消息和数据，便于前端统一处理。

### 全局异常处理

内置全局异常拦截器，自动捕获并格式化异常信息，开发环境输出详细堆栈，生产环境返回友好提示。

### 日志追踪

集成链路追踪，每个请求自动生成唯一 traceId，方便排查问题。
