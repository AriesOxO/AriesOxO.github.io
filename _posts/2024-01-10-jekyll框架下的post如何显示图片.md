---
author: meow
comments: true
title: jekyll框架下的post如何显示图片
categories:
- 前端
tags:
- jekyll
- blog
---

1. 本地资源直接使用绝对路径解决

```vue
![图片pic1]({{ "/assets/images/test.jpg" | absolute_url }})
```
