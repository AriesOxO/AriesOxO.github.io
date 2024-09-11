---
author: meow
comments: true
date: 2022-11-14 14:37:38+00:00
link: http://121.40.199.110/index.php/2022/11/14/spring-%e5%a6%82%e4%bd%95%e8%a7%a3%e5%86%b3%e5%be%aa%e7%8e%af%e4%be%9d%e8%b5%96%ef%bc%9f/
slug: spring-%e5%a6%82%e4%bd%95%e8%a7%a3%e5%86%b3%e5%be%aa%e7%8e%af%e4%be%9d%e8%b5%96%ef%bc%9f
title: Spring 如何解决循环依赖？
wordpress_id: 56
categories:
- 编程
tags:
- Spring
- 循环依赖
- 转载
---




### 什么是循环依赖？







说白是一个或多个对象实例之间存在直接或间接的依赖关系，这种依赖关系构成了构成一个环形调用。









  * 第一种情况：自己依赖自己的直接依赖





  * 第二种情况：两个对象之间的直接依赖





  * 第三种情况：多个对象之间的间接依赖





![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8f2dfff5cc33458793a6f3a567ab8b0a~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)





### 循环依赖的场景





![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0cb25fbcece748ac85c67301e5517761~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)





    <code>单例的setter注入：

    @Service
    public class TestService1 {

        @Autowired
        private TestService2 testService2;

        public void test1() {
        }
    }

    @Service
    public class TestService2 {

        @Autowired
        private TestService1 testService1;

        public void test2() {
        }
    }
    这是一个经典的循环依赖，但是它能正常运行，得益于spring的内部机制，
    让我们根本无法感知它有问题，因为spring默默帮我们解决了。

    复制代码</code>







Spring内部有三级缓存：









  * singletonObjects 一级缓存，用于保存实例化、注入、初始化完成的bean实例





  * earlySingletonObjects 二级缓存，用于保存实例化完成的bean实例





  * singletonFactories 三级缓存，用于保存bean创建工厂，以便于后面扩展有机会创建代理对象。





![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7484352021da4bf48db9b6d782faf404~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)





### 如何解决循环依赖





![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a07d8151c180499ab128e0d16cd0848c~tplv-k3u1fbpfcp-zoom-in-crop-mark:4536:0:0:0.awebp?)





#### 生成代理对象产生的循环依赖







这类循环依赖问题解决方法很多，主要有：









  1. 使用@Lazy注解，延迟加载





  2. 使用@DependsOn注解，指定加载先后关系





  3. 修改文件名称，改变循环依赖类的加载顺序







#### 使用@DependsOn产生的循环依赖







这类循环依赖问题要找到@DependsOn注解循环依赖的地方，迫使它不循环依赖就可以解决问题。







#### 多例循环依赖







这类循环依赖问题可以通过把bean改成单例的解决。







#### 构造器循环依赖







这类循环依赖问题可以通过使用@Lazy注解解决。







作者：刷刷面试
链接：https://juejin.cn/post/7077764263493779464
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。



