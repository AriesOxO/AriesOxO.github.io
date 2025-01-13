---
author: meow
comments: true
title: fancontrol温度控制
categories:
- 服务器
tags:
- Fancontrol
- Debain
- Linux
---

# Debian 上使用 fancontrol 进行温度控制

### 安装必要的软件包
```bash
sudo apt update
sudo apt install lm-sensors fancontrol
```

### 检测硬件传感器
```bash
sudo sensors-detect
```
根据提示回答问题，并加载必要的模块。

### 配置 fancontrol
```bash
sudo pwmconfig
```
这个脚本会暂停每个风扇几秒钟，以确定哪些风扇可以通过 PWM 控制。根据提示选择合适的传感器和 PWM 控制器。

### 编辑 fancontrol 配置文件
打开并编辑 `/etc/fancontrol` 文件，根据需要调整以下参数：
```sh
MINTEMP=hwmon0/temp1_input=30
MAXTEMP=hwmon0/temp1_input=70
MINSTART=hwmon0/pwm1=30
MINSTOP=hwmon0/pwm1=35
MINPWM=hwmon0/pwm1=30
MAXPWM=255
```

### 启动和启用 fancontrol 服务
```bash
sudo systemctl start fancontrol
sudo systemctl enable fancontrol
```

### 监控系统性能
```bash
sensors
```

### 配置自动重启
```bash
sudo systemctl restart fancontrol
```

### 调整风扇速度
在实际使用中，根据需要调整 `fancontrol` 配置文件中的相关参数，使风扇速度达到预期效果。

### 参考资料
- [Install fancontrol on Debian 11](https://installati.one/install-fancontrol-debian-11/)
- [How to install and configure fancontrol (PC)](https://wiki.joeplaa.com/en/tutorials/how-to-install-and-configure-fancontrol-pc)
- [Controlling Fan Speed in Linux](https://www.baeldung.com/linux/control-fan-speed)
