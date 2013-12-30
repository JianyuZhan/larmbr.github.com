---
layout: post
title: "X86汇编调用框架浅析与CFI简介"
tagline: "x86 assembly call frame and dwarf CFI introduction"
description: "x86 assembly call frame and dwarf CFI introduction"
category: c与汇编
tags: [x86, 汇编, CFI]
---
{% include JB/setup %}

  [阅读本文仅需要一点x86汇编的知识。另, 本文的汇编使用AT&T语法]

  在内核代码调试中, 或是漏洞分析中, 学会看懂backtrace或是熟悉汇编, 都是基础之功。这中间都牵涉到一个叫**调用框架(call frame)**的概念, 这个名词也叫**栈帧(stack frame)**或**活动过程记录(activation record)**。所谓调用框架就是指称一个**函数**(或**过程**,或**方法**)被调用时位于内存中的一块区域, 其中保存着该函数体运行所需要的信息。这其中涉及到几点重要的考量:

   * 函数拥有明显的生存周期界限。在被调用进入执行第一条函数体指令时开始存在, 在返回调用者时消亡。
   * 函数可以输入参数以改变具体行为, 而具体参数值在运行时确定。
   * 函数可以被多次调用, 比如以循环或递归方式。

综合这些考量, 现代的硬件与操作系统一齐合作, 提供了一种方案, 就是**调用框架**:

    操作系统在进程的地址空间中提供一块区域, 每当一个函数被调用, 就在其中开辟一段区域, 这段区域存放着函数活动过程的重要信息的记录, 当其返回时, 这块区域就被销毁, 这是`活动过程记录`得名的缘由。
    函数调用链是一个`先入后出`的结构: A调用B, A的生命流程总比B长, 这块区域也体现了这种结构: 调用链上每个函数的活动记录都以先入后出的方式组织在这个区域中, 所以这块区域被叫做`栈`, 每个活动记录被叫做`栈帧`。
    现代的CPU, 几乎都提供了实现这种栈的硬件支持: 有一个`寄存器SP`(stack pointer), 指向当前活动记录的顶端, 还有一个`寄存器BP`(base pointer),指向栈底。


   下面就x86架构的调用框架进行分析。

# x86的调用框架

   下面是一个函数示例代码:

     /* demo.c */
     int demo(int a, int b) {
         long l1 = 1;
         int l2 = 2;
         return l1 + l2 + a + b;
     }

     int main(void) {
         demo(37, 42);
         return 0;
     }

   编译成汇编代码, 用`-O0`选项, 表示不优化, 以生成可以和原始代码逐条对应的目标代码:

    $ gcc --version
      gcc (Ubuntu/Linaro 4.7.2-2ubuntu1) 4.7.2
    $ gcc -O0 -o demo.s -S demo.c 

   结果如下, `main函数`只取一部分:
    
    原始版                                 简化版   
    demo:                                  demo:       
    .LFB0:                                     pushl  %ebp
    	.cfi_startproc                         movl   %esp, %ebp
    	pushl	%ebp                           
    	.cfi_def_cfa_offset 8                  subl   $16, %esp
    	.cfi_offset 5, -8                      movl   $1, -8(%ebp)
    	movl	%esp, %ebp                     movl   $2, -4(%ebp)
    	.cfi_def_cfa_register 5                
    	subl	$16, %esp                      movl   -4(%ebp), %eax
    	movl	$1, -8(%ebp)                   movl   -8(%ebp), %edx
    	movl	$2, -4(%ebp)                   addl   %eax, %edx
    	movl	-4(%ebp), %eax    ----- >      movl   8(%ebp), %eax
    	movl	-8(%ebp), %edx                 
    	addl	%eax, %edx                     addl   %eax, %edx
    	movl	8(%ebp), %eax                  movl   8(%ebp), %eax
    	addl	%eax, %edx                     addl   %eax, %edx
    	movl	12(%ebp), %eax                 movl   12(%ebp), %eax
    	addl	%edx, %eax                     addl   %edx, %eax
    	leave                                  
    	.cfi_restore 5                         leave
    	.cfi_def_cfa 4, 4                      ret
    	ret
    	.cfi_endproc

    main:
        ...
        movl    $42, 4(%esp) // 把42赋给%esp指向地址再加4字节的位置
        movl    $37, (%esp)
        call    demo

   左边为原始版本, 掺杂了许多包含`.cfi_*`的指令, 这部分放在本文最后讲述。 所以, 现在就上图右边的简化版本来进行讨论。

## 传参 
   
对于x86架构, 前述的**SP**与**BP**寄存器分别是`esp`和`ebp`。包括x86在内的几乎所有现代的机器, 栈都是**从高地址向低地址生长**的, 一个例外是**HP的PA-RISC机器**[[1]](#jmp1)。

在`main函数`中, 有两条`mov`指令, 明显是执行**传参**的动作。在调用`demo函数`的指令`call demo`执行前, 栈是如此的形态:

     高地址  :          :
        |   |    42    |
        |   +----------+ <--- %esp + 4
        |   |    37    | 
     低地址  +----------+ <--- %esp

注意参数是以**从右到左**的方式传入的, 至于其原因, 后文再解释。

## 前序

在`call demo`指令执行后, 就进入了`demo函数`的活动范围, 在其运行结束后, 控制流程又会返回到`main函数`的活动范围。这种嵌套结构, 本质地要求要记录下**两层结构交汇点**的信息, 以便在底一层结构消除后, 返回到上一层。 

从CPU的观点来看, 由于它的**指令寄存器**`eip`存放的是下一条指令的地址, 这就要求: 在函数最后一条指令执行后, `eip`中能正确存放函数之后的下一条指令的位置, 术语叫**返回地址**, 这意味着这个**返回地址**必须存在某处以方便获取。由于一个CPU执行单元只有一个`eip`, 而在函数执行过程中, `eip`会被不断改变, 所以,  **返回地址**显然不能放在其中。通用的解决方案是: **把返回地址放在调用框架中, 作为其保存信息的一部分。**

所以, `call demo`的效果是:  **返回地址**会被CPU自动压到栈上, 然后, `eip`中被装入`demo函数`第一条指令地址, 由此, 实现了函数调用。此时, 栈的形态是:

     高地址  :          :
        |   |    42    |
        |   +----------+ <--- %esp + 8
        |   |    37    | 
        |   +----------+ <--- %esp + 4
        |   | 返回地址  |
     低地址  +----------+ <--- %esp

在`demo函数`的前两条指令, 执行了很奇怪的操作: 先把旧的`ebp`压栈, 再把当前的`esp`赋给`ebp`, 此时两个寄存器都指向同一位置。 栈形态如下:

     高地址  :          :
        |   |    42    |
        |   +----------+ <--- %esp + 12
        |   |    37    | 
        |   +----------+ <--- %esp + 8
        |   | 返回地址  |
        |   +----------+ <--- %esp + 4
        |   | 旧的ebp   |
     低地址  +----------+ <--- %esp(%ebp) 
                         
这两步操作是个规范化步骤, 叫做**前序(prologue)**, 它有两个作用 :

   *  **标记一个新的调用框架**。保存前一个函数的调用框架的基址(旧的`ebp`), 使`ebp`指向当前函数的调用框架基址。

   * 在函数的执行过程中, 函数的**局部变量**将会是在**返回地址**之下的区域开辟空间来存放, 由于`ebp`是固定的, 可以用它作标杆, 标示参数与局部变量的位置。比如第一个参数位于`%ebp + 8`, 第二个参数位于`%ebp + 12`。也正是这个原因, 参数采用**从右到左**传递, 对实现**可变参数**有利: 通过`%ebp + 8`获取第一个参数后, 可从中获知参数个数, 然后, 依次偏移, 即可获取各个参数。

## 局部变量

上面的汇编代码中, 在**前序**后, 开始第一条指令, 它把栈顶`esp`向下推了16字节。这一步的作用是**为局部变量开辟空间**。本例中只有两个局部变量, 且两者在x86上都分别是4字节, 按理说, 只要开辟8字节的空间即可, 本例中却开辟了16字节。这是因为**GCC的栈上默认对齐是16字节**[[2]](#jmp2)。

之后, 局部变量也可以由`ebp`来访问。比如本例中, l1与l2分别由` %ebp - 8`和`%ebp - 4`来表示。如图:

     高地址  :          :
        |   |    42    |
        |   +----------+ <--- %esp + 12
        |   |    37    | 
        |   +----------+ <--- %esp + 8
        |   | 返回地址  |
        |   +----------+ <--- %esp + 4
        |   | 旧的ebp   |
        |   +----------+ <--- %esp(%ebp) 
        |   |    l2    |
        |   +----------+ <--- %ebp - 4
        |   |    l1    |
     低地址  +----------+ <--- %ebp - 8 

## 尾声

在函数执行完, 就可以`ret`指令返回。注意前面有一条`leave`指令, 它等效于以下两条指令:

    movl %ebp, %esp
    pop %ebp

这两条指令叫**尾声(epilogue)**, 可以看出, 它与**前序**相照应。执行完这两条指令后, `ebp`恢复为`旧的ebp`, 即指向调用者的基址, `esp`则指向**返回地址**。最后的`ret`指令, 弹出**返回地址**到`eip`中, 由此, 便完成了从被调用函数到调用函数的返回。


# CFI: 调用框架指令

在了解了**调用框架**之后, 就能明白**CFI**的作用了。**CFI**全称是**Call Frame Instrctions**, 即**调用框架指令**。

**CFI**提供的调用框架信息, 为实现**堆栈回绕(stack unwiding)**或**异常处理(exception handling)**提供了方便, 它在汇编指令中插入**指令符(directive)**, 以生成**DWARF**[[3]](#jmp3)可用的堆栈回绕信息。[这里](http://sourceware.org/binutils/docs/as/CFI-directives.html#CFI-directives)列有gas(GNU Assembler)支持的**CFI指令符**。

接下来分析上面的例子中出现了几个**CFI指令符**。

在一个汇编函数的开头和结尾, 分别有`.cfi_startproc`和`.cfi_endproc`标示着函数的起止。被包围的函数将在最终生成的程序的`.eh_frame段`中包含该函数的**CFI记录**, 详细请看[这里](http://refspecs.linuxfoundation.org/LSB_3.0.0/LSB-Core-generic/LSB-Core-generic/ehframechpt.html)。

1 `.cfi_def_cfa_offset 8`一句。该指令表示: **此处距离CFA地址为8字节**。这有两个信息点:

   * `CFA`(Canonical Frame Address)是标准框架地址, 它被定义为**在前一个调用框架中调用当前函数时的栈顶指针**。结合本例看, `CFA`如图所示:


        高地址  :          :
           |   |    42    |
           |   +----------+ <--- %esp + 12
           |   |    37    | 
           |   +----------+ <--- %esp + 8  <--- CFA
           |   | 返回地址  |
           |   +----------+
           |   | 旧的ebp   |
        低地址  +----------+ <--- %esp(%ebp) 

  * 至于此处指的是`esp`寄存器指向的位置。在`push %ebp`后, `esp`显然距离`CFA`为8字节。

2 `.cfi_offset 5, -8`一句。

把第5号寄存器[[4]](#jmp4)原先的值保存在距离`CFA - 8`的位置, 结合上图, 意义明显。

3 `.cfi_def_cfa_register 5`一句。

该指令是位于`movl %esp, %ebp`之后。它的意思是: 从这里开始, 使用`ebp`作为计算CFA的基址寄存器(前面用的是`esp`)。

4 `.cfi_restore 5`和`.cfi_def_cfa 4, 4`这两句结合起来看。注意它们位于`leave`指令之后。

前一句意思是: 现在第5号寄存器恢复到函数开始的样子。第二句意思则是: 现在重新定义`CFA`, 它的值是第4号寄存器(`esp`)所指位置加4字节。这两句其实表述的就是**尾声**指令所做的事。意义亦很明显。


   <center><strong>* * * * * * 全文完 * * * * * * </strong></center>


<span id="jmp1">[1]: 关于栈生长方向的讨论, 可以看看<a href="http://programmers.stackexchange.com/questions/137640/why-does-the-stack-grow-downward">这个帖子</a>。</span>

<span id="jmp2">[2]: 关于GCC的栈对齐值, 查看<a href="http://gcc.gnu.org/onlinedocs/gcc-4.7.3/gcc/i386-and-x86_002d64-Options.html#i386-and-x86_002d64-Options">GCC文档</a>**-mpreferred-stack-boundary**选项。</span>

<span id="jmp3">[3]: **DWARF**是一种<a href="http://dwarfstd.org/">调试信息格式</a>。</span>

<span id="jmp4">[4]: x86的8个通用寄存器依次分别是: **eax, ebx, ecx, edx, esp, ebp, esi, edi**。</span>
