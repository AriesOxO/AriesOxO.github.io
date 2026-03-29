---
title: "fnOS 风扇控制开发日志（二）：架构设计与核心实现"
date: 2026-03-29
categories: [Python, NAS, 开发记录]
tags: [fnOS, 风扇控制, 架构设计, hwmon, sysfs, 开发日志]
description: "聊聊 fnOS-fan-control 的架构设计：为什么 sysfs 就是最好的抽象层，如何用线性插值实现平滑温控，以及 Web 管理界面的实现细节。"
---

上一篇聊了为什么要做这个项目。这一篇进入技术细节——架构怎么设计的，核心模块怎么实现的，踩了哪些坑。

<!--more-->

## 核心设计哲学：sysfs 就是抽象层

做硬件控制最容易掉进去的坑是**过度抽象**。一开始我也想过给不同芯片写 Driver 类，搞一套继承体系：

```python
# 反面教材：过度设计
class FanDriver(ABC): ...
class IT8772Driver(FanDriver): ...
class NCT6776Driver(FanDriver): ...
```

后来想明白了——Linux `hwmon` 子系统已经做了这件事。不管底层是 ITE IT8772E 还是 Nuvoton NCT6776，在 `/sys/class/hwmon/` 下看到的接口都是统一的：

```
/sys/class/hwmon/hwmonX/
├── name            # 芯片名称
├── pwm1            # PWM 值 (0-255)
├── pwm1_enable     # 控制模式 (1=手动, 2=自动)
├── fan1_input      # 转速 (RPM)
├── temp1_input     # 温度 (毫摄氏度)
└── temp1_label     # 温度标签
```

**我要做的不是再写一层抽象，而是直接用好 sysfs 这个现成的抽象层。**

### 硬件探测的实现

`hardware.py` 的核心函数 `detect_hwmon_paths()` 做的事情很简单：扫描所有 hwmon 设备，找到有 `pwm` 文件的就认为可以控制。

```python
def detect_hwmon_paths():
    """扫描 /sys/class/hwmon，返回所有可控风扇通道"""
    channels = {}
    for hwmon_dir in Path('/sys/class/hwmon').iterdir():
        # 找到所有 pwmN 文件
        for pwm_file in sorted(hwmon_dir.glob('pwm[0-9]*')):
            if pwm_file.name.endswith('_enable'):
                continue
            channel_name = pwm_file.name  # pwm1, pwm2, ...
            # 多芯片时加前缀避免冲突
            if channel_name in channels:
                chip_name = (hwmon_dir / 'name').read_text().strip()
                channel_name = f"{chip_name}_{channel_name}"
            channels[channel_name] = {
                'pwm_path': str(pwm_file),
                'enable_path': str(pwm_file) + '_enable',
                'chip': chip_name
            }
    return channels
```

这个设计的好处是**对未知芯片天然兼容**——只要内核驱动加载了，hwmon 接口就在那里，我不需要提前知道用户的硬件型号。

### 温度读取的优先级策略

CPU 温度的读取需要一点技巧。不同平台的温度 label 不一样：

| 平台 | 首选 label | 备选 |
|------|-----------|------|
| Intel | Package id 0 | Core 0 |
| AMD | Tdie | Tctl |
| ARM | cpu_thermal | thermal_zone |

代码会按优先级扫描 label，找到第一个匹配的就用。读不到就返回 `None`，由上层决定如何处理。

硬盘温度走 `drivetemp` 内核模块，安装时自动 `modprobe drivetemp`，之后硬盘温度就出现在 hwmon 里了。

## 温控核心：线性插值 + 多层保护

### 温控曲线的工作原理

用户定义一组温度-转速节点，比如：

```
30°C → 20%
50°C → 40%
65°C → 70%
80°C → 100%
```

实际温度落在两个节点之间时，用**线性插值**计算 PWM 值：

```python
def interpolate(temp, curve):
    """线性插值计算 PWM 值"""
    if temp <= curve[0]['temp']:
        return curve[0]['pwm_percent']
    if temp >= curve[-1]['temp']:
        return curve[-1]['pwm_percent']

    for i in range(len(curve) - 1):
        t0, p0 = curve[i]['temp'], curve[i]['pwm_percent']
        t1, p1 = curve[i+1]['temp'], curve[i+1]['pwm_percent']
        if t0 <= temp <= t1:
            ratio = (temp - t0) / (t1 - t0)
            return p0 + ratio * (p1 - p0)
```

这样风扇转速会随温度**平滑过渡**，不会出现突然加速的情况。

### 控制循环

`fan_controller.py` 的主循环每 N 秒（默认 2 秒）执行一次：

```
读取所有温度 → 遍历每个区域 → 根据模式计算 PWM → 写入 sysfs
```

关键设计决策：**单线程遍历所有区域**。NAS 通常只有 1-3 个风扇区域，单线程足够，避免了多线程同步的复杂度。温度数据一次读取后所有区域共享，减少 sysfs 读次数。

### 多层安全机制

这是整个项目最重要的部分。硬件控制程序如果出问题，后果可能是硬件损坏。我设计了 5 层保护：

**第一层：绝对最低转速**

```python
ABSOLUTE_MIN_PWM = 26  # 约 10%，风扇不会完全停转
```

无论用户怎么配置，PWM 值永远不会低于 26。

**第二层：温度读取失败保护**

```
连续 3 次失败 → 所有区域全速运转 (PWM=255)
连续 5 次失败 → 降级到默认保守曲线
```

宁可吵一点，也不能让硬件过热。

**第三层：PWM 写入异常保护**

写 sysfs 文件可能因为各种原因失败（驱动问题、权限问题）。连续 3 次写入失败后，该区域自动降级。

**第四层：pwm_enable 自愈**

有些 BIOS 会定期把 `pwm_enable` 从 1（手动）改回 2（自动）。控制循环每次执行时都会检查并修正这个值。

**第五层：看门狗**

主进程之外有一个独立的 Bash 看门狗进程。如果主进程意外崩溃，看门狗会在 5 秒内检测到并恢复 `pwm_enable=2`，让 BIOS 接管风扇控制。

```
正常退出：SIGTERM → cleanup() → restore_safe_state()
异常崩溃：看门狗 5s 内检测 → restore_safe_state()
卸载：uninstall 脚本 → 扫描恢复所有 pwm_enable=2
```

## Web 管理界面

### 后端：12 个 REST API

基于 Python 标准库的 `http.server`，用 `ThreadingMixIn` 支持并发请求。

```
GET  /api/status         # 实时温度、转速、PWM、模式
GET  /api/config         # 当前配置
POST /api/config         # 更新配置
GET  /api/hardware       # 硬件探测结果
POST /api/mode           # 切换运行模式
POST /api/curve/generate # 自动生成温控曲线
GET  /api/logs           # 事件日志（最近 100 条）
POST /api/auth/login     # 登录认证
```

安全方面：POST body 限制 4KB 防止滥用，可选密码认证（Cookie + Header 双模式），所有异常捕获不泄露堆栈信息。

### 前端：单文件 SPA

整个前端是一个 `index.html` 文件，约 2000 行，包含 HTML + CSS + JavaScript。

页面结构：

```
┌─ 顶部状态栏（应用名 + 运行状态指示灯）──────┐
├─ 告警条（降级/硬件未探测/连接中断）──────────┤
├─ 状态卡片 4 列（CPU温度/硬盘温度/转速/PWM）─┤
├─ 运行模式切换（4 个按钮）────────────────────┤
├─ 温控曲线（SVG 图 + 折叠编辑器）─────────────┤
├─ ▶ 高级设置（折叠面板）──────────────────────┤
├─ ▶ 运行日志（折叠面板）──────────────────────┤
└─ ▶ 使用说明（折叠面板）──────────────────────┘
```

深色主题配色：背景 `#0f1923`，卡片 `#1a2736`，强调色 `#00b4d8`。温度数字会变色：<50°C 绿色 / 50-65°C 橙色 / >65°C 红色。

交互亮点：
- 实时轮询刷新（按配置的轮询间隔）
- 连接失败时指数退避重试（上限 30 秒）
- 温控曲线 SVG 实时预览
- Toast 通知反馈操作结果

## 配置系统的设计

配置采用 JSON 格式，支持两种版本：

**v1 扁平格式**（向后兼容，单风扇场景）：

```json
{
  "mode": "auto",
  "poll_interval": 2,
  "temp_source": "cpu",
  "curve": [
    {"temp": 30, "pwm_percent": 20},
    {"temp": 80, "pwm_percent": 100}
  ]
}
```

**v2 zones 格式**（多区域场景）：

```json
{
  "zones": [
    {
      "id": "zone_cpu",
      "name": "CPU 风扇",
      "channels": ["pwm1"],
      "temp_source": "cpu",
      "mode": "auto",
      "curve": [...]
    },
    {
      "id": "zone_disk",
      "name": "硬盘风扇",
      "channels": ["pwm2"],
      "temp_source": "disk",
      "mode": "auto",
      "curve": [...]
    }
  ]
}
```

`config_manager.py` 在运行时自动将 v1 格式包装成单区域的 v2 格式，**不改写配置文件**。这样老用户升级后配置文件不变，程序内部统一用 zones 格式处理。

## 下一篇预告

最后一篇聊多设备适配的实战经验：不同芯片的坑、FPK 打包的注意事项、测试策略，以及项目的整体复盘。

---

> 项目地址：[fnOS-fan-control on GitHub](https://github.com/AriesOxO/fnOS-fan-control)（MIT 许可证）
