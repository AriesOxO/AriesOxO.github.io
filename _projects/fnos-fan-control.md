---
layout: project
title: fnos-fan-control
tagline: "飞牛NAS 风扇控制器 — 自定义温控曲线、多模式控制、Web 管理界面"
description: "飞牛NAS (fnOS) 的 FPK 风扇控制应用，支持四种运行模式、自定义温控曲线、多风扇区域独立控制、Web 深色主题管理界面，纯 Python 零依赖。"
repo: https://github.com/AriesOxO/fnos-fan-control
status: active
version: v1.1.1
tags: [Python, NAS, fnOS, 硬件控制]
color: "#19be6b"
order: 2
features:
  - title: 四种运行模式
    icon: fas fa-sliders-h
    excerpt: 默认/自动/手动/全速，灵活切换满足不同场景需求
  - title: 自定义温控曲线
    icon: fas fa-chart-line
    excerpt: 2~10 节点精细控制，自动生成 + 手动微调，SVG 实时预览
  - title: 多层安全防护
    icon: fas fa-shield-alt
    excerpt: 看门狗、异常降级、pwm_enable 自愈、最低 10% 转速保护
  - title: Web 管理界面
    icon: fas fa-desktop
    excerpt: 深色主题、实时监控、响应式布局，支持密码认证
related_tag: fnos-fan-control
---

## 解决什么问题？

飞牛NAS 默认的风扇策略往往不够灵活：低负载时噪音大，高负载时散热不积极。**fnos-fan-control** 让你完全掌控风扇行为——从保守到激进，从固定转速到智能曲线，一个 FPK 应用搞定。

## 下载安装

### 最新版本下载

| 版本 | 下载 | 说明 |
|------|------|------|
| **v1.1.1**（推荐） | [fan-control-1.1.1.fpk](https://github.com/AriesOxO/fnos-fan-control/releases/download/v1.1.1/fan-control-1.1.1.fpk) | 修复安装和启动问题 |

> 历史版本请前往 [GitHub Releases](https://github.com/AriesOxO/fnos-fan-control/releases) 页面查看。

### 安装前提

- **飞牛NAS (fnOS)** x86 平台
- **Python 3.11+**：在飞牛应用中心搜索 `python312` 并安装

### 安装步骤

**第一步：下载 FPK 安装包**

点击上方下载链接，保存 `.fpk` 文件到本地。

**第二步：上传安装**

打开飞牛管理界面 → 应用中心 → 点击右上角「手动安装」→ 上传 `.fpk` 文件。

**第三步：配置密码（可选）**

安装向导中会提示设置访问密码。如果不需要密码认证，留空即可。

**第四步：访问管理界面**

安装完成后，在飞牛桌面点击应用图标，或直接访问：

```
http://你的NAS地址:端口
```

端口号在安装完成后会显示。

### 命令行安装（高级）

```bash
# 通过 CLI 安装
appcenter-cli install-fpk fan-control-1.1.1.fpk -v 1
```

### 卸载与重装

如果安装时提示"检查用户组失败"，以 root 执行清理脚本：

```bash
# 清理脚本随应用安装自动释放到 /tmp
bash /tmp/cleanup-fan-control.sh
```

如果服务器重启过导致脚本丢失，手动执行：

```bash
userdel fan-control 2>/dev/null
groupdel fan-control 2>/dev/null
for vol in $(ls -d /vol* 2>/dev/null); do
  for dir in @appconf @appdata @apphome @appmeta @apptemp @appcenter; do
    rm -rf "$vol/$dir/fan-control"
  done
done
rm -rf /var/apps/fan-control
```

清理完成后重新上传安装即可。

### 自行打包

```bash
git clone https://github.com/AriesOxO/fnos-fan-control.git
cd fnos-fan-control

# 上传到 fnOS 服务器打包
scp -r src/ user@nas:/tmp/fpk-src/
ssh user@nas 'cd /tmp/fpk-src && fnpack build'
```

## 使用教程

### 运行模式详解

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **默认模式** | 内置保守温控曲线，低温安静、高温积极散热 | 日常使用，安装后默认选择 |
| **自动模式** | 用户自定义温控曲线，2-10 节点精细控制 | 进阶玩家，精确调校散热策略 |
| **手动模式** | 固定转速百分比，滑块调节 | 特定工况，需要恒定风量 |
| **全速模式** | 所有风扇 100% 转速 | 紧急散热，清灰测试 |

### 自定义温控曲线

温控曲线是 **fnos-fan-control** 的核心功能，让你精确定义「什么温度对应多少转速」。

**自动生成曲线：**

1. 在 Web 管理界面选择「自动模式」
2. 点击「编辑曲线」展开编辑器
3. 选择节点数（2-10 个）和温度范围
4. 点击「自动生成」— 系统自动生成低温平缓、高温陡峭的智能曲线
5. 点击「保存」，编辑器自动收拢

**手动微调曲线：**

1. 展开曲线编辑器
2. 直接修改每个节点的温度值和对应的转速百分比
3. SVG 图表**实时预览**调整效果
4. 满意后点击「保存」

**曲线设计建议：**

| 温度区间 | 建议转速 | 说明 |
|---------|---------|------|
| < 40°C | 10-20% | 低负载安静运行 |
| 40-55°C | 20-40% | 日常使用，轻微散热 |
| 55-70°C | 40-70% | 中等负载，积极散热 |
| > 70°C | 70-100% | 高负载，全力散热 |

### 多风扇区域控制

如果你的 NAS 有多个风扇，可以为每个风扇区域独立配置：

- **独立绑定 PWM 通道** — 每个区域指定控制哪个物理风扇
- **独立选择温度来源** — CPU 温度、主板温度等
- **独立温控曲线** — 不同位置的风扇可以用不同策略

### 密码认证

安装时可设置访问密码，支持两种认证方式：

- **Cookie 模式** — 浏览器登录后自动保持会话
- **Header 模式** — API 调用时在请求头传入密码，便于自动化集成

## 安全机制

系统设计以**绝不让风扇停转**为底线，实现了六重安全保障：

| 机制 | 触发条件 | 处理方式 |
|------|---------|---------|
| 最低转速保护 | 始终生效 | 绝对下限 10%，任何模式都不会低于此值 |
| 温度读取失败保护 | 连续 3 次读取失败 | 立即全速运转 |
| 温度持续失败降级 | 连续 5 次读取失败 | 降级到默认模式 |
| PWM 写入失败降级 | 连续 3 次写入失败 | 自动降级 |
| pwm_enable 自愈 | 每个控制周期 | 自动校验并修正芯片控制寄存器 |
| 看门狗 | 主进程崩溃 | 5 秒内恢复安全状态 |

## 兼容性

### 支持的主板芯片

通用 hwmon 探测，**任何有 `pwm` 文件的芯片均可控制**：

| 芯片系列 | 已验证型号 |
|---------|-----------|
| ITE | IT8772E（开发测试机型）、IT8786E、IT8688E |
| Nuvoton | NCT6775、NCT6776、NCT6779、NCT6798、NCT6687 |
| Fintek | F71882FG、F71868A |
| 其他 | 有 pwm 文件的 hwmon 芯片均可 |

### CPU 温度传感器

| 平台 | 驱动 | 智能匹配策略 |
|------|------|-------------|
| Intel | coretemp | 优先 Package id 0 |
| AMD Ryzen | k10temp | 优先 Tdie，回退 Tctl |
| AMD (第三方) | zenpower | 优先 Tdie |
| ARM / 通用 | cpu_thermal | temp1_input |

## REST API

提供完整的 HTTP API，便于自动化集成和二次开发：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 实时状态（温度、转速、PWM、模式、区域） |
| `/api/config` | GET / POST | 读取 / 更新配置 |
| `/api/hardware` | GET | 硬件探测结果（芯片、传感器） |
| `/api/mode` | POST | 切换运行模式（可指定区域） |
| `/api/curve/generate` | POST | 自动生成温控曲线 |
| `/api/zones/{id}/mode` | POST | 切换指定区域模式 |
| `/api/zones/{id}/config` | POST | 更新指定区域配置 |
| `/api/logs` | GET | 获取事件日志 |
| `/api/auth/login` | POST | 密码认证登录 |

## 更新日志

### v1.1.1（最新）
- 修复 manifest URL 尖括号导致应用中心安装失败
- 修复 v2 配置格式下启动崩溃
- 移除设置界面多余配置项

### v1.0.1
- 多设备适配：通用 hwmon 探测，支持 ITE/Nuvoton/Fintek 全系列
- 多风扇区域独立控制
- 温控曲线编辑器优化：折叠/展开、节点摘要标签
- 默认模式改为保守曲线
- GitHub Actions 自动构建 FPK

### v1.0.0
- 首个正式版本

## 技术指标

| 指标 | 数据 |
|------|------|
| 开发语言 | Python 3.11+（零外部依赖，仅标准库） |
| 内存占用 | ≤ 15MB |
| 自动化测试 | 120 个（配置/硬件/控制/API/认证/多区域） |
| CI | GitHub Actions 自动构建 FPK |
| 许可证 | MIT |
