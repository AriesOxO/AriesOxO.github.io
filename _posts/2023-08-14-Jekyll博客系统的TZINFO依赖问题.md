---
author: meow
comments: true
title: Jekyll博客系统的TZINFO依赖问题
categories:
- blog
tags:
- 疑难杂症
- jekyll
---
# 在Windows上解决Jekyll的时区问题
我使用Jekyll这个基于Ruby的静态博客系统已经多年了。Github Pages也默认使用Jekyll。然而在Windows上使用时,突然出现了一个时区相关的问题。
## 问题
在Windows上,Jekyll无法启动,提示无法找到tzinfo依赖包的错误:
No source of timezone data could be found. (TZInfo::DataSourceNotFound)
## 原因
这个是因为缺少了Ruby时区库tzinfo及其数据源tzinfo-data。
## 解决方法
1. 删除Gemfile.lock文件
2. 在Gemfile中添加依赖包:
3.
```shell
ruby
gem 'tzinfo'
gem 'tzinfo-data'
```

3. 对于Windows系统,可以指定平台:

```shell
ruby
gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw]
```

4. 重新安装依赖包:
```shell
   bundle install
```

或者更彻底的方式:
```shell
rm Gemfile.lock
bundle install
```
## 结果
重新启动Jekyll服务就可以正常运行了:
bundle exec jekyll serve
所以,当Jekyll在Windows上出现时区问题时,通常是缺少了某些依赖,添加相关的Ruby库就可以解决。
## 参考文章
[Jekyll on Windows时区设置问题](https://zhuanlan.zhihu.com/p/495889464)


