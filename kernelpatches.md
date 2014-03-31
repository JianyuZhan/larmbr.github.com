---
layout: page
title: "Kernel Patches"
tagline: ""
description: ""
group: "navigation"
---
{% include JB/setup %}


### 我的Linux内核补丁

* [mm/vmscan : use vmcan_swappiness( ) basing on MEMCG config to elimiate unnecessary runtime cost](https://lkml.org/lkml/2013/8/26/242)
* [mm/vmalloc: interchage the implementation of vmalloc_to_{pfn,page}](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=ece86e222db48d04bda218a2be70e384518bb08c)
* [mm/slab.c: cleanup outdated comments and unify variables naming](https://lkml.org/lkml/2014/2/27/45)
* [mm/percpu.c: renew the max_contig if we merge the head and previous block](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=21ddfd38ee9aac804d22beaceed4c7b903cca234)
* [mm/percpu.c: don't bother to re-walk the pcpu_slot list if nobody free space since we last drop pcpu_lockku](https://lkml.org/lkml/2014/3/28/186)
