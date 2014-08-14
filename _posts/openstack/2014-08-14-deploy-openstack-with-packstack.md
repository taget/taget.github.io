---
layout: post
category : lessons
tags : [openstack]
---

## 使用packstack部署openstack

本文将介绍如何使用Redhat提供的packstack部署openstack

### Openstack 简介
openstack 是一整套资源管理软件的集合，也是当前最热的开源虚拟化管理软件之一，有一个全球139个国家将近两万开发者参与的开源社区（www.openstack.org）作为支持。openstack项目的目的是快速建设一个稳定可靠的公有云或私有云系统。整个项目涵盖了计算，存储，网络以及前端展现等关于云管理的全部方面，包含了众多子项目。

主要包含了一下几个子项目:

 - OpenStack Compute (code-name Nova) 计算服务
 - OpenStack Networking (code-name Neutron) 网络服务
 - OpenStack Object Storage (code-name Swift) 对象存储服务
 - OpenStack Block Storage (code-name Cinder) 块设备存储服务
 - OpenStack Identity (code-name Keystone) 认证服务
 - OpenStack Image Service (code-name Glance) 镜像文件服务
 - OpenStack Dashboard (code-name Horizon) 仪表盘服务
 - OpenStack Telemetry (code-name Ceilometer) 告警服务
 - OpenStack Orchestration (code-name Heat) 流程服务
 - OpenStack Database (code-name Trove) 数据库服务

openstack的特点各个服务之间通过统一的REST风格的API调用，实现系统的松耦合。

![whole picture of openstack](/assets/images/openstack-whole.jpg)

图中实线代表client api调用，虚线代表各个组件之间通过REST API进行通信。从图中可以看出，openstack的整体架构是松耦合的，这样做的好处是，各个组件的开发人员可以只关注各自的领域，对各自领域的修改不会影响到其他开发人员。不过，从另一方面来讲，这种松耦合的架构也给整个系统的维护带来了一定的困难。运维人员可能要掌握更多的系统相关的知识去调试出了问题的组件。
关于openstack更多信息，读者可以查阅参考文献中的opesntack社区连接，用以获得更多最新的动态。


### 部署openstack


各种发行版提供了各自openstack的安装部署方式，基于fedora 的RDO，我们可以快速部署openstack环境到一个物理机上，然后对其进行计算节点扩展。

RDO是一个快速安装部署fedora，redhat，centos发行版的openstack工具。另外，redhat也提供了企业版本openstack支持，参考如下链接http://www.redhat.com/openstack/

**使用RDO部署单节点**

笔者使用环境是fedora20，只需要简单几条命令即可完成openstack的penstack的allinone模式，即部署openstack环境到一台单机上（fedora20环境下要打开Selinux, 'sudo setenforce permissive')

    sudo yum update –y
    sudo yum install -y openstack-packstack
    packstack --allinone

packstack 配置过程中需要安装一些软件，比如说puppet，所以需要确保主机接入了网络，
同时确保sshd service是启动状态，按照提示输入root账号的密码。
packstack会帮我们创建mysql数据库，创建用户密码等，如果整个安装过程没有报错，整个环境就搭建好了。

fedora20的openstack-puppet-modules-2013.2-9.1.fc20.noarch包中有一个bug，社区已经有了fix，读者可以自行按照该链接进行修改
/usr/share/openstack-puppet/modules/neutron/lib/puppet/provider/neutron_subnet/neutron.rb
https://git.openstack.org/cgit/stackforge/puppet-neutron/commit/?id=78428c844f73bf585a8f8a3bdf615ba2a0e8983b
安装过程中如果出现任何错误，读者可以根据屏幕输出的提示查看日志文件，手动修复后，删除生成的answers文件，重新运行packstack --allinone 即可。
如果一切安装顺利，在root目录下会生成以下3个文件


    keystonerc_admin  keystonerc_demo   packstack-answers-20140624-142948.txt

> **注**
>- 关于packstack的一些已知的workaroud，请查阅如下链接http://openstack.redhat.com/Workarounds
>- fedora 20 的openstack-dashboard 与 python-django 1.6.0 以上的版本不兼容，所以需要使用1.5版本的 python-django-1.5.5-2.fc20.noarch，这时，先引入packstack生成的环境变量文件

    [root@stack-kvm110] # source .keystonerc_admin

然后使用nova-manage service list 命令查看nova服务的状态。

    [root@stack-kvm110 ~(keystone_admin)]# nova-manage service list
    Binary           Host                Zone            Status     State Updated_At
    nova-conductor   stack-kvm110        internal          enabled    :-)   2014-06-27 02:12:09
    nova-cert        stack-kvm110         internal         enabled    :-)   2014-06-27 02:12:07
    nova-consoleauth stack-kvm110         internal          enabled    :-)   2014-06-27 02:12:08
    nova-scheduler   stack-kvm110         internal          enabled    :-)   2014-06-27 02:12:12
    nova-compute    stack-kvm110         nova            enabled    :-)   2014-06-27 02:12:13

从命令输出可以看出在stack-kvm主机上运行的服务。
或者通过浏览器访问dashboard，在浏览器打开http://$YOURIP/dashboard 就可以访问安装好的openstack前端dashboard。用户名是admin，密码通过查看keystonerc_admin
可以获得，此时，控制节点，网络节点和计算节点都安装在一台服务器上了。

**添加新的计算点**

接下来继续添加新的节点用做计算节点（9.181.129.64）。
打开packstack生成的packstack-answers-20140624-142948.txt 文件，编辑
修改网卡名字，为了让新添加的节点可以与之前创建的节点共享同一个似有网
需要修改CONFIG_NOVA_COMPUTE_PRIVIF和CONFIG_NOVA_NETWORK_PRIVIF，把他们指向一个物理网卡（第二块网卡）

    # Private interface for Flat DHCP on the Nova compute servers
    CONFIG_NOVA_COMPUTE_PRIVIF=eth1
    # Private interface for network manager on the Nova network server
    CONFIG_NOVA_NETWORK_PRIVIF=eth1

另外，修改

    # A comma separated list of IP addresses on which to install the Nova
    # Compute services
    CONFIG_NOVA_COMPUTE_HOSTS=192.168.1.64

同时保证 CONFIG_NOVA_NETWORK_HOSTS 是第一个节点192.168.1.110。
重新运行

    sudo packstack --answer-file=packstack-answers-20140624-142948.txt

安装完成后，在controler节点上通过nova-manage service 可以看到新增加的compute节点stack-01。

    [root@stack-kvm110 ~(keystone_admin)]# nova-manage service list
    Binary           Host                     Zone             Status     State Updated_At
    nova-conductor   stack-kvm110             internal         enabled    :-)   2014-06-27 02:23:29
    nova-cert        stack-kvm110             internal         enabled    :-)   2014-06-27 02:23:28
    nova-consoleauth stack-kvm110             internal         enabled    :-)   2014-06-27 02:23:28
    nova-scheduler   stack-kvm110             internal         enabled    :-)   2014-06-27 02:23:32
    nova-compute     stack-kvm110            nova          enabled    :-)   2014-06-27 02:23:33
    **nova-compute     stack-01               nova          enabled    :-)   2014-06-27 02:23:27**


**配置网络节点和计算节点的物理网络**

本文中使用openvswitch 作为虚拟网络的驱动插件，图2是网络节点与单台计算节点的物理连接图。


![neutron 网络物理连接](/assets/images/neutron-phy.jpg)


如图所示，绿色的连接是数据网络，专门用于租户的虚拟机之间的连接。灰色的是管理网络，用于openstack各个组件之间的网络通信。管理节点通过eth2网卡接入到外网路由器，也是整个openstack系统外网流量的出口。网络节点以及计算节点的neutron配置。

本文中使用neutron配置虚拟网络，网络节点与控制节点安装在同一节点机器。
从图中我们可以看出openstack的网络分为：

 - 管理网，用于openstack 各个组件之间的通信
 - 数据网， 虚拟机之间的通信

**vlan方式**

使用这种方式的前提是，连接计算节点和网络节点的交换机配置了或者支持vlan功能。
网络节点：

    /etc/neutron/plugins/openvswitch/ovs_neutron_plugin.ini：
    [ovs]
    tenant_network_type = vlan
    network_vlan_ranges = physnet1,physnet2:101:110
    integration_bridge = br-int
    bridge_mappings = physnet1:br-ex,physnet2:br-eth1

计算节点：

    [ovs]
    tenant_network_type = vlan
    network_vlan_ranges = physnet2:101:110
    integration_bridge = br-int
    bridge_mappings = physnet2:br-eth1


图3中蓝框所示为openvswitch网桥


![虚拟网络的逻辑连接](/assets/images/logic-network.jpg)

**gre方式**

与vlan方式类似，只不过在网络节点与计算节点之间建立了条专用通道
网络节点：

    /etc/neutron/plugins/openvswitch/ovs_neutron_plugin.ini：
    enable_tunneling = True
    tunnel_type = gre
    tunnel_id_ranges = 1:1000
    local_ip = 9.181.129.110
    integration_bridge = br-int
    tunnel_bridge = br-tun

计算节点：

    enable_tunneling = True
    tunnel_type = gre
    tunnel_id_ranges = 1:1000
    local_ip = 9.181.129.64
    integration_bridge = br-int
    tunnel_bridge = br-tun

使用neutron命令创建虚拟网络
创建public网络，子网以及路由器

    $ neutron router-create router01
    $ neutron net-create public01 \
    --provider:network_type flat \
    --provider:physical_network physnet1 \
    --router:external=True
    $ neutron subnet-create --name public01_subnet01 \
    --gateway 192.168.1.1 public01 192.168.1.0、24 --disable-dhcp
    $ neutron router-gateway-set router01 public01

创建内部网络net01以及子网

    $ neutron net-create net01 \
    --provider:network_type vlan \
    --provider:physical_network physnet2 \
    --provider:segmentation_id 101
    $ neutron subnet-create --tenant-id $tenant --name net01_subnet01 net01 192.168.101.0/24
    $ neutron router-interface-add router01 net01_subnet01

同理创建内部网络net02以及子网

    $ neutron net-create net02 \
    --provider:network_type vlan \
    --provider:physical_network physnet2 \
    --provider:segmentation_id 102
    $ neutron subnet-create --tenant-id $tenant --name net02_subnet01 net01 192.168.102.0/24
    $ neutron router-interface-add router01 net02_subnet01

创建基于gre的私有网络net03和子网以及net04和子网

    $ neutron net-create net03 --provider:network_type gre --provider:physical_network physnet2 tunnel_id_ranges = 1:1000 enable_tunneling = True
    $ neutron subnet-create --name net03_subnet01 net03 192.168.103.0/24

    $ neutron net-create net04 --provider:network_type gre --provider:physical_network physnet2 tunnel_id_ranges = 1:1000 enable_tunneling = True
    $ neutron subnet-create --name net04_subnet01 Net04 192.168.104.0/24


![openstack dashboard](/assets/images/dashboard.jpg)




