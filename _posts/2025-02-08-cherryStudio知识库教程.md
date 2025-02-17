---
author: meow
comments: true
title: deepseek搭配cherrystudio搭建本地知识库
categories:
- AI
tags:
- DeepSeek
- CherryStudio
- 知识库
---

老规矩，我们还是先来看看搭建完的知识库效果。

比如，我想让DeepSeek告诉我“吕毅是谁？”。

那么，吕毅到底是谁呢？

其实，我也不知道，他是我从网上下载的一篇网络小说里面的一个男性角色。

![](https://segmentfault.com/img/remote/1460000046073595)

那么，为了让大家更加直观地好理解，我们来做个简单的对比。

首先，我们先去官网直接提问看看，这是官方给出的答案。

看来，官方也不知道吕毅是谁（废话）。

![](https://segmentfault.com/img/remote/1460000046073596)

然后，在我们搭建完私有化知识库之后，再来提问试试。

![](https://segmentfault.com/img/remote/1460000046073597)

OK，看到了吧，这就是知识库的意义所在。

那么......科普时间到了。

## 一、什么是知识库？

知识库（Knowledge Base）是一个存储和管理知识的系统，通常包含结构化和非结构化的信息，用于帮助用户或系统快速查找和获取相关知识。

你可以把它想象成一个“知识仓库”，里面存放着各种有用的信息，比如文档、常见问题解答（FAQ）、数据库、规则、案例等。

**举个栗子：**

> 假设你是一家公司的客服人员，客户问你一个关于产品的问题。
>
> 如果你有一个完善的知识库，你可以直接在知识库中搜索相关产品的使用说明或常见问题解答，快速找到答案并回复客户。
>
> 如果没有知识库，你可能需要去问同事或查找一堆文档，效率会低很多。

那说到知识库，这里我们又不得不提到另外一个词——RAG.

然后，问题又来了，那么......

## 二、什么是RAG？

**RAG**（Retrieval Augmented Generation，检索增强生成）是一种让大语言模型（LLM）变得更聪明的方法。

简单来说，它通过给模型提供一个外部的“知识库”，让模型在回答问题时可以“查资料”，从而给出更准确、更相关的答案。

**举个栗子：**

> 想象一下，大模型就像一个学生，而RAG系统就是一本字典。
>
> 当学生遇到不懂的问题时，他可以翻开字典查找相关的解释，然后再根据字典里的内容回答问题。
>
> 这样，学生不仅能回答得更准确，还能避免“瞎编”答案。
>
> 那么，当大模型遇到不懂的问题时，他也可以查字典，也就是RAG系统。

## 三、为什么需要RAG？

1.  大模型的知识有限：大模型的知识主要来自它训练时用的数据，而这些数据是有限的，尤其是企业内部的业务知识或产品信息，模型可能完全不了解。
2.  微调成本高：如果想让大模型学习企业特定的知识，通常需要微调模型，但这不仅成本高，而且效果也不一定好。
3.  幻觉问题：大模型在不熟悉的领域可能会“瞎编”答案，这在企业应用中是不可接受的，尤其是那些需要准确信息的场景。

这里，我先贴出一个 RAG 的运作流程图。

大家看看就好。

![](https://segmentfault.com/img/remote/1460000046073598)

好了，废话不多说，接下来就带大家具体实操了，

如何用DeepSeek + Cherry Studio在本地搭建私有知识库。

![](https://segmentfault.com/img/remote/1460000046073599)

## 四、具体搭建实操步骤

### 步骤一：下载Cherry Studio可视化工具

不懂怎么操作的先去看这篇文章

### 步骤二：部署DeepSeek模型 + Embedding模型

那么，这里又分为两种方式

#### 方式一：下载去官网下载Ollama工具

**好处：** 可以实现本地部署DeepSeek模型 + Embedding模型，免费

**坏处：** 需要一定的电脑配置才行，不然模型就很鸡肋

不懂怎么操作的先去看这篇文章

#### 方式二：注册硅基流动账号

**好处：** 不用本地部署

**坏处：** 调用云端的模型服务需要一定的费用，但是也不贵。

今天我们重点介绍的是第二种方式———硅基流动+Cherry Studio 搭建本地私有知识库。

因为Cherry Studio 0.9.1更新后有一个知识库功能，

我们可以使用Cherry Studio 来实现本地知识库，帮你更好的获取需要的内容，废话不多说直接开始。

#### 大致简要步骤如下：

1.  注册硅基流动（[SiliconFlow](https://link.segmentfault.com/?enc=OaWMocaxvytTSUcwxWdYsg%3D%3D.8Y4FbB4YTCZNx%2B4HI%2BKAX5NGd002HVzwGc7EgakeoCIcr%2FjAEapg4r0kwTJNPORj)）账号，因为需要配置 Embedding（嵌入式模型），注册成功后你会获得系统赠送的14R（2000W Token）
2.  登录硅基流动（[SiliconFlow](https://link.segmentfault.com/?enc=kCfF9fDXzw94vO8EcB%2FQEQ%3D%3D.AEE5lvqtNisU8a5zeww93Yq48n9HvYyw70kBvDBJ0vKpYskI94QqohxcO2a8gAol)）平台，
3.  创建API秘钥并配置AI密钥
4.  添加DeepSeek模型 + Embedding嵌入模型
5.  创建知识库

**硅基流动官网地址：**

[https://cloud.siliconflow.cn/i/kNMFyaxB](https://link.segmentfault.com/?enc=%2BsE9sYERkC3XXa7vPcZb1g%3D%3D.bPeiHZgV%2B0d3cCku18Mw1%2FT%2FLpmRxBcJ91l%2BKlBskOUegCfh7Mdf9z353V8NVIC8)

注册账号和登录平台的步骤这里我就直接省略过了。

![](https://segmentfault.com/img/remote/1460000046073600)

这里没啥好说的。

#### 4.1、新建API秘钥，名字随便。

![](https://segmentfault.com/img/remote/1460000046073601)

![](https://segmentfault.com/img/remote/1460000046073602)

然后点击 API 秘钥会自动进行复制，

拿到API秘钥后到Cherry Studio客户端内，

点击左下角【设置】——》将复制的API秘钥填写进去即可。

![](https://segmentfault.com/img/remote/1460000046073603)

![](https://segmentfault.com/img/remote/1460000046073604)

#### 4.2、检查API密钥是否有效

点击右边的检查，会提示成功还是失败，当提示成功表示可以使用

![](https://segmentfault.com/img/remote/1460000046073605)

如果密钥有效，会提示连接成功。

![](https://segmentfault.com/img/remote/1460000046073606)

接下来就可以添加模型了。

#### 4.3、添加DeepSeek推理模型

1.  点击底部的 【管理按钮】，在模型管理服务中查找模型，点击【全部】默认就能看到；
2.  找到需要的模型，点击右侧【+】添加到我的模型。

![](https://segmentfault.com/img/remote/1460000046073607)

![](https://segmentfault.com/img/remote/1460000046073608)

![](https://segmentfault.com/img/remote/1460000046073609)

#### 4.4、添加Embeding嵌入模型

我们需要添加嵌入式模型，否者无法使用知识库功能。

1.  点击底部的 【管理按钮】，在模型管理服务中查找模型，也可以点击“嵌入模型”快速筛选；
2.  找到需要的模型，点击右侧【+】添加到我的模型。

![](https://segmentfault.com/img/remote/1460000046073610)

这里需要注意下，

BAAI/bge-m3模型是免费的，

Pro/BAAI/bge-m3模型是收费的，

区别的话官网有介绍，可以去看看，

我这里用 Pro/BAAI/bge-m3 进行演示。

![](https://segmentfault.com/img/remote/1460000046073611)

#### 4.5、 创建知识库

1.  知识库入口：在 CherryStudio 左侧工具栏，点击知识库图标，即可进入管理页面；
2.  添加知识库：点击添加，开始创建知识库；
3.  命名：输入知识库的名称并添加嵌入模型，以 Pro/BAAI/bge-m3 为例，即可完成创建。

![](https://segmentfault.com/img/remote/1460000046073612)

#### 4.6、添加文件并向量化

1.  **添加文件：** 点击添加文件的按钮，打开文件选择；
2.  **选择文件：** 选择支持的文件格式，如 pdf，docx，pptx，xlsx，txt，md，mdx 等，并打开；
3.  **向量化：** _系统会自动进行向量化处理，当显示完成时（绿色 ✓），代表向量化已完成_

![](https://segmentfault.com/img/remote/1460000046073613)

#### 4.7、添加多种来源的数据

Cherry Studio 支持多种添加数据的方式：

1.  **文件夹目录：** 可以添加整个文件夹目录，该目录下支持格式的文件会被自动向量化；
2.  **网址链接：** 支持网址url，如：[https://www.xiaoerpro.com/](https://link.segmentfault.com/?enc=SFXttmxPMkTMIKD56FJWsQ%3D%3D.rvkKr4Hn2o8gl%2F4cm8Ve44RtaRtrqIF2G5x6uhMtfgU%3D)；
3.  **站点地图：** 支持xml格式的站点地图，如：[https://www.xiaoerpro.com/sitemap.xml](https://link.segmentfault.com/?enc=iEHeIhfHpSJKpZviy%2FPZRA%3D%3D.Jps7ZnCzmGyezlStUdxCd9Q91mCZ4z9BBA8Wu096Ap%2FnCf2zIPpQ8KvKx4BQCAkt)；
4.  **纯文本笔记：** 支持输入纯文本的自定义内容。
5.  **向量化：** _当显示绿色 "√" 表示向量化完成，点击 探索知识库按钮即可开始查询_

![](https://segmentfault.com/img/remote/1460000046073614)

#### 4.8、 搜索知识库

当文件等资料向量化完成后，即可进行查询：

1.  点击页面下方的搜索知识库按钮；
2.  输入查询的内容；
3.  呈现搜索的结果；
4.  并显示该条结果的匹配分数。

![](https://segmentfault.com/img/remote/1460000046073615)

这里我随便上传一个txt来做测试，

为了做这个知识库的测试，

我还专门跑到一个小说网站下载了一篇txt格式的网络小说。

![](https://segmentfault.com/img/remote/1460000046073616)

#### 4.9、 输入关键词搜索知识库

比如，这里我输入：**”吕毅“**

![](https://segmentfault.com/img/remote/1460000046073617)

#### 4.10、 对话中引用知识库生成回复

1.  创建一个新的话题，在对话工具栏中，点击知识库，会展开已经创建的知识库列表，选择需要引用的知识库；
2.  输入并发送问题，模型即返回通过检索结果生成的答案 ；
3.  同时，引用的数据来源会附在答案下方，可快捷查看源文件。

![](https://segmentfault.com/img/remote/1460000046073618)

![](https://segmentfault.com/img/remote/1460000046073619)

OK，其实到这里其实已经差不多就完成了，

___

然后，为了更好的使用知识库，

我们还可以再新建一个 助手 下面需要填写 提示词，

提示词太长，我把链接地址放下面，自己去复制即可。

[知识库提示词](https://link.segmentfault.com/?enc=KXJycyty91zaCd0HoP2uUw%3D%3D.5jMKDtZWNR6PhDjkUIXf%2Bg5ZT1nEoc20qgAFMZMhB3q0N1EbkLCUTCnFbdOAe6XJsuZYCWLpzZophUvpqljWMhlmhHx8djWhIa1QiT9Ne1B7xgS6mnDtGHLupB9zU4VHiKhxfZR6tSx1T9kEXd426w%3D%3D)

```awk
https://github.com/richards199999/Thinking-Claude/blob/main/model_instructions/v5.1-extensive-20241201.md
```

![](https://segmentfault.com/img/remote/1460000046073621)

这里的prompt复制后，在对应的对话界面的提示词中粘贴即可。

![](https://segmentfault.com/img/remote/1460000046073622)

将提示词 粘贴进来，点击关闭后即可使用。

正常思考会很长，可以选择将代码块折叠打开，不会占用太多排版。

![](https://segmentfault.com/img/remote/1460000046073623)

![](https://segmentfault.com/img/remote/1460000046073624)

然后在 助理的聊天界面底部，将知识库打开选中，

OK，到此就大功告成，可以直接使用了。

![](https://segmentfault.com/img/remote/1460000046073625)

Cherry Studio 还有其他功能，

例如翻译，生图等，可以自己去捣鼓下。

最后，关于Token的计算，

可以看看下面这张图：

![](https://segmentfault.com/img/remote/1460000046073626)

[原文链接](https://segmentfault.com/a/1190000046073593)
