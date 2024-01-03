---
author: meow
comments: true
title: windows下jenkins自动构建部署
categories:
- 后端
tags:
- windows
- jenkins
- CI/CD
- 自动化
---
## jenkins以及教程

   - 官网：https://www.jenkins.io/
   - 官方文档说明：https://www.jenkins.io/doc/
   - 安装教程推荐:https://www.cnblogs.com/rmxd/p/11609983.html
   - github WebHook配置参考：https://blog.csdn.net/eyeofeagle/article/details/100577289

## 主要插件安装
1. Generic Webhook Trigger Plugin
2. Maven Integration plugin

## Post Steps 配置
1. 勾选-"Run only if build succeeds" -"Execute Windows batch command"选项
2. 启动脚本start.bat

```shell
@echo off
setlocal enabledelayedexpansion

for %%i in (*.jar) do (
    set "filename=%%i"
    echo 找到JAR文件：!filename!
    echo 运行 !filename!
    start javaw  -Xms512M -Xmx1024M -Dhudson.util.ProcessTree.disable=true -jar -Dfile.encoding=utf-8 !filename!
)
exit

```

3. 停止脚本stop.bat

```shell

@echo off
for /f "tokens=5" %%i in ('netstat -aon ^| findstr ":实际程序的端口"') do (
    set n=%%i
)
taskkill /f /pid %n%

```

4. "Execute Windows batch command"内容

```shell

@echo on & setlocal EnableDelayedExpansion
rem jar包路径
set TARGET_PATH=C:\ProgramData\Jenkins\.jenkins\workspace\xxx\xxxx-xx\target
rem 运行部署路径
set BIN_BATH=D:\dev
rem 文件名
SET JAR_FILE=test.jar
rem 停止原服务
start %BIN_BATH%\stop.bat /b
rem 复制源jar到运行环境
COPY %TARGET_PATH%\%JAR_FILE% %BIN_BATH%
rem 进入启动目录
cd  /d %BIN_BATH%
start start.bat

```
## 实际效果
提交代码之后，代码仓库通过webhook链接地址发生消息停止jenkins,拉取最新的代码进行构建，构建成功之后执行脚本，执行stop结束之前的程序，然后复制新的jar包到运行目录，启动。







