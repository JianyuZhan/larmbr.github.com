---
layout: post
title: "Linux同步机制--可取消的MCS自旋锁"
tagline: "Synchronization mechanisms in Linux: cancelable mcs_spinlock"
description: "Synchronization mechanisms in Linux: cancelable mcs_spinlock"
categories: [linux内核, 同步机制]
tags: [Linux内核, 同步机制, MCS自旋锁]
---
{% include JB/setup %}

上一篇文章介绍了[MCS自旋锁的原理](http://larmbr.me/2014/07/26/mcs-spinlock/), 这一篇将要描述它的**升级版: 可取消的MCS自旋锁**。

**可取消的MCS自旋锁**主要用于内核锁机制mutex的实现中。当CPU在获取mutex时, 如果发现锁已经被持有, 且持有者正在其他CPU上运行, 则采取优化做法, 不是去睡眠等待, 而是自旋等待, 因为很大可能持有者马上就要释放锁了。这个自旋等待就用到MCS自旋锁, 而且, 当CPU在自旋等待过程中, 如果发现需要调度, 那么它应该要放弃等待, 所以得实现**可取消**的语义。

本文将分析该锁的实现, 由上一篇文章知道, MCS自旋锁的实现其实是一个链表, 因此, **可取消的MCS自旋锁**必须小心地处理并发情况, 比如多个CPU竞争时, 在取消操作时, 要考虑可能的并发的取消操作或解锁操作。我们将会看到, 内核的实现是如何小心地利用**原子操作**及优美谨慎的编程技巧来处理这些可能的并发情况的。整个实现代码在**kernel/locking/mcs_spinlock.c**及相关头文件中, 不到300行, 却体现了**无锁并发编程**的美感与技巧, 称之为"刀锋上的舞蹈"亦不为过。

本文假设你已经知道**MCS自旋锁的原理**, 如果不清楚, 可以先阅读[MCS自旋锁的原理](http://larmbr.me/2014/07/26/mcs-spinlock/), 后述所有描述中, 有**前文**一词, 均指此文。另, 本文的代码描述基于编写本文时Mainline kernel最新的**v3.16-rc7**。之后**可能**会随着代码的变迁而更新本文。

## 数据结构

由前文可知, MCS自旋锁保持着每CPU的本地锁; 另还有一个全局锁, 由前文最后的总结第3, 4点可知, 全局锁其实可以退化为一个指向CPU本地锁的指针, 并且, 由于自旋锁的非可重入性, 本地锁和CPU一一对应, 所以指向本地锁的指针可以用CPU的ID来代替。

所以我们看到实现中, 这个**全局锁**为:

    #define OSQ_UNLOCKED_VAL (0)

    struct optimistic_spin_queue {
            /*  
            ¦* Stores an encoded value of the CPU # of the tail node in the queue.
            ¦* If the queue is empty, then it's set to OSQ_UNLOCKED_VAL.
            ¦*/
            atomic_t tail;
    };

这和前文的描述一致: 全局锁里保存着指向最后进入等待链表的本地锁的指针, 不过替换为等价的CPU的ID而已。

可以看到这个锁的名字很奇怪。如前文所说, 此锁是为了优化mutex实现的自旋锁, 所以**optimistic spin**由此而来；前一篇关于MCS自旋锁的文章提到, 其实现就是一个链表, 所以**queue**亦得到解释。因为该锁是基于特定的使用目的, 所以使用这个名字, 但从通用的锁机制来说, 这不是一个好名字。

至于本地锁, 是一个每CPU的结构, 定义为:

    struct optimistic_spin_node {
        struct optimistic_spin_node *next, *prev;
        int locked; /* 1 if lock acquired */
        int cpu; /* encoded CPU # value */
    };

与前文的锁结构相比, 多了一个向前的指针, 因此该链表变为双链表。同时还增加了一个**cpu**字段, 用于指向该结构绑定的CPU。

## 实现

### 一. 加锁原语: **bool osq_lock(struct optimistic_spin_queue *lock)**

下文将逐段解析源码实现。

### 1. 快速路径, 无竞争情况
    
    bool osq_lock(struct optimistic_spin_queue *lock)
    {
    	struct optimistic_spin_node *node = this_cpu_ptr(&osq_node);
    	struct optimistic_spin_node *prev, *next;
    	int curr = encode_cpu(smp_processor_id());
    	int old;
    
    	node->locked = 0;
    	node->next = NULL;
    	node->cpu = curr;
    
    	old = atomic_xchg(&lock->tail, curr);       <--- (1)
    	if (old == OSQ_UNLOCKED_VAL)
    		return true;
    
这一意群, 主要实现尝试加锁的操作。(1)处, 由前文可知, 这里通过一个原子交换, 然后检测锁旧值, 若为**OSQ_UNLOCKED_VAL**, 则表示锁之前为空闲状态, 而且, 原子交换把锁的旧值改为本地的CPU的ID, 表示成功持有, 所以, 返回成功。

### 2. 慢速路径, 竞争下的自旋等待

    	prev = decode_cpu(old);                     <--- (2)
    	node->prev = prev;
    	ACCESS_ONCE(prev->next) = node;
    
    	while (!smp_load_acquire(&node->locked)) {
    		/*
    		 * If we need to reschedule bail... so we can block.
    		 */
    		if (need_resched())
    			goto unqueue;
    
    		arch_mutex_cpu_relax();
    	}
    	return true;

    unqueue:
           ......

如果失败, 表示锁被其他CPU持有, 所以(2)处, 由前文所知, 把本地锁地址放入前一个等待者(或当前持有者)的**next**字段, 表示把自己加入等待队列。

接着进入一个循环, 在本地锁上进行自旋等待, 轮询**locked**字段是否变为1, 即是否获得锁了, 是就返回成功; 不是则继续自旋, 并继续查询。
这里的一个辅助宏:

    #define smp_load_acquire(p)						\
    ({									\
    	typeof(*p) ___p1 = ACCESS_ONCE(*p);				\
    	compiletime_assert_atomic_type(*p);				\
    	smp_mb();							\
    	___p1;								\
    })

用ACCESS_ONCE宏, 强制在每一次轮询中, 重新加载**locked**的值, 并加入一个最重量级的内存屏障, 以保证屏障前的读/写指令都发生于屏障后的读/写指令。这里还加了个编译时的检查, 保证p的类型是原子的, 亦即底层能以一个指令或原子方式读取该值, 以避免非原子方式读取到中间状态的值。

在自旋过程中, 一但发现自己需要被调度, 则应该放弃自旋等待, 即进入退出等待队列, 跳转到**unqueue**标号后的处理内容。这正是**可取消的**语义。

### 2 放弃等待

接下来是实现**可取消**语义的重头戏, 在这里将要小心处理并发的可能, 使用原子交换等操作, 避免了使用其他同步机制, 这是无锁并发编程的精彩所在。由于可能存在并发的前向节点或后向节点的离队操作, 所以这里有**两点准则**, 保证并发的正确性, 即

    每个节点在离队前, 要主动解除前向节点指向自己的联系。
    每个节点要确保自己的后向联系是一个确定的节点后, 解除与之联系, 或者自己是一个最末节点, 才能离队。

为了证明为什么这两点准则的正确性, 我们不妨枚举可能的情况, 以证明这两点准则能产生约束, 保证顺序地离队, 从而保证正确性。

**证明:**

  1 当在解除与前向节点的联系时, 遭遇并发的前向节点离队。 

   * 如果前向节点的离队操作在我们之前, 那由**准则1**, 我们将一直阻塞, 因为与前向节点的解除联系, 是必须由我们主动完成的。所以, 能保证前向离队后, 再到我们离队。

   * 如果前向节点的离队操作在我们之后, 那由**准则2**, 前向节点将一直阻塞, 因为它要等待一个确定的后向节点, 解除与之联系后, 才能离队, 所以, 能保证我们离队后, 前向节点再离队。


  2 当在解除与后向节点的联系时, 遭遇并发的后向节点离队。

   * 如果后向节点的离队操作在我们之前, 那由**准则2**, 我们将一直阻塞, 因为我们要等待一个确定的后向节点, 解除与之联系后, 才能离队, 所以, 能保证后向节点离队后, 再到我们离队。

   * 如果后向节点的离队操作在我们之后, 那由**准则1**, 后向节点将一直阻塞, 因为对于它来说, 与前向节点解除, 必须由它主动完成的。所以, 能保证我们离队后, 后向节点再离队。

综上, 存在一个确定的离队顺序, 从而保证正确性。

因此, 实现分3步, 第一步, 是解除与**prev**节点的联系, 同时令其后向联系为空, 这样**prev**因为不满足第2点, 不会提前离队。第二步, 满足第2点的时后, 解除与**next**节点的联系, 此时对于**next**节点来说, 前向节点不指向它了, 所以它要等待前向节点指向它, 然后自己主动解除与联系后才可离队。第三步, 此时, 中间节点已经完成前后向联系而离队了, 而前向, 后向节点由第一步, 第二步可知, 还在等待, 所以建立它们之间的联系, 然后它们才能继续运转, 完成自己的离队操作。

### 2.1 解除前向联系

    unqueue:
        /*
	 * Step - A  -- stabilize @prev
	 *
	 * Undo our @prev->next assignment; this will make @prev's
	 * unlock()/unqueue() wait for a next pointer since @lock points to us
	 * (or later).
	 */
	for (;;) {
		if (prev->next == node &&                              <--- (3)       
		    cmpxchg(&prev->next, node, NULL) == node)          <--- (4) 
			break;

		/*
		 * We can only fail the cmpxchg() racing against an unlock(),
		 * in which case we should observe @node->locked becomming
		 * true.
		 */
		if (smp_load_acquire(&node->locked))                 <--- (5)
			return true;

		arch_mutex_cpu_relax();

		/*
		 * Or we race against a concurrent unqueue()'s step-B, in which
		 * case its step-C will write us a new @node->prev pointer.
		 */
		prev = ACCESS_ONCE(node->prev);                     <--- (6)
	}

由**准则1**, 退出等待队列的第一步就是**主动**把自己与前向节点**prev**解除联系, 即令**prev->next = NULL**。

先判断**prev->next**是不是指向自己, 不是的话, 说明我们遭遇并发的**prev**节点的修改; 是的话, 用一个原子交换操作完成**prev->next = NULL**, 并返回原来的值。如果检查原来的值不是自己, 说明(3)和(4)之间遭遇了并发的**prev**节点的修改。  

理想情况是这两个判断为真, 由**准则1**, 我们已经**主动**完成了解除**prev**后向联系的操作; 否则, 我们必须等待一个合法的前向节点指向我们, 由我们来**主动**解除与之联系。所以由(6), 我们重新获取前向节点, 在新一轮循环里检查其是否指向我们。

这里有个特殊情况, 如果**prev**是在完成解锁操作的话, 那么很可能, 轮到我们获得锁了, 因此有(5)这一个判断, 获取到锁的话, 返回成功, 函数结束。

总之, 完成这一步, 退出循环的要求是满足**准则1**。

### 2.2 解除后向联系

	/*
	 * Step - B -- stabilize @next
	 *
	 * Similar to unlock(), wait for @node->next or move @lock from @node
	 * back to @prev.
	 */
	next = osq_wait_next(lock, node, prev);
	if (!next)
		return false;

由**准则2**, 我们**必须等待后向节点是一个确定的节点后, 解除与之联系, 才能离队, 因为结合准则1, 这样能序列化一个并发的后向节点的离队操作, 从而保证正确性**。又或者有一种特殊情况, 那么就是我们已经是队列最后一个节点, 那么就没有后结点了, 我们可以检测这种特殊情况, 满足的话, 就能快速离队。

所以, osq_wait_next()函数正是实现上述操作的, 如下:


    static inline struct optimistic_spin_node *
    osq_wait_next(struct optimistic_spin_queue *lock,
    	      struct optimistic_spin_node *node,
    	      struct optimistic_spin_node *prev)
    {
    	struct optimistic_spin_node *next = NULL;
    	int curr = encode_cpu(smp_processor_id());
    	int old;
    
    	old = prev ? prev->cpu : OSQ_UNLOCKED_VAL;
    
    	for (;;) {
    		if (atomic_read(&lock->tail) == curr &&               
    		    atomic_cmpxchg(&lock->tail, curr, old) == curr) {   <--- (7)
    			break;
    		}
    
    		if (node->next) {                                       <--- (8)
    			next = xchg(&node->next, NULL);
    			if (next)
    				break;
    		}
    
    		arch_mutex_cpu_relax();
    	}
    
    	return next;
    }

我们可以看到, 在(7)处, 正是先判断这种特殊情况, 如果满足, 我们快速完成了与后向节点的解除联系操作。

否则, 我们在(8)处, 检查后向节点是一个确定的节点, 然后解除与它的联系。这些都与前面的分析一致。 

总之, 完成这一步, 退出循环的要求是满足**准则2**。

### 2.3 自己离队, 建立前,后向节点的联系

	/*
	 * Step - C -- unlink
	 *
	 * @prev is stable because its still waiting for a new @prev->next
	 * pointer, @next is stable because our @node->next pointer is NULL and
	 * it will wait in Step-A.
	 */
	ACCESS_ONCE(next->prev) = prev;
	ACCESS_ONCE(prev->next) = next;

	return false;

结合代码注释, 其实它解释的就是**准则1**和**准则2**保证的, 我们已经离队, 建立前, 后向节点的联系, 完成操作。

### 二. 解锁原语: **void osq_unlock(struct optimistic_spin_queue *lock)**

解锁的操作相对加锁, 简单得多, 如下:

    void osq_unlock(struct optimistic_spin_queue *lock)
    {
    	struct optimistic_spin_node *node, *next;
    	int curr = encode_cpu(smp_processor_id());
    
    	/*
    	 * Fast path for the uncontended case.
    	 */
    	if (likely(atomic_cmpxchg(&lock->tail, curr, OSQ_UNLOCKED_VAL) == curr))
    		return;
    
    	/*
    	 * Second most likely case.
    	 */
    	node = this_cpu_ptr(&osq_node);
    	next = xchg(&node->next, NULL);
    	if (next) {
    		ACCESS_ONCE(next->locked) = 1;
    		return;
    	}
    
    	next = osq_wait_next(lock, node, NULL);
    	if (next)
    		ACCESS_ONCE(next->locked) = 1;
    }

结合前文, 解锁时是一个**原子交换操作**, 把当前全局锁中保存的队列最后一个节点与自己交换, 然后检查, 如果发现存放的是自己, 则说明当前没有别人竞争锁, 解锁完成。

如果发现不是自己, 说明有人在等待, 把对方的**locked**置为1, 告诉其已经获得锁, 完成操作。

如果此时, 对方恰好在进行离队操作, 那么我们要等待, 直到下一个节点稳定下来, 把其**locked**置为1, 告诉其已经获得锁, 完成操作。

## 总结

在前文的基础上, cancelable语义增加了**MCS自旋锁**的功能, 使其能在自旋等待中, 放弃等待, 完成离队操作。我们看到了代码是如何以巧妙的实现, 完成无锁并发编程, 解决在放弃等待, 离队过程中的可能的竞争问题的。应当说, 这是一个相当优雅的同步机制。

  <center><strong>* * * * * * 全文完 * * * * * * </strong></center>
