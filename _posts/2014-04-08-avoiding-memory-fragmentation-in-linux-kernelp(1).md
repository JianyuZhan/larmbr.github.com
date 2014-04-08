---
layout: post
title: "Linux内核中避免内存碎片的方法(1)"
tagline: "Avoiding Memory Fragmentation In Linux Kernel(1)"
description: "Avoiding Memory Fragmentation In Linux Kernel(1)"
categories: [linux内核, 内存管理] 
tags: [Linux内核, 内存管理, 内存碎片] 
---
{% include JB/setup %}

内存碎片化(Memory fragmentation)一直是内存管理中一大难题，即使在现代分页模式下的虚拟内存，这一问题仍然存在; Linux也不例外。随着系统的运行，内存页的分配遍布整个主存区域，使得要找出连续的物理内存页都很困难，虽然虚拟内存可以解决这个问题：它把不连续的内存页映射为进程地址空间中连续的页。但这并不是本质地解决问题，内存碎片化会导致伙伴系统中的大阶数内存页[[1]](#jmp1)分配失败，而有时候，大阶数的内存页分配是无法避免的，比如一些低端设备需要访问的DMA区域就必须是连续的内存页。

针对这个问题，Linux内存开发者提出不同的解决方法，比如[成块回收(Lumpy Recalim)](https://lkml.org/lkml/2007/3/1/71)就是在分配高阶内存页失败后进入页面回收时，尝试成块回收目标回收页相邻的页面，以形成一块满足需求的高阶连续页块。这种方法有其局限性，就是成块回收时没有考虑被连带回收的页面可能是“热页”，即被高强度使用的页，这对系统性能是损伤。

此外，在去碎片化时，需要移动或回收页面，以腾出连续的物理页面，但这可能由于一颗“老鼠屎就坏了整锅粥”——由于某个页面无法移动或回收，导致整个区域无法组成一个足够大的连续页面块。这种页面通常是内核使用的页面，因为内核使用的页面的地址是直接映射(即物理地址加个偏移就映射到内核空间中)，这种做法不用经过页表翻译，提高了效率，却也在此时成了拦路虎。

直到2007年，常年在这一领域坚持不懈的Mel Gorman[[2]](#jmp2)的补丁系列[Group pages of related mobility together to reduce external fragmentation v28](http://lwn.net/Articles/224254/)在历经漫长的**28次个版本**修改后终于进入内核。他的方法就是针对上面说的这种情况而考虑的，从而解决了这一拦路虎。这种方法以他最终版本时的方法叫做：**页面聚类(Page Clustering)**。

## 页面聚类

Mel Gorman观察到，所有使用的内存页有三种情形：

    `容易回收的(easily reclaimable)`:  这种页面可以在系统需要时回收，比如缓存页(page cache)，它们可以轻易的丢弃掉而不会有问题(有需要时再从后备文件系统中读取); 又比如一些生命周期短的内核使用的页，如DMA缓存区。
    `难回收的(non-reclaimable)`:  这种页面得内核主动释放，很难回收，内核使用的很多内存页就归为此类，比如为模块分配的区域，比如一些常驻内存的重要内核结构所占的页面。
    `可移动的(movable)`:  用户空间分配的页面都属于这种类型，因为用户态的页地址是由页表翻译的，移动页后只要修改页表映射就可以(这也从另一面应证了内核态的页为什么不能移动，因为它们采取直接映射)。

因此，Mel Gorman对伙伴页分配算法做了一点小修改，对每一阶页面，根据分配标志(__GFP_RECLAIMABLE对应上述第一种，__GFP_MOVABLE对应上述第三种，无聚类标志的对应剩下的第二种)，会有三个对应的list中存放相应的页面。每次分配时，根据分配标志从对应list中分配; 在返回页面给伙伴系统时，也会返回到对应的list。这样，随着时间推移，相同分配类型的页面会被聚类到一起。

这样，结合上述的**Lumpy Reclaim**, 回收页面时，就能保证回收同一类型的; 或者在移动页面时(migrate page), 就能移动可移动类型的页面，从而腾出连续的页面块，以满足高阶分配。

此外，在之前的版本中，Mel的这种按可移动性分三个list的做法得到别的开发者的质疑，他们认为这种分类的做法是内存zone被设计出来的初衷(内存zone分为ZONE_NORMAL,即低端内存；ZONE_HIGHMEM, 即高端内存; ZONE_DMA, 即dma设备专门访问的内存区域)，因此Mel这种在伙伴系统中分出三个list的做法他们不大认可。针对这一点，Mel在这第28版本中，还[引入了一个叫**ZONE_MOVABLE**的zone](http://lwn.net/Articles/224255/)。注意现有的三种zone是实实在在的物理内存区域，而Mel引入的这个则是人为创建的，实际上，组成ZONE_MOVABLE的页来自每一个Node的ZONE_HIGHMEM区。它的目的就是满足使用__GFP_MOVABLE标志的分配, 跟前面的基于list的做法目的一致，只不过是套入了现有的zone框架。

## 带来的改变

这种做法带来的效果是明显的，如Mel在邮件中所说：

    Our tests show that about 60-70% of physical memory can be allocated on a desktop after a few days uptime. In benchmarks and stress tests, we are finding that 80% of memory is available as contiguous blocks at the end of the test. To compare, a standard kernel was getting < 1% of memory as large pages on a desktop and about 8-12% of memory as large pages at the end of stress tests.

下篇文章将讲解Linux内核中另一个去碎片化的功能：Memory compaction。

参考：

* [Avoiding - and fixing - memory fragmentation](http://lwn.net/Articles/211505/) 

* [Short topics in memory management](http://lwn.net/Articles/224829/) 

* [Mel Gorman的Patch set](https://lkml.org/lkml/2007/3/1/71) 
   <center><strong>* * * * * * 全文完 * * * * * * </strong></center>


<span id="jmp1">[1]: 这是伙伴分配算法中的概念，一个阶数为3的分配表示要分配2^3=8页连续物理内存页。</span>

<span id="jmp2">[2]: 这位大名鼎鼎的内核黑客就是《Understanding the Linux Virtual Memory Manager》此书的作者。</span>
