什么？网络条件差劲打洞不成功？还有多的服务器？那就来自建 Zerotier 的 Moon 中转吧～

关于 Zerotier 的使用可以参见之前的一篇文章 [使用 ZeroTier 进行 Minecraft 多人联机](https://blog.isteed.cc/post/multiplayer-with-zerotier/)

## 自建 Moon 中转

有多的服务器的话，可以试试自建 Moon（中转），来解决朋友网络条件差劲死活互联不了的情况

正常情况下，如果无法打洞直接互联的话，流量会通过 ZeroTier 官方提供的 Plant 来传输（延迟会特高，还容易断流，毕竟大陆内外之间各种干扰阻断嘛……

以我服务器的 Debian 为例（其它系统也是差不多的操作）

## 安装 ZeroTier

```
<span>curl -s https://install.zerotier.com | sudo bash</span><br>
```

## 加入网络

```
<span>zerotier-cli <span>join</span> &lt;Network ID&gt;</span><br>
```

## 生成 Moon 配置文件

```
<span><span>cd</span> /var/lib/zerotier-one</span><br><span>zerotier-idtool initmoon identity.public &gt; moon.json</span><br>
```

## 编辑 Moon 配置文件

```
<span><span>{</span></span><br><span>  <span>"id"</span><span>:</span> <span>"96******8c"</span><span>,</span></span><br><span>  <span>"objtype"</span><span>:</span> <span>"world"</span><span>,</span></span><br><span>  <span>"roots"</span><span>:</span> <span>[</span></span><br><span>    <span>{</span></span><br><span>      <span>"identity"</span><span>:</span> <span>"96******8c:0:******"</span><span>,</span></span><br><span>      <span>"stableEndpoints"</span><span>:</span> <span>[</span><span>]</span></span><br><span>    <span>}</span></span><br><span>  <span>]</span><span>,</span></span><br><span>  <span>"signingKey"</span><span>:</span> <span>"signingKey"</span><span>,</span></span><br><span>  <span>"signingKey_SECRET"</span><span>:</span> <span>"signingKey_SECRET"</span><span>,</span></span><br><span>  <span>"updatesMustBeSignedBy"</span><span>:</span> <span>"updatesMustBeSigned"</span><span>,</span></span><br><span>  <span>"worldType"</span><span>:</span> <span>"moon"</span></span><br><span><span>}</span></span><br>
```

然后用编辑这个文件，把 `"stableEndpoints": [ ]` 改为 `"stableEndpoints": [ "服务器的公网 IP/9993" ]` 后保存

id 字段即为 Moon 节点 ID，后续入轨需要用到的

## 创建 Moon 文件

```
<span>zerotier-idtool genmoon moon.json</span><br>
```

终端会打印创建的信息，比如 `wrote 00000096******8c.moon (signed world with timestamp 1709449863165)`

然后再创建 Moon 自启文件夹 `moons.d`，把生成的 `00000096******8c.moon` 文件复制进去（其中，文件名除去前头的零即为 Moon 节点 ID，后续入轨需要用到的

最后用命令 `systemctl restart zerotier-one` 重启服务器上的 Zerotier 就可以正常使用 Moon 了

如果云服务器厂商有防火墙规则，记得去添加一下规则，0.0.0.0/0 任意 IP 流量，允许 9993 端口的所有 UDP 流量

## 加入 Moon

直接终端键入即可加入

```
<span>zerotier-cli orbit &lt;Moon 节点 ID&gt; &lt;Moon 节点 ID&gt;</span><br>
```

或者将生成的 `00000096******8c.moon` 文件复制到需要加入的那个客户端对应的 `moons.d` 文件夹中（没有就自己新建文件夹）

-   Linux: `/var/lib/zerotier-one/moons.d/`
-   macOS: `/Library/Application Support/ZeroTier/One/zerotier-one/moons.d/`
-   Windows: `C:\ProgramData\ZeroTier\One\moons.d\`

目前 Android 和 iOS 的官方客户端不支持入轨的操作

Android 可以使用第三方客户端 [ZerotierFix](https://cors.isteed.cc/https://github.com/kaaass/ZerotierFix/releases/download/1.0.10/app-release.apk) 来入轨，其 GitHub 开源地址为 [kaaass/ZerotierFix](https://github.com/kaaass/ZerotierFix)

iOS 目前的话暂无第三方客户端，但可以通过直接用代理连接到服务器来「曲线救国」（

## 碎碎念

（联机是没有联了，组网是玩起来了……

## 参考

-   [Creating Your Own Roots (a.k.a. Moons)](https://docs.zerotier.com/roots#creating-your-own-roots-aka-moons)
-  [转载原文来源](https://blog.isteed.cc/post/zerotier-create-own-moons/)
