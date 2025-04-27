---
author: meow
comments: true
title: JetBrains新版本区域选择的坑
categories:
- 后端
tags:
- ja-netfilter
- IDEA
- jetbrains
---

JetBrains新版本(2024.2)在设置里添加了区域选择，具体在：`Appearance & Behavior` -> `System Settings` -> `Language and Region` -> `Region` 中设置。如果你选择 `China Mainland` 将会有一个比较坑的地方：激活许可验证走 `account.jetbrains.com.cn` 这个域名，而不是默认的 `account.jetbrains.com` 。
这将导致一个问题：热佬的整合包里，没有对这个域名的拦截，会联机然后发现许可被吊销。

热佬可能打仗太忙，尚未发布新包。不过这个问题解决起来也很简单，找到你的jetbra目录，编辑 `config-jetbrains\url.conf` 文件，新增以下内容保存即可：

```
[URL]
PREFIX,https://account.jetbrains.com.cn/lservice/rpc/validateKey.action
```
也就是把新的域名也拦截咯。

[原文链接](https://zhile.io/2024/09/05/jetbrains-2024-2-region.html#more-669)
