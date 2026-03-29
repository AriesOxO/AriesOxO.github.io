---
title: "fnOS 风扇控制开发日志（三）：多设备适配、测试策略与项目复盘"
date: 2026-03-29
categories: [Python, NAS, 开发记录]
tags: [fnOS, 风扇控制, 测试, FPK, 多设备适配, 开发日志]
description: "fnOS-fan-control 开发日志最终篇：多芯片适配的实战经验、120 个测试用例的策略、FPK 打包踩坑记录，以及从零到 v1.1.0 的完整复盘。"
---

系列最后一篇，聊聊多设备适配的实战、测试策略、FPK 打包，以及整个项目的复盘总结。

<!--more-->

## 多设备适配：芯片差异与统一方案

### 支持的芯片家族

经过测试和社区反馈，目前兼容的芯片包括：

| 芯片家族 | 常见型号 | 典型机型 |
|---------|---------|---------|
| ITE | IT8772E, IT8786E, IT8688E | 飞牛 F2 Pro 等 |
| Nuvoton | NCT6776, NCT6775, NCT6798 | 部分第三方 NAS |
| Fintek | F71882FG, F71868A | 老款主板 |
| ARM | cpu_thermal | ARM 架构 NAS |

### 踩过的坑

**坑 1：pwm_enable 的值在不同芯片上含义不完全一致**

大多数芯片：`1` = 手动控制，`2` = 自动（BIOS 控制）。但个别芯片还有 `0`（全速）、`3`（温控曲线）等值。

解决方案：统一使用 `pwm_enable=1` 进入手动模式，退出时统一恢复为 `2`。不依赖芯片特有的自动模式。

**坑 2：多芯片时通道名冲突**

两块芯片都有 `pwm1`，直接用名字会冲突。解决方案是检测到冲突时自动加芯片名前缀：

```
chip0: it8772e → it8772e_pwm1
chip1: nct6776 → nct6776_pwm1
```

**坑 3：BIOS 会抢回风扇控制权**

某些 BIOS 会定期把 `pwm_enable` 从 1 改回 2。如果不处理，用户会发现风扇控制「时灵时不灵」。

解决方案：每个控制周期开始前先检查 `pwm_enable`，如果被改了就改回来。这就是前面提到的「pwm_enable 自愈」机制。

### 多区域控制的实现

多区域的核心思想是：**每个风扇区域独立运行，互不干扰**。

```
区域 A（CPU 风扇）：绑定 pwm1，跟踪 CPU 温度，使用激进曲线
区域 B（硬盘风扇）：绑定 pwm2，跟踪硬盘温度，使用保守曲线
```

实现上，控制循环每次迭代：
1. 一次性读取所有温度（CPU + 硬盘）
2. 遍历每个区域，根据区域配置的温度来源取对应温度
3. 按区域自己的模式和曲线计算 PWM
4. 写入对应的 sysfs 文件

区域级降级也是独立的——区域 A 的 PWM 写入失败不影响区域 B。

## 测试策略：120 个测试用例

### 测试结构

```
tests/
├── mock_hardware.py        # 模拟硬件环境
├── test_hardware.py        # 硬件抽象层（30 个测试）
├── test_config_manager.py  # 配置管理（25 个测试）
├── test_fan_controller.py  # 控制逻辑（27 个测试）
└── test_web_server.py      # Web API + 认证（28 个测试）
```

### Mock 硬件

真实测试需要 NAS 硬件，但开发环境是普通 PC。`mock_hardware.py` 模拟了完整的 hwmon sysfs 结构：

```python
class MockHardware:
    """在 /tmp 下创建模拟的 hwmon 文件结构"""

    def create_chip(self, name='it8772e', channels=1):
        # 创建 /tmp/hwmon0/name, pwm1, pwm1_enable, fan1_input 等文件
        # 支持读写，行为与真实 sysfs 一致
```

支持模拟 IT8772、NCT6776 和自定义芯片，可以测试多芯片冲突等边界场景。

### 测试重点

**硬件层测试**：
- 芯片探测（单芯片、多芯片、无芯片）
- CPU 温度读取（Intel label、AMD label、ARM thermal）
- PWM 读写（正常值、边界值、文件不存在）
- 通道名冲突处理

**控制逻辑测试**：
- 线性插值计算（精确到小数点）
- 温度边界值（低于最低节点、高于最高节点）
- 模式切换（四种模式互相切换）
- 降级触发（温度读取失败 N 次后自动降级）
- 全速保护（温度异常时的应急响应）
- 除零保护（两个节点温度相同时不崩溃）

**配置管理测试**：
- v1/v2 格式兼容
- 无效值自动回退默认值
- 配置文件损坏恢复
- 并发读写安全

**Web API 测试**：
- 所有 12 个端点的正常流程
- 输入校验（超大 body、非法 JSON、越界参数）
- CORS 头部正确性
- 密码认证流程

## FPK 打包

FPK 是飞牛的应用包格式，类似 Synology 的 SPK。一个 FPK 包需要：

### 生命周期脚本

```
cmd/
├── main                    # start / stop / status
├── install_init            # 安装前检查
├── install_callback        # 安装后初始化
├── upgrade_init            # 升级前准备
├── upgrade_callback        # 升级后恢复
├── uninstall_init          # 卸载前清理
├── uninstall_callback      # 卸载后清理
├── config_init             # 配置初始化
└── config_callback         # 配置回调
```

**关键脚本逻辑**：

`main`（启动/停止）：
- 启动时先启动看门狗进程，再启动主应用
- 停止时先停主应用，再停看门狗
- `status` 检查主进程是否存活

`install_callback`（安装后）：
- 检查 Python 3.11+ 是否可用
- 加载 `drivetemp` 内核模块（硬盘温度监控）
- 设置正确的文件权限

`uninstall_init`（卸载前）：
- 停止服务
- **扫描所有 hwmon 设备，恢复 pwm_enable=2**
- 确保卸载后风扇回到 BIOS 控制

### 安装向导

FPK 支持安装时弹出配置向导。我配置了一个端口选择向导，让用户在安装时就能指定 Web 界面的端口号，避免与其他服务冲突。

### CI 自动构建

GitHub Actions 自动打包 FPK：

```yaml
# .github/workflows/build-fpk.yml
- name: Build FPK
  run: bash scripts/build-fpk.sh
- name: Upload artifact
  uses: actions/upload-artifact@v4
  with:
    name: fnos-fan-control.fpk
    path: dist/*.fpk
```

每次 push 或 tag 都会自动构建，Release 页面可以直接下载。

## 项目复盘

### 做对了的事

**1. 零依赖策略**

从第一天就决定不引入第三方包，事后证明这是对的。NAS 用户的环境各不相同，零依赖意味着只要有 Python 就能跑，安装从不出问题。

**2. 安全优先设计**

安全机制不是事后补的，而是从架构层面就考虑进去的。看门狗、多层降级、最低转速保护，这些在第一个版本就有了。硬件控制程序出问题的代价太大，安全必须是一等公民。

**3. sysfs 就是抽象层**

没有搞复杂的驱动类继承体系，直接利用 Linux hwmon 的统一接口。代码简单，兼容性反而更好。

**4. 渐进式多区域**

v1 单风扇和 v2 多区域共存，老配置不用改，新功能可选启用。运行时自动适配，没有迁移负担。

### 可以改进的地方

**1. 前端多区域支持**

后端的多区域功能已经完整，但前端还没有完全跟上。目前多区域配置需要手动编辑 JSON。这是 v1.2 的重点。

**2. 温度历史图表**

目前只有实时数据，没有历史趋势图。对于调试温控曲线来说，能看到过去几小时的温度变化会很有帮助。

**3. 通知机制**

温度告警时能推送通知（飞牛系统通知或邮件）会更实用。

### 数据总结

| 指标 | 数值 |
|------|------|
| 代码量（Python 后端） | ~1500 行 |
| 代码量（前端） | ~2000 行 |
| 代码量（Shell 脚本） | ~400 行 |
| 测试用例 | 120 个 |
| API 端点 | 12 个 |
| 第三方依赖 | 0 |
| 支持的芯片家族 | 3+（ITE、Nuvoton、Fintek 及其他 hwmon 芯片） |
| 安全保护层数 | 5 层 |

## 写在最后

这个项目解决了一个很小但很实际的问题——让 NAS 安静下来。技术上没有什么高深的东西，就是把 Linux sysfs 接口用好，把异常情况想全，把安全保护做到位。

如果你也在用飞牛NAS，被风扇噪音困扰，欢迎试试这个工具。也欢迎提 Issue 和 PR，特别是不同机型的兼容性反馈。

---

> 项目地址：[fnOS-fan-control on GitHub](https://github.com/AriesOxO/fnOS-fan-control)（MIT 许可证）
