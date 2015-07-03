---
layout: post
category : lessons
tags : [openstack, magnum]
---


## Hacking magnum swarm node to add proxy

I will talk about how to add proxy in magnum swarm framework

### Why I need proxy

Because GFW, you know!

### Where to add proxy

We need an http_proxy and https_proxy first! if you do not have that proxy, then you can leave now.

#### dockerd need proxy to pull image

    $ mkdir /etc/systemd/system/docker.service.d/

    $ cat /etc/systemd/system/docker.service.d/proxy.conf &lt;&lt; EOF

    [Service]

    Environment=HTTP_PROXY=http://x.x.x.x:yy

    EOF

    $ systemctl daemon-reload

     systemctl restart docker.service

#### docker service need proxy to access extrenl network

we can passing to docker run command line like this:

    -e http_proxy=http://x.x.x.x:yy \
    -e https_proxy=http://x.x.x.x:yy \
    -e no_proxy=192.168.0.3,192.168.0.4,192.168.0.5

no_proxy is important, since swarm node internal access will use 192* ip.

#### docker host need proxy

    cat /etc/bashrc &lt;&lt;EOF
    declare -x http_proxy=http://x.x.x.x:yy
    declare -x https_proxy=http://x.x.x.x:yy
    declare -x no_proxy=192.168.0.3,192.168.0.4,192.168.0.5
    EOF

notes we only add 192.168.0.3,192.168.0.4,192.168.0.5 because we only have 3 nodes and their ips are them, this is hacking, we need to dynimic adding them this is okay, because we can get them from HEAT template. Since I am hacking, it is okay. I know what I am doing.

### hacking magnum code to adding proxy

I put all of them into a patch, you may get it from here, but please not it is only working for my enviroment, just an example for you.

[patch](https://github.com/taget/mybin/blob/master/misc/0001-Add-proxy-swarm.patch)


### go and play with it

And you need to have an OpenStack setup, command line to create baymodelas follows

    nova keypair-add --pub-key ~/.ssh/id_rsa.pub testkey
    NIC_ID=$(neutron net-show public | awk '/ id /{print $4}')
    
    magnum baymodel-create --name swarmmodel --image-id fedora-21-atomic-3 \
        --keypair-id testkey --external-network-id $NIC_ID \
        --dns-nameserver 10.248.2.5 --flavor -id m1.small \
        --docker-volume-size 5 --coe swarm --fixed-network 192.168.0.0/24

    magnum container-create --name hello --image cirros --bay swarmbay --command "echo hello world"
    magnum container-list
    +--------------------------------------+---------------+---------+
    | uuid                                 | name          | status  |
    +--------------------------------------+---------------+---------+
    | 084a650f-e17c-4aab-b229-74567d38f4e7 | testcontainer | Stopped |
    | f1d7a992-8073-44cd-966f-6e08d102cc1b | hello         | Stopped |
    +--------------------------------------+---------------+---------+



