---
layout: post
title: "Java Happen-before 内存模型浅谈"
tagline: "Java Happen-before memory model"
description: "Java Happen-before memory model"
categories: [多线程编程]
tags: [Java, 同步机制, 内存模型]
---
{% include JB/setup %}

并发环境下的内存模型，是个很有趣又值得讨论的问题。本文探讨Java的**Happen-before** 内存模型。

## 内存模型(Memory Model)

无论是处理器这一层级的裸机，还是构建于裸机上的编程语言所建立的运行时环境(这是更高层级的机器)，获取输入，执行，输出结果, 程序的**因果性(Causality)**都是本质的要求。

其中在单线程 情况下，这种因果性是由处理器内禀地保证的。也就是说，单一的执行流, 有下列指令序列：

例1:

    A = 1; 
    r1 = A;

执行完r1的结果一定保证是1. 这是直观的，毋庸置疑的。所以，可以这么说，单线程情况下，不需要内存模型，底层的处理器已经保证这一切了。

到了多线程情况下，事情复杂了。复杂的原因是线程访问共享的内存，从而带来的同步问题。同样的，每个线程内部的私有内存对象访问的因果性，仍是由线程内部内禀地保证。但对于共享的内存对象，因果性的保证就复杂了。执行流的同时性，指令乱序，把程序本身的顺序性减弱了，甚至打破了。因此须要定义明确的约束，来保证对于共享对象的时间顺序上的序列化，从而保证因果性。这就是内存模型存在的作用。

比如，内存模型至少需要提供以下保证：

* **依赖性的内存访问必须序列化。** 即：

      A = &V;
      B = *A;

  B的值依赖于A的地址取值，必须序列化。　

* **对同一个内存对象的重叠读写必须序列化。**即如例１所言。

## 顺序一致性内存模型(Sequential Consistency)

这是一种最强的内存模型。看看他的发明者Leslie Lamport对它的定义：

>** the results of any execution is the same as if the operations of all the processors were executed in some sequential order, and the operations of each individual processor appear in this sequence in the order specified by its program.**

本质上，这种模型是把直观的单线程顺序向多线程推广。线程内部的指令是按程序顺序执行的，而线程之间的序列化则依赖于对共享内存对象访问的序列化。从而，整个程序获得了顺序一致性：

* **线程内是顺序化的，线程内因果性得到保证。**
* **线程间依托对共享内存对象的序列化，从而保证线程间的因果性。即Ｔ１对内存对象M的写操作，可以被立即被其它线程观察到。**

这种模型的效率低下，因为它阻止了运行时环境发挥可能的cache的能力，阻止处理器乱序，以最大化并行度. 没有处理器/编程语言采取这种模型(？)。Java也不例外。

## Java 旧内存模型存在的问题

事实上Java之前采取的内存模型相当激进，或者说宽松，从而引起一些奇怪的问题。比如，之前的内存模型上，volatile的语义无法真正保证的。 volatile本意是保证volatile变量每次从内存中读取，以获得可能的由别的线程修改的新值，即**对volatile变量的访问无法被乱序：对它的读一定保证在对它的最近一次写之后**。但之前的内存模型，**并未阻止编译器的对volatile变量和非volatile变量的乱序行为。**这意味着volatile的语义可以被破坏：

这是网上找的例子:

例2:

    class VolatileExample {
      int x = 0;
      volatile boolean v = false;
      public void writer() {
        x = 42;
        v = true;
      }
    
      public void reader() {
        if (v == true) {
          //uses x - guaranteed to see 42 ? Not guaranteed prior JSR 133 !
        }
      }
    }

volatile变量v相当于一个标志，用来通知读者线程：可以读取x值。但是，**编译器或运行时环境可以对volatile变量v和非volatile变量x乱序. 从而可能读者发现v为true时，读取x值时，x还没被赋值为42! 这在旧Java内存模型中没被禁止。**

## Happen-Before

**JSR133**[[1]](#jmp1)修复了之前的内存模型，并引入了**Happen-Before**的概念，用于约束一些tricky的奇怪的可能行为。

**Happen-Before** 是一种严格偏序顺序。这是个数学上概念，可以借助对应的全序的概念来理解严格偏序。**全序(total order)**是指在一个集合上的一种二元关系Ｒ，任意取集合中的两个元素，e1,e2, 在这种关系的意义下，都是可比较的。举例：自然数集合，Ｒ表示“小于等于”，那么任意两个自然数N1, N2，在“小于等于”意义下，一定是可以比较的: 要么N1 <=N2, 要么N2 <＝ N1. 

而**严格偏序(strict partial order)**，从名字上看是更像是部分的顺序，抛开定义，它表示一个集合上的一种二元关系Ｒ，任意取集合中的两个元素，e1,e2, 在这种关系的意义下，可能可以比较，也可能不可以比较。举例：自然数集合上的‘<’关系。

**Happen-Before** 就可以类比于自然数集合上的‘<’关系。它作用于程序的所有可能的指令执行顺序集合的子集，规定了**“在……之前发生”**这种顺序。这个子集的定义在所以可能发生Data Race的地方，其它地方，依旧赋予编译器和运行时环境很大的自由，可以乱序，可以利用缓存，来提高效率。

其中定义的子集，也就是必须遵守 **Happen-Before** 的地方[[2](#jmp2)有：

    An unlock on a monitor happens-before every subsequent lock on that monitor.
    A write to a volatile field happens-before every subsequent read of that field.
    A call to start() on a thread happens-before any actions in the started thread.
    All actions in a thread happen-before any other thread successfully returns from a join() on that thread.
    The default initialization of any object happens-before any other actions (other than default-writes) of a program.

解释下：

* 4.１. T1释放锁L，必须发生在，紧接着，T2获取锁Ｌ这件事之前。这是符合直觉的，也是锁提供互斥和同步的根本（参看我之前的文章[锁与内存屏障](http://larmbr.me/2014/11/14/locking-vs-memory-barriers/)）
* 4.2. 这个保证可以解决对volatile变量和非volatile变量的乱序, 从而解决例2中的问题。


##  Happen-Before并不足够

**Happen-Before**貌似可以决问题了，但如规范中所说，并不够。因为**Happen-Before本质上等同于有向无环图**。这样，大部分情况下，指令序列是不会形成闭环的，所以Happen-Before 能保证正确的序列化，因而保证因果性。

但是，如[规范中17.4.8](http://docs.oracle.com/javase/specs/jls/se7/html/jls-17.html#jls-17.4.8)所举例子，两个线程的指令序列刚好能形成一个闭环：

    Init:  x == 0, y ==0
    
    Thread 1           Thread 2
    ============       ================
    r1 = x;            r2 = y;
    if (r1 != 0)       if (r2 != 0)
        y = 1;             x = 1;
    
    LOAD x -> STORE 1 to y -> LOAD y -> STORE 1 to x
      |                                       |
      <--------------------------------------<

直观上看, 上例中最后结果应该是**y == 0, x == 0。** 但是，在**Happen-Before**的语义下，可以观察到以下结果：

    r1 = x;  // see write of x = 1
    y = 1;
    r2 = y;  // see write of y = 1
    x = 1;

**这是非常反直觉，并且应该是被认为错误的！**

但是，**Happen-Before**的语义神奇地允许这样的事发生！看上面图中的环，我们可以看到，Store 1 to x 是**Happen-Before** Load x 的。

也许你会argue: **r1读取的是未发生的x = 1的值, 这怎么可能!** 但注意, **Happen-Before并不要求时间顺序上的前后**, 规范中**17.4.5**有这样一句话:
> **It should be noted that the presence of a happens-before relationship between two actions does not necessarily imply that they have to take place in that order in an implementation. If the reordering produces results consistent with a legal execution, it is not illegal.**


所以，Java的内存模型中要求实现应该注意上例这种可能，以免出现这种奇葩的结果，这也是Java Memory Model作者之一的Jeremy Manson 的文章：[Java Concurrency (&c): Causality and the Java Memory Model](http://jeremymanson.blogspot.com/2007/08/causality-and-java-memory-model.html)中所表达的，因果性的正确保证，你要保证这两点：

    That write happened before it, or
    You have already justified the write.

第二条就是额外加的限制。针对上面的例子，如果我们认可 x = 1 发生是合法的，那么自然也就应该接受这种奇葩的结果：r1居然可以读到未来的写到x中的值，但这正是**Happen-Before**语义允许的。如果我们不认可x = 1 的发生，那就能排除这种结果。

从规范上看，Java现在的内存模型是不允许的，而这是虚拟机实现者应该认真关切的。


  <center><strong>* * * * * * 全文完 * * * * * * </strong></center>

参考:

<span id="jmp1">[1]: <a href="http://www.cs.umd.edu/~pugh/java/memoryModel/">The Java Memory Model</a></span>

<span id="jmp2">[2]: <a href="http://docs.oracle.com/javase/specs/jls/se7/html/jls-17.html#jls-17.4.4">Java Language Specification 17.4.4</a></span>
