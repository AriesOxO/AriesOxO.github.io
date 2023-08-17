---
author: meow
comments: true
title: 关闭vue项目中Uncaught runtime errors
categories:
- 前端
tags:
- vue
---
## 解决方法
- 在vue.config.js中添加如下配置即可解决

```js
module.exports = defineConfig({
	...
	devServer: {
    client: {
      overlay: false
    }
  }
})

```
[参考网站](https://webpack.docschina.org/configuration/dev-server/#overlay)

