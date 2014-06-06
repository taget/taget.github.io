---
layout: post
category : lessons
tags : [intro]
---

[TOC]

# Fedora 在线升级
## 所需工具工具 fedup
### fedup的安装
```
$sudo yum install fedup
```
fedup装成功后，推荐使用网络方式升级系统

```
$sudo fedup-cli --network 20 --addrepo f20=http://mirrors.163.com/fedora/releases/20/Everything/x86_64/os/
```
