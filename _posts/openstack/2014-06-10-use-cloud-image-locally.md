---
layout: post
category : lessons
tags : [openstack, cloud]
---
# 如何在本地使用cloud镜像 

fedora，ubuntu等发行版厂商提供了各自cloud的镜像文件，我们可以直接下载并将其运行为一个虚拟机实例。
但是这些cloud镜像文件默认磁盘分区大小可能无法满足我们的需求，而且，默认是不提供通过密码访问的方式访问虚拟机。
本文将介绍如何快速修该磁盘分区大小以及访问虚拟机。
本文中使用的环境为fedora 20，并且需要libguestfs-tools提供的工具，使用如下命令安装。

```
    sudo yum install libguestfs-tools -y
```

### 首先获取image，使用国内163网站的镜像服务器下载fedora20的镜像文件:

```
    wget http://mirrors.163.com/fedora/releases/20/Images/x86_64/Fedora-x86_64-20-20131211.1-sda.qcow2
```

因为libguestfs工具以来libvirt启动虚拟机来进行编辑镜像文件，所以我们要把镜像文件放在/var/lib/libvirt/images目录下。

### 查看镜像文件大小，并对其进行扩展

    $ virt-filesystems --long --parts --blkdevs -h -a Fedora-x86_64-20-20131211.1-sda.qcow2 
    Name       Type       MBR  Size  Parent 
    /dev/sda1  partition  83   1.9G  /dev/sda 
    /dev/sda   device     -    2.0G  -
    $ virt-df -h  Fedora-x86_64-20-20131211.1-sda.qcow2
    Filesystem                                Size       Used  Available  Use%
    Fedora-x86_64-20-20131211.1-sda.qcow2:/dev/sda1
                                          1.8G       572M       1.3G   31%

libguestfs不支持in-place修改，所以使用qemu-img命令创建一个30G的磁盘，然后扩展原始镜像，最终会创建一个新的镜像文件



    $ qemu-img create -f qcow2 new-disk 30G
    Formatting 'new-disk', fmt=qcow2 size=32212254720 encryption=off cluster_size=65536 lazy_refcounts=off
    
    $ virt-resize Fedora-x86_64-20-20131211.1-sda.qcow2 new-disk --expand /dev/sda1
    Examining Fedora-x86_64-20-20131211.1-sda.qcow2 ...
    100% ⟦▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒⟧ --:--
    **********

    Summary of changes:

    /dev/sda1: This partition will be resized from 1.9G to 30.0G.  The 
    filesystem ext4 on /dev/sda1 will be expanded using the 'resize2fs' 
    method.

    **********
    Setting up initial partition table on new-disk ...
    Copying /dev/sda1 ...
     100% ⟦▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒⟧ 00:00
    Expanding /dev/sda1 using the 'resize2fs' method ...

    Resize operation completed with no errors.  Before deleting the old 
    disk, carefully check that the resized disk boots and works correctly

如果过程中无错误，原始镜像被扩展到new-disk镜像文件中，再次查看磁盘分区大小,sda1分区变为30G


    $ virt-df -h new-disk
    Filesystem                                Size       Used  Available  Use%
    new-disk:/dev/sda1                         30G       573M        29G    2%

###  访问虚拟机
cloud 镜像文件默认是无法使用密码登陆的，如果想访问虚拟机，如何去做呢？

有两种方法:

* 一种是通过libguestfs 提供的工具修改镜像文件的文件系统

打开文件访问功能并设置密码：

    $ virt-customize -a new-disk --root-password password:kvm123456 \
    --edit '/etc/ssh/sshd_config: s/PasswordAuthentication no/PasswordAuthentication yes/'
    [   0.0] Examining the guest ...
    [   5.0] Setting a random seed
    [   5.0] Editing: /etc/ssh/sshd_config
    [   5.0] Setting passwords
    [   5.0] Finishing off

或者通过注入ssh publick key
libguestfs还提供了guestmount工具，用于把image镜像mount到某个目录,加入ssh publich key

    $ guestmount -a new-disk -i /mnt/guest/
    $ ls /mnt/guest/
    bin  boot  dev  etc  home  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var
    $ touch /mnt/guest/etc/1
    $ echo << EOF >>/mnt/guest/root/.ssh/authorized_keys 
    {your public key }
    EOF
    $ guestunmount /mnt/guest/

* 第二种方式是通过 cloud-init

cloud-init 是ubuntu社区的一个项目，当虚拟机系统启动时自动运行，与openstack neutron 配合，通过dhcp服务获取虚拟机ip，访问网络节点
的80端口获得用户配置的资源，用于配置当前环境。
本文中我们没有创建用于cloud-init的服务器，当cloud-init没有找到服务器之后，它还会继续探测是否加载了cd-rom（/dev/sr0）设备。
所以，我们可以准备一个小的用于cloud-init访问的iso文件，在里面配置我们用到的密码或者sshkey。
具体代码：

    $ cat meta-data
    instance-id: iid-local01;
    local-hostname: myhost;

    $ cat user-data
    #cloud-config
    password: mypassword
    ssh_pwauth: True
    chpasswd: { expire: False }
    
    ssh_authorized_keys:
      - ssh-rsa ... foo@foo.com (insert ~/.ssh/id_rsa.pub here)

请注意格式。

生成iso文件，并挂载到虚拟机上。

```
    genisoimage -output init.iso -volid cidata -joliet -rock user-data meta-data
```

启动虚拟机后，cloud-init回自动运行并配置主机。

关于cloud-init的其他配置使用情况可以参考[ Cloud init Document ](http://cloudinit.readthedocs.org/en/latest/).

参考链接：
http://kimizhang.wordpress.com/2014/03/18/how-to-inject-filemetassh-keyroot-passworduserdataconfig-drive-to-a-vm-during-nova-boot/
https://www.technovelty.org/linux/running-cloud-images-locally.html
http://cloudinit.readthedocs.org/en/latest/


