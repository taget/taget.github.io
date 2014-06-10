---
layout: post
category : lessons
tags : [networking, linux]
---

## Linux Network Namespaces

Linux kernel在2.6.29中加入了namespaces，用于支持网络的隔离，我们看一下namespace是如何使用的

### 创建与配置

创建一个名为blue的namespace

```
ip netns add blue
```

列出所有的namespace

```
ip netns list
```

### 分配网络接口到namespace上

我们可以将一对veth中的一个分配到namespace上，将另一个分配到另一个上。

veth的创建如下：

```
ip link add veth0 type veth peer name veth1
```

这样就创建了一对veth，veth0 和veth1。
veth的作用就像一根网线一样，从一端进入的数据会从另一端出来。
使用
```
ip link list
```
查看创建的veth设备。

如果我们想把刚创建的namaespace与global/default namespace连接，我们可以这样做：
```
ip link set veth1 netns blue
```
veth1 从global从消失了,因为这对veth的另一端veth0在default中，这样我们就可以将两个 namespace联系起来了。

使用如下命令查看blue namespace中的连接

```
ip netns exec blue ip link list
```

如何配置namespace中的接口呢？可以使用如下命令：

```
ip netns exec <network namespace> <command to run against that namespace>
```

### 连接到物理网络

可以使用linux bridge 或者 openvswith bridge。将物理接口和veth的一个加入到同一个bridge就可以了。


