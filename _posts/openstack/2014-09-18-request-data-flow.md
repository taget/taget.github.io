---
layout: post
category : lessons
tags : [openstack]
---

## Data flow of openstack request

This post will talk about the data flow of an openstack request, I will take boot an instance and shelve an instance as example.

Assume that you have setup an openstack environment already.

Let’s start from nova client, you can put `–debug` option to nova client then you will see the request url nova client sent.


### Boot an instance


    [tagett@stack-01 devstack]$ nova --debug boot t3 --flavor m1.nano --image  44c37b90-0ec3-460a-bdf2-bd8bb98c9fdf --nic net-id=b745b2c6-db16-40ab-8ad7-af6da0e5e699
    …
    REQ: curl -i 'http://cloudcontroller:5000/v2.0/tokens'
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/images/44c37b90-0ec3-460a-bdf2-bd8bb98c9fdf'
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/flavors/m1.nano'
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/servers' -X POST -H "Accept: application/json" -H "Content-Type: application/json" -H "User-Agent: python-novaclient" -H "X-Auth-Project-Id: admin" -H "X-Auth-Token: {SHA1}15d9e554b7456f1043732bb8df72d1521c5f6aa1" -d '{"server": {"name": "t3", "imageRef": "44c37b90-0ec3-460a-bdf2-bd8bb98c9fdf", "flavorRef": "42", "max_count": 1, "min_count": 1, "networks": [{"uuid": "b745b2c6-db16-40ab-8ad7-af6da0e5e699"}]}}'
    …


The requests from nova client are:

1)  Get token from keystone server with username and password, keystone will return the token, and also the tenant id.

2)  Send another request with tenant id (d7beb7f28e0b4f41901215000339361d) and token to check if image existed. 

3)  Send another request with tenant id (d7beb7f28e0b4f41901215000339361d) and token to check if favors existed.

4)  Request to create an instance, all request data are put in the request body, check –d section.

Nova client help you to make all requests together, the most important one is the 4), if you are sure about all resources, you can simply run 4) to create an instance.

The date flow will be follows:

Nova client -> nova-api -> nova-conductor->nova-scheduler->nova-compute


![boot](/assets/images/boot.png)

Each one is a service(a running process), they call each other through rpc server.

Let’s take a look at the service side code.

The nova-api service is a wigi server, you can find the code from:

nova /api/openstack/compute/servers.py

The handle function is    

    def create(self, req, body):
        """Creates a new server for a given user."""
    …   
    (instances, resv_id) = self.compute_api.create(context,

After doing so many check, it finally calls the function of create() which defined in compute_api

The code locates at nova/compute/api.py

        @hooks.add_hook("create_instance")
    def create(self, context, instance_type,
    ...
            return self._create_instance(

some validation and option are done in _create_instance function.
Then calling 

    self.compute_task_api.build_instances(context,

compute_task_api is a rpc request to nova-conductor service.

Go to nova/conductor/manager.py, We will find the function    

    def build_instances(self, context, instances, image, filter_properties,
    … 
           hosts = self.scheduler_rpcapi.select_destinations(context,
    …
           self.compute_rpcapi.build_and_run_instance(context,


It mainly does 2 things, send request to nova-scheduler to find a host which the newly created instances will run on, and send request to these hosts’ to run an instance.

Then we go to nova/compute/manager.py, which will receive the request from conductor , and it

    def build_and_run_instance(self, context, instance, image, request_spec,
                     filter_properties, admin_password=None,
                     injected_files=None, requested_networks=None,
                     security_groups=None, block_device_mapping=None,
                     node=None, limits=None):

this function will call the really hypervisor driver to create instance.
each service does its own job.

- nova-api: accept the url request and response to client

- nova-conductor: talk to db, improve the security of db access

- nova-scheduler: find a specify node though some require specification.

- nova-compute: do the really compute node related job.

not all of request will call all the services.


### Shelve an instance

    [tagett@stack-01 devstack]$ nova list
    +--------------------------------------+-----------+-------------------+------------+-------------+-----------------------------------+
    | ID                                   | Name      | Status            | Task State | Power State | Networks                          |
    +--------------------------------------+-----------+-------------------+------------+-------------+-----------------------------------+
    | 00be783d-bef5-46b1-bfdc-316618c76e92 | t2        | ACTIVE            | -          | Running     | private=192.168.1.82              |
    +--------------------------------------+-----------+-------------------+------------+-------------+-----------------------------------+

Then shelve an instance:

    [tagett@stack-01 devstack]$ nova --debug shelve t2
    REQ: curl -i 'http://cloudcontroller:5000/v2.0/tokens' …
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/servers'…
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/servers/r'…

    …
    REQ: curl -i 'http://cloudcontroller:8774/v2/d7beb7f28e0b4f41901215000339361d/servers/00be783d-bef5-46b1-bfdc-316618c76e92/action' -X POST -H "Accept: application/json" -H "Content-Type: application/json" -H "User-Agent: python-novaclient" -H "X-Auth-Project-Id: admin" -H "X-Auth-Token: {SHA1}0634ea0ef1c3994e1f496c5d8890d32610cf11e9" -d '{"shelve": null}'…

There are 4 requests you can see from above, you will see the full request url with request body and also you can find the response code body.

The requests are:

1)  Get token from keystone server with username and password, keystone will return the token, and also the tenant id.

2)  Send another request with tenant id (d7beb7f28e0b4f41901215000339361d) and token. You will get all instances the tenant created.

3)  Another request is check if the instance you want to shelve (00be783d-bef5-46b1-bfdc-316618c76e92) exist.

4)  Do shelve, you can see it is a post request with the body  -d '{"shelve": null}'

At last , nova api return a response as:

    RESP: [202] CaseInsensitiveDict({'date': 'Thu, 18 Sep 2014 04:03:09 GMT', 'content-length': '0', 'content-type': 'text/html; charset=UTF-8', 'x-compute-request-id': 'req-4be7dc9a-21da-4050-9310-3ee58ca93569'})
RESP BODY: null

Server has accepted(202) your request and will do the shelve asynchronous.

This is what you can see from client side.

Then here’s the server side.

The basic service calling sequence is:
Novaclient -> nova-api -> nova-conductor -> nova-compute

the api code of shelve is in nova/api/openstack/compute/contrib/shelve.py
it is an extension of server(as you can see from the request of shelve)
you can find the follow code:

nova/api/openstack/compute/contrib/shelve.py :

    @wsgi.action('shelve')
    def _shelve(self, req, id, body):
        """Move an instance into shelved mode."""
        context = req.environ["nova.context"]
        auth_shelve(context)

        instance = self._get_instance(context, id)
        try:
            self.compute_api.shelve(context, instance)
        except exception.InstanceIsLocked as e:
            raise exc.HTTPConflict(explanation=e.format_message())

the api service will call nova compute api ‘s function shelve,
the code located at nova/compute/api.py

        if not self.is_volume_backed_instance(context, instance):
            name = '%s-shelved' % instance['display_name']
            image_meta = self._create_image(context, instance, name,
                    'snapshot')
            image_id = image_meta['id']
            self.compute_rpcapi.shelve_instance(context, instance=instance,
                    image_id=image_id)
        else:
            self.compute_rpcapi.shelve_offload_instance(context,
                    instance=instance)

then it make a rpc call though compute_rpcapi, the message will send to amqp server and 
it will received by compute manager, to let’s check the code in nova/compute/manager.py


so the data flow will be

![shevle](/assets/images/shelve.png)
