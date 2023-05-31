---
author: meow
comments: true
date: 2023-01-09 08:09:16+00:00
layout: post
link: http://121.40.199.110/index.php/2023/01/09/pandownload-%e5%8a%a0%e9%80%9f%e8%84%9a%e6%9c%ac%e5%88%b6%e4%bd%9c/
slug: pandownload-%e5%8a%a0%e9%80%9f%e8%84%9a%e6%9c%ac%e5%88%b6%e4%bd%9c
title: Pandownload 加速脚本制作
wordpress_id: 132
categories:
- 编程
tags:
- pandownload
- 百度云盘
---

如何制作百度网盘不限速接口
自制 Pandownload 接口适用于一个会员账户可多人共享下载不限速特权，无需登录，下载可直接轻松跑满带宽！
保姆级教程，大家跟着操作一遍即可学会
自制需要准备东西：
一个百度网盘会员账户
百度网盘获取 Cookie 工具
脚本生成器 v1.7
会员账号需要各位自行准备，但软件和工具我都有给大家准备好
![](https://img-blog.csdnimg.cn/img_convert/c1fcbe9b79a845812f8967b1d064fcd8.png)



# 1.1 自动获取 Cookie



首先打开文件夹"百度网盘获取 Cookie 工具"，找到文件夹内的“百度网盘获取 Cookie 工具.exe”，打开此软件
点击左上角的“开启”，开启后此软件会自动抓取制作者的网盘 Cookie
![](https://img-blog.csdnimg.cn/img_convert/65ece18377bc5e80e52a0e4ae1aeb84b.png)
开启后，请切记不要关闭此软件，将其最小化放置在后台即可
![](https://img-blog.csdnimg.cn/img_convert/081182db2c648eadf5e8da4578253e9f.png)



# 1.2 登录网盘



Cookie 工具打开后，需要电脑登录百度网盘软件，最好是百度网盘软件，登录网页端的方法此文暂时不介绍
找到“设置”按钮
![](https://img-blog.csdnimg.cn/img_convert/a55c9f43f8e25f42532cbd9fb57b22ee.png)
点击设置进去，选择“传输”，找到“其他设置”
![](https://img-blog.csdnimg.cn/img_convert/35382747a6f8f5626e23226ef860f7d4.png)
进入“其他设置”后，将其“代理模式”更改为“使用 IE 代理”，然后点击确定
![](https://img-blog.csdnimg.cn/img_convert/4de3975e26ef73a27188e5008a4d0c55.png)
此时在一直打开着的“百度网盘获取 Cookie 工具”上即可看到被记录和抓取的 Cookie
![](https://img-blog.csdnimg.cn/img_convert/ed26c03de84e6fe458563fe5efe16ffb.png)
如果没有被及时抓取到 Cookie，多重复几遍“更换代理模式”的步骤即可



# 1.3 脚本制作



打开我为大家提供的“脚本生成器 v1.7_GUI.exe“软件
![](https://img-blog.csdnimg.cn/img_convert/f17a2a031a5e311d8808087069d24247.png)

然后将我们已经抓取到的 cookie 复制进脚本制作器内，让脚本制作器帮我们生成脚本
![](https://img-blog.csdnimg.cn/img_convert/22f14107d987681ff22c9782c496e1fe.png)

以下两栏可自定义（不影响脚本正常使用）：
![](https://img-blog.csdnimg.cn/img_convert/63a1827328a60ac6d8634b18210d8226.png)

接口的标题为对应为：脚本的文件名
输入接口的简介对应为：在 Pandownload 软件内展示的接口名

其余需要复制粘贴至脚本制作器，注意不要粘贴错栏了

都复制粘贴完成后，点击“点我制作！”
![]（https://img-blog.csdnimg.cn/img_convert/3022a82901469a493c0e03a9270373d5.png）

此时你的脚本接口就会被自动生成在“我的脚本”文件夹内，一个全新的不限速接口也算是诞生了！



# 1.4 不限速接口配置到 Pandownload



接口制作好以后，我们将对应的接口上传到 Pandownload 软件内即可
将接口放在下方文件夹内（注意不要放错了地方） ：Pandownload\PanData\script\default



# 1.5 软件测试



制作好的软件可以自行检测一番，看看是否可用，小资源自制的接口速度如下：
![](https://img-blog.csdnimg.cn/img_convert/a649e5e2fd1cf13105a5660a0de8cc08.gif)

不限速脚本制作工具合集
链接：https://ziyuanhuishequ.lanzoui.com/inkllr1m12d
解压密码：zyhsq
