---
layout: page
title: "Kernel Patches"
tagline: ""
description: ""
group: "navigation"
---
{% include JB/setup %}


### 我的Linux内核补丁(标*为已进入mainline)

1. *[mm/vmalloc: interchage the implementation of vmalloc_to_{pfn,page}](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=ece86e222db48d04bda218a2be70e384518bb08c)
2. *[mm/slab.c: cleanup outdated comments and unify variables naming](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=5f0985bb1123b48bbfc632006bdbe76d3dfea76b)
3. *[mm/percpu.c: renew the max_contig if we merge the head and previous block](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=21ddfd38ee9aac804d22beaceed4c7b903cca234)
4. [mm/percpu.c: don't bother to re-walk the pcpu_slot list if nobody free space since we last drop pcpu_lockku](https://lkml.org/lkml/2014/3/28/186)
5. [blkdev: use an efficient way to check merge flags](https://lkml.org/lkml/2014/4/2/309)
6. [scripts/tags.sh: add regular expression replacement pattern for memcg](https://lkml.org/lkml/2014/4/10/96)
7. [mm/memcontrol.c: make mem_cgroup_read_stat() read all interested stat item in one go](https://lkml.org/lkml/2014/4/10/444)
8. *[percpu: make pcpu_alloc_chunk() use pcpu_mem_free() instead of kfree()](https://lkml.org/lkml/2014/4/14/17)
9. [block/blk-core.c: print readable string instead of values](https://lkml.org/lkml/2014/4/12/8)
10. *[kprobes: be more permissive when user specifies both symbol name and address](https://lkml.org/lkml/2014/4/15/104)
11. [scripts/tags.sh: add pattern for DEFINE_HASHTABLE](https://lkml.org/lkml/2014/4/16/410)
12. [crypto: sha{256,512}_ssse3 - remove asmlinkage from static functions](https://lkml.org/lkml/2014/4/16/453)
13. *[kernfs: move the last knowledge of sysfs out from kernfs](https://lkml.org/lkml/2014/4/16/473)
14. *[kernfs: fix a subdir count leak](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=c1befb885939cdaaf420c10bbe9ff57aa00446ea)
15. [mm/swap: cleanup *lru_cache_add* functions](https://lkml.org/lkml/2014/4/18/362)
16. [mm/memcontrol.c: remove meaningless while loop in mem_cgroup_iter()](https://lkml.org/lkml/2014/4/18/587)
17. [mm/memcontrol.c: introduce helper mem_cgroup_zoneinfo_zone()](https://lkml.org/lkml/2014/4/18/590)
18. [cgroup: substitude per-cgroup id with per-subsys id](https://lkml.org/lkml/2014/4/17/13://lkml.org/lkml/2014/4/22/53)
19. [cgroup: introduce helper css_to_id()](https://lkml.org/lkml/2014/4/22/54)
20. [mm/memcontrol.c: use accessor to get id from css](https://lkml.org/lkml/2014/4/22/83)
21. [netprio_cgroup: use accessor to get id from css](https://lkml.org/lkml/2014/4/22/55)
22. [cgroup: convert from per-cgroup id to per-subsys id](https://lkml.org/lkml/2014/4/22/61)
23. [mm/swap.c: split put_compound_page function](http://www.gossamer-threads.com/lists/linux/kernel/1912063)
24. [mm: introdule compound_head_by_tail()](http://www.gossamer-threads.com/lists/linux/kernel/1912064)
