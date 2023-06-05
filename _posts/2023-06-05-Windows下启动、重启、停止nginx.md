---
author: meow
comments: true
title: Windows下启动、重启、停止nginx
wordpress_id: 260
categories:
- 前端开发
tags:
- Nginx
---
在Windows下操作nginx，需要打开cmd 进入到nginx的安装目录下

## 1.启动nginx:

start nginx 或 nginx.exe

## 2.停止nginx
(stop是快速停止nginx，可能并不保存相关信息；quit是完整有序的停止nginx，并保存相关信息)
nginx.exe  -s stop 或 nginx.exe -s quit

## 3.检查 重启：

1. nginx -t  修改nginx配置后执行检查配置是否正确
2. nginx -s reload 重启

---
