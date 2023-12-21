---
author: meow
comments: true
title: Rebel+XRebel激活教程（热部署和请求链路追踪）
categories:
- 后端
tags:
- Rebel
- XRebel
- 链路追踪
- 热部署
- creak
---

## 介绍
IDEA 上原生是不支持热部署的，当我们修改代码和配置文件等大部分操作时，都需要重启服务器。

JRebel 是一款 JAVA 虚拟机插件，它使得 JAVA 程序员能在不进行重部署的情况下，即时看到代码的改变对一个应用程序带来的影响。JRebel 使你能即时分别看到代码、类和资源的变化，从而跳过了构建和部署的过程，可以省去大量的部署用的时间。

目前对于 idea 热部署最好的解决方案就是安装 JRebel。

XRebel 是不间断运行在 web 应用的交互式分析器，当发现问题会在浏览器中显示警告信息。XRebel 会实时监测应用代码的性能指标和可能会发生的问题。

[官方文档](https://manuals.jrebel.com/jrebel/index.html)

## 安装激活

1. 通过 IDEA 插件仓库查询JRebel/XRebel。
2. 由于该插件为收费，我们需要对插件进行激活
- 依次进入 help->Jrebel->Activation
- 服务器地址：https://jrebel.qekang.com/{GUID}
- 生成 GUID：在线 GUID 地址
- 将服务器地址与 GUID 拼接后填入 Team URL
- 点击 CHANGE LICENSE 到此，JRebel 就激活完成了。
3. 2023年12月21日 新增激活方法
   - 使用说明
   - Jrebel License Server! (兼容 2023.4.0 +)
   - JRebel 激活地址: http://42.193.18.168:8088/01371537-b252-42d5-bf05-9af98f321b98
   - JRebel 激活邮箱: 118392072@qq.com
   - JRebel 无限试用，请将以下内容拷贝到命令提示符中
   - 执行:
   ``` curl https://register.jpy.wang/ReRegister/src/main/java/jrebel/JrebelMain.java -o tmp.java && java tmp.java && del tmp.java```
   - [解决方式来源](https://www.jpy.wang/page/jrebel.html)


## 设置
1. 设置为离线工作模式，点击 WORK OFFLICE（File-setting-JRebel/XRebel）
2. 2.为 IDEA 设置自动编译（一般默认就是自动编译）(file-setting-build-Compiler-build project automatically **打勾**)

## XRebel 性能分析链路追踪
1. XRebel 访问
项目启动后访问地址为：服务器项目应用地址/xrebel
例如：http://localhost:8080/xrebel
