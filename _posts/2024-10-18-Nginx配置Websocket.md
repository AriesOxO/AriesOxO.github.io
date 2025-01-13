---
author: meow
comments: true
title: Nginx配置Websocket
categories:
  - 后端
tags:
  - SOAP
  - Spring Boot
  - nginx
---

WebSocket
和HTTP虽然是不同协议，但是两者“握手”方式兼容。通过HTTP升级机制，使用HTTP的Upgrade和Connection协议头的方式可以将连接从HTTP升级为WebSocket。
![](https://img2023.cnblogs.com/blog/840264/202311/840264-20231121172052241-1621700856.png)
Websocket 使用 ws 或 wss 的统一资源标志符，类似于 HTTPS，其中 wss 表示在 TLS 之上的
Websocket。如：

```bash
ws://example.com/wsapi wss://secure.example.com/
```

Websocket 使用和 HTTP 相同的 TCP 端口，可以绕过大多数防火墙的限制。默认情况下，Websocket
协议使用 80 端口；运行在 TLS 之上时，默认使用 443 端口。

一个典型的Websocket握手请求如下：

客户端请求：

```makefile
GET / HTTP/1.1 Upgrade: websocket Connection: Upgrade Host: example.com Origin: http://example.com Sec-WebSocket-Key: sN9cRrP/n9NdMgdcy2VJFQ== Sec-WebSocket-Version: 13
```

服务器回应：

```makefile
HTTP/1.1 101 Switching Protocols Upgrade: websocket Connection: Upgrade Sec-WebSocket-Accept: fFBooB7FAkLlXgRSz0BT3v4hq5s= Sec-WebSocket-Location: ws://example.com/
```

关键点：

- Connection 必须设置 Upgrade，表示客户端希望连接升级。
- Upgrade 字段必须设置 Websocket，表示希望升级到 Websocket 协议。

知识点参考：[《HTML5 WebSocket》](https://www.runoob.com/html/html5-websocket.html)

#### 一、对wss与nginx代理wss的理解:

1、wss协议实际是websocket +SSL，就是在websocket协议上加入SSL层，类似https(
http+SSL)。
2、利用nginx代理wss【通讯原理及流程】

1. 客户端发起wss连接连到nginx
2. nginx将wss协议的数据转换成ws协议数据并转发到Workerman的websocket协议端口
3. Workerman收到数据后做业务逻辑处理
4. Workerman给客户端发送消息时，则是相反的过程，数据经过nginx/转换成wss协议然后发给客户端

#### 二、Nginx配置Websocket参数

##### 示例一：某站点或域名下面代理配置

```perl
server { listen 80; server_name 域名; proxy_http_version 1.1; …… #启用支持websocket连接的配置 proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; location / { proxy_redirect off; proxy_pass http://myweb_backend; proxy_connect_timeout 60; proxy_read_timeout 600; proxy_send_timeout 600; } }
```

重要的是这两行，它表明是websocket连接进入的时候，进行一个连接升级将http连接变成websocket的连接。
启用支持websocket连接：
proxy\_set\_header Upgrade $http\_upgrade;

proxy\_set\_header Connection "upgrade";
proxy read timeout 表明连接成功以后等待服务器响应的时候，如果不配置默认为60s;
proxy\_http\_version 1.1;表明使用http版本为1.1

##### 示例二：全部站点或全部服务的代理配置

上面的配置将websocket写到某个server里了。实际项目上nginx代理的可能是多个站点，多个服务，这就需要统一设置一下。另外对于低版本nginx的配置不支持"
upgrade"参数的情况下可以这样写：
首先在nginx的全局块（一般是http块）里面加上websocket的参数映射

```dart
http { include mime.types; default_type text/html; charset utf-8; log_format proxy '$http_x_real_ip - $remote_user [$time_local] "$request" ' '$status $body_bytes_sent "$http_referer" ' '"$http_user_agent" "$http_x_forwarded_for" $request_time $upstream_response_time'; access_log /dev/stdout proxy; sendfile on; tcp_nopush on; tcp_nodelay on; keepalive_timeout 75; keepalive_requests 1000; client_max_body_size 1020000M; client_body_buffer_size 256k; large_client_header_buffers 4 128k; client_header_buffer_size 32k; server_names_hash_max_size 512; server_names_hash_bucket_size 128; #注意，必须加下面这段websocket的参数映射 map $http_upgrade $connection_upgrade { default upgrade; '' close; } include /etc/nginx/conf.d/*.conf; }
```

这里重要的是这四行：
注意，必须加下面这段websocket的参数映射
map httpupgradeconnection\_upgrade {
default upgrade;
'' close;
}

然后在你的server或者location块里面加上这两行即可：

```perl
server { listen 80; server_name 域名; proxy_http_version 1.1; …… #注意，必须加下面这段websocket的配置 proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection $connection_upgrade; location / { proxy_redirect off; proxy_pass http://myweb_backend; proxy_connect_timeout 60; proxy_read_timeout 600; proxy_send_timeout 600; } }
```

- 示例一和示例二配置一种就行。

#### 状态码说明

注意：因为websocket是长连接，请求过程不关闭的所以一般连接状态码是101（请求者已要求服务器切换协议，服务器已确认并准备切换。）

CloseEvent接口的代码只读属性返回WebSocket连接关闭代码，指示服务器关闭连接的原因。
值：一个整数的WebSocket连接关闭范围为1000-4999的代码，指示服务器关闭连接的原因。
websocket连接关闭状态码：
[https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)

#### 不支持websocket协议现象说明

网页控制台报错现象:
1）现象一：网页控制台报"WebSocket connection to 'ws://' failed：<无报错信息>"
2）现象二：网页控制台报"WebSocket connection to 'ws://' failed：Error during
WebSocket handshake: Unexpected response code: 400"
3）现象三：网页控制台报"WebSocket connection to 'ws://' failed：The request timed
out.

问题原因与处理方法：
1.代理/防火墙对访问端口只开通了http协议，未支持websocket协议。可以将代理/防火墙的7层转发改为4层转发，确认是否为websocket协议/长连接的支持问题。
2.代理nginx未支持websocket协议转发，检查nginx配置文件中的Upgrade和Connection配置。

【完】

[原文链接](https://www.cnblogs.com/xiongzaiqiren/p/Nginx_Websocket.html)
