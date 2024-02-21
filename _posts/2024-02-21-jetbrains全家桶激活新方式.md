---
author: meow
comments: true
title: 最新jetbrains全家桶及phpstorm激活方法支持全系列全版本支持更新永久有效
categories:
- 工具
tags:
- jetbrains
- Activate
- IDE
---

## 方式一 通过censys
- https://search.censys.io/
- 主要用到的代码

```java

services.http.response.headers.location: account.jetbrains.com/fls-auth

```
- 我们复制上面用到的代码进入censys进行搜索。可以看到出现了很多对应跳转到 jetbrains 的服务器IP和网址,我们随便点击一个看下状态是不是 302 只有 302 的才能 正常使用 。
- 　然后我们复制域名或者IP到jetbrains全家桶进行激活（复制到 License server）。先点“Test ConnectTion” 测试链接，链jetbrains授权服务器成功了,然后我们点击 ACTIVATE 进行启动就可以了。

## 方式二 通过shodan
 - https://www.shodan.io/
 - 主要用到的代码

```java

Location: https://account.jetbrains.com/fls-auth

```

## 激活原理
- 通过以上方式激活 jetbrains全家桶 主要是用到了 爬取网站服务 这一类的 搜索引擎 实现的通过 搜索引擎 我们找到全世界的 jetbrains授权服务器 进行激活

## 注意事项

- 每个服务器IP承载激活的数量优先, 如果激活时候提示失败,可以多换几个.
- 本文章仅用于学习研究勿用于非法.
- 请支持正版

[原文链接](https://www.lmcc.top/articles/485.html)


