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
6. *[scripts/tags.sh: add regular expression replacement pattern for memcg](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=79c704a87834164259b7aa7469d426d6ba351eec)
7. [mm/memcontrol.c: make mem_cgroup_read_stat() read all interested stat item in one go](https://lkml.org/lkml/2014/4/10/444)
8. *[percpu: make pcpu_alloc_chunk() use pcpu_mem_free() instead of kfree()](https://lkml.org/lkml/2014/4/14/17)
9. [block/blk-core.c: print readable string instead of values](https://lkml.org/lkml/2014/4/12/8)
10. *[kprobes: be more permissive when user specifies both symbol name and address](https://lkml.org/lkml/2014/4/15/104)
11. *[scripts/tags.sh: add pattern for DEFINE_HASHTABLE](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=3005286ee366dac5b75b8f17d4072f433ccbfa4a)
12. [crypto: sha{256,512}_ssse3 - remove asmlinkage from static functions](https://lkml.org/lkml/2014/4/16/453)
13. *[kernfs: move the last knowledge of sysfs out from kernfs](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=c9482a5bdcc09be9096f40e858c5fe39c389cd52)
14. *[kernfs: fix a subdir count leak](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=c1befb885939cdaaf420c10bbe9ff57aa00446ea)
15. *[cgroup: clean up obsolete comment for parse_cgroupfs_options()](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=2f0edc04e702fc07d29621f9e361b9120a7594d0)
16. *[cgroup: remove orphaned cgroup_pidlist_seq_operations](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=f8719ccf7bc0858384c7e93d8c57fe69ae8c9eac)
17. *[cgroup: replace pr_warning with preferred pr_warn](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=a2a1f9eaf945c46b5b2bc0e439cba68888e3d540)
18. *[mm/swap: cleanup *lru_cache_add* functions](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=2329d3751b082b4fd354f334a88662d72abac52d)
19. [mm/memcontrol.c: remove meaningless while loop in mem_cgroup_iter()](https://lkml.org/lkml/2014/4/18/587)
20. [mm/memcontrol.c: introduce helper mem_cgroup_zoneinfo_zone()](https://lkml.org/lkml/2014/4/18/590)
21. [cgroup: substitude per-cgroup id with per-subsys id](https://lkml.org/lkml/2014/4/17/13://lkml.org/lkml/2014/4/22/53)
22. [cgroup: introduce helper css_to_id()](https://lkml.org/lkml/2014/4/22/54)
23. [mm/memcontrol.c: use accessor to get id from css](https://lkml.org/lkml/2014/4/22/83)
24. [netprio_cgroup: use accessor to get id from css](https://lkml.org/lkml/2014/4/22/55)
25. [cgroup: convert from per-cgroup id to per-subsys id](https://lkml.org/lkml/2014/4/22/61)
26. *[mm/swap.c: introduce put_[un]refcounted_compound_page helpers for spliting put_compound_page](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=c747ce7907ab11be53d65ef55c53821558720d8f)
27. *[mm/swap.c: split put_compound_page function](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=4bd3e8f7b94785a6f65665fee21ff3dbc2bf4ef8)
28. *[mm: introdule compound_head_by_tail()](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=d2ee40eae98d8a41ff27dcdd13b1b656c4c1ad00)
29. *[mm: use a light-weight __mod_zone_page_state in mlocked_vma_newpage()](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=bea04b073292b2acb522c7c1aa67a4fc58151530)
30. *[mm: fold mlocked_vma_newpage() into its only call site](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=7ee07a44eb53374a73544ae14c71366a02d462e0)
31. *[mm, hugetlb: move the error handle logic out of normal code path](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=8f34af6f93aee88291cec53ae8dff4989e58fbbd)
32. *[mm/vmscan.c: use DIV_ROUND_UP for calculation of zone's balance_gap and correct comments](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=4be89a34609659042ef0bf883ad76388fb5251bb)
33. *[mm/page-writeback.c: remove outdated comment](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=d2f3102838d90ed6ed09a6154bdb2306f7cf1548)
34. *[mm: memcontrol: clean up memcg zoneinfo lookup](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=e231875ba7a118de7970fae3ac08b244a2822074)
35. *[perf tools: Fix 'make help' message error](https://git.kernel.org/cgit/linux/kernel/git/torvalds/linux.git/commit/?id=fc9cabeabf42d76854059e7bce81a02645e7e5ca)
