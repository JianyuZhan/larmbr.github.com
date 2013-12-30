---
layout: post
title: "Linux内核中的内存屏障(2)"
tagline: "The Memory Barriers in Linux Kernel(2)"
description: "The Memory Barriers in Linux Kernel(2)"
categories: [linux内核, 内存管理]
tags: [Linux内核, 内存管理]
---
{% include JB/setup %}

上一篇文章介绍了为什么需要内存屏障和什么是内存屏障。这篇主要介绍Linux内核中的内存屏障API。

# 内存屏障API分类

如前文所述，在处理器和编译器层次，都可能会对程序指令顺序进行重排，所以Linux分别提供了这两个层次的内存屏障API。此外，对于一些使用MMIO(内存映射IO)的设备，Linux也提供了相应的内存屏障API-mmiowb()(本文不会介绍)。

## 编译器内存屏障

内核在这一层次提供了唯一一个API, 叫做`barrier()`。使用这个API可以防止因为编译器的指令优化重排。

对于内核主要支持的GCC编译器，这个API利用了内联汇编，典型实现如下：

     #define barrier() __asm__ __volatile__("": : :"memory")

汇编指令部分什么也没有，在**破坏描述符**部分有个`memory`关键字，该关键字强制gcc编译器假设所有内存单元均被汇编指令修改，因此使得所有缓存无效，cpu将不得不重新读取内存中的数据。

对于Intel的编译器，这个API直接利用了编译器内建函数实现该功能：


    #define barrier() __memory_barrier()  

## 处理器内存屏障

对应前文的描述，处理器提供了对应的API，总结如下图：

            类型              强制版本               SMP条件性版本
       =============== ======================= ===========================
    	    写屏障             wmb()                   smp_wmb()
    	    读屏障             rmb()                   smp_rmb()
           通用屏障             mb()                    smp_mb()
        数据依赖屏障   read_barrier_depends()  smp_read_barrier_depends()

**强制版本**表示，该版本对应的API确实提供其对应的屏障语义。

**SMP条件性版本**则视乎内核是编译成单处理器版本还是多处理器(SMP)版本, 实现有所不同。

  * 如果是**编译成单处理器版本**，则其实现仅仅是一个简单的`barrier()`编译器屏障。因为在单处理器上，程序的因果性是由处理器内在地保证的，无论处理器进行如何的重排，并不会改变程序的最终语义(否则这就是个有问题的处理器了), 所以只要一个编译器优化屏障，确保在编译器这一层次不会因为优化而重排了指令，改变了语义即可。不过如果在单处理器上处理与有着松散的MMIO访问模型的设备，那么内存屏障仍然是需要的，这就是强制版本发挥作用的场所了。

  * 如果是**编译成多处理器版本**，则会实现对应的屏障语义。下面就**x86**架构分析Linux内核的实现。

前一篇文章说过，x86是一种叫**流程一致性(process consistency)**的模型，简言之：对于某个处理器的**写操作**，它可以按照其意愿重排执行顺序，对于所有其它处理器，他们的**观察顺序**，就是它实际的**执行顺序**。因此，在**x86**架构上，只要保证对**写操作**加入必要的内存屏障以保证其顺序，那么我们也可以保证别的处理器**一定**会看到这种实际的执行顺序。

Linux还会根据**x86**处理器的新旧，采取不同的实现。

 * 如果处理器**支持**SSE/SSE2特性，则这几个内存屏障API的对应实现如下：

        #define mb()    asm volatile("mfence":::"memory")
        #define rmb()   asm volatile("lfence":::"memory")
        #define wmb()   asm volatile("sfence":::"memory")

这几条***fence**指令是支持SSE/SSE2的x86处理器才引入的内存访问序列化指令，在这里起了内存屏障的作用。注意，实现中还给加了编译内存屏障的功能，也就是这几个处理器内存屏障也包含编译器层次的内存屏障。

 * 如果处理器**不支持**SSE/SSE2特性，则这几个内存屏障API的对应实现如下：

        #define mb()    asm volatile("lock; addl $0,0(%%esp)":::"memory")
        #define rmb()   asm volatile("lock; addl $0,0(%%esp)":::"memory")
        #define wmb()   asm volatile("lock; addl $0,0(%%esp)":::"memory")

其中关键的是**lock**指令，读写内存的指令在发起时，处理器会向总线发出一个lock#的信号，阻塞住其它内存访问请求，它禁止处理器乱序，并保证内存访问操作会以同样的顺序被其他处理器观察到。这种做法就实现了内存屏障的作用。

至于`smp_read_barrier_depends()`API, 前一篇文章说过，这种内存屏障的引入只是因为**DEC ALPHA**极其松散的内存模型引发的这种奇怪的数据依赖乱序，而别的所有处理器都有严格保证了这种情况下不会乱序，所以，可以看到**x86**架构上该API实现为空操作。

内核中还有其他一些接口隐含地包含了内存屏障的功能，如**各种加锁原语**, **关中断函数**, **调度函数**, **睡眠与唤醒函数**, 等等。详细可以查阅内核文档`Documentation/memory-barriers.txt`。


# 何时需要使用内存屏障API

其实内核开发中大部分时候都不须要直接与这些内存屏障API直接打交道，即使需要也大部分被更直观的函数代替，因为这些函数的实现中就封装了内存屏障，典型的就是各种锁的使用。

内核文档`Documentation/memory-barriers.txt`列举了四种需要使用内存屏障API的情况。

### 1.处理器间的互操作
  
典型情况就是处理间通过某个或某几个全局状态/变量进行通信，比如信号量的实现。

### 2.原子操作

技术上来说，这种情况其实属于第一种情况，也是处理器间就共享变量的互操作。所有修改了共享内存中的某个位置并返回该位置的状态(旧值或新值)的原子操作，都暗含着需要一个条件性的SMP通用屏障(`smp_mb()`)。

但不是所有原子操作都包含内存屏障的语义，比如`atomic_read`和`atomic_set`就没有。更多参阅内核文档`Documentation/atomic_ops.txt`。

### 3.访问设备

如前文所说，很多设备都以**内存映射IO(MMIO)**的方式访问，即读/写设备控制器跟读/写内存位置一样。对于这样的方式，如果处理器或编译器重排了指令，可能导致错误的行为，甚至损坏设备。Linux内核中的访问API如`write*()`或`read*()`都能正确地处理这种情况，因为它包含了必要的内存屏障。

### 4.中断操作

当设备驱动程序在一个处理器上操控设备，比如往某个地址控制寄存器写入端口，并往数据寄存器写入数据，另一个处理器上发生了中断，该设备的中断处理程序被调用， 它也往设备进行写入端口，读出数据的操作， 这两个交织的控制流可能会被处理器乱序，从而产生错误的操作。在大多数情况下，这种情况不会发生，因为这种情况下的I/O访问都会被严格的序列化，但如果没有的话，就要加入必要的I/O内存屏障，比如`mmiowb()`。


## 参考：

* 内核文档`Documentation/memory-barriers.txt`
* [DEC ALPHA CPU](http://www.rdrop.com/users/paulmck/scalability/paper/ordering.2007.09.19a.pdf)
* [Memory consistency models for shared-memory multiprocessors](http://www.hpl.hp.com/techreports/Compaq-DEC/WRL-95-9.pdf)

  <center><strong>* * * * * * 全文完 * * * * * * </strong></center>

