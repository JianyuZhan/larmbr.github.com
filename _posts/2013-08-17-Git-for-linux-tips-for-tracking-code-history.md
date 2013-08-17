---
layout: post
title: "Git for Linux: 追踪代码历史的技巧"
tagline: "Git for Linux: tips for tracking code history"
description: ""
tags: [Linux内核, Git]
---
{% include JB/setup %}



![图片]({{ site.post_img_path }}/linux-first-commit-in-git.png)

<right> <strong></strong></right>

   
<br/> 
配图是Linus把其Linux内核版本库迁移到Git的第一个提交信息, 此时距离其开始开发Git仅仅过去13天!


Git作为一个版本控制工具, 不单只在Linux内核开发过程居功至伟, 而且在阅读代码过程中, 也堪称神器。且不妨称`ctags`和`cscope`作为**横向**阅读代码的利器, 这两个工具都能记录当前代码符号定义与引用, 可谓旁征博引, 纵横捭阖, 让人在代码汪洋中不至于迷失; 但它们也有劣势: 无法记录代码的历史变更, 无从追溯代码的前世今身。不过Git弥补了这一缺憾, 可称之其为**纵向**阅读代码的利器, 追根溯源, 探赜索隐, 无往而不利。

下面介绍几条在阅读Linux代码过程中的小技巧(以下都是以跟踪着Linus的**mainline tree**[[1]](#jmp1)为前提)。

* **查看某次提交的信息**

  如果知道某个commit ID或其它引用格式(关于git的各种引用格式, 详阅**man git-rev-parse中SPECIFYING REVISIONS一节**), 运行

      git show <commit Id/revspec>

  就可以查看以下重要信息:

   * 本次提交修改了什么代码, 动了哪些文件, 增加(删除)了哪些代码。
   * 本次提交的提交信息, 一般作者会解释这次提交的**原因**, **解决了什么问题**, **如何解决**, 等等, 这些信息对理解代码相当重要。

<br/>

* **查看某个版本的代码库**

      git checkout -b <分支名> <某个版本>

  这条命令检出某个版本(比如v3.10)的代码库, 到一个临时的分支, 分支名可任取。**出于学习研究目的的话, 最好选择某个发行版本的代码**(用`git tag -l`可查看有哪些版本)。原因有**三**:

   * 如果每天都跟`mainline`同步代码的话, 那么除了发布时间节点为外, 你的代码库总是处于某个不确定状态: 要么刚合并了某个分支, 要么(稍好些), 刚发布了某个版本的第N个候选版(如: v3.X-rcN)。之所以称之为**不确定**是因为此时正在开发周期中, 代码还未正式发布, 还不**稳定**, 换言之, 可能被修改, 甚至被撤消。因此, 这种代码不适合作学习研究用。
   * 研究代码过程中, 少不了`ctags`和`cscope`这两个利器。不过, 每次代码一变动, 就要重新生成这两个工具的数据库文件, 这是件很烦人也费时的事。
   * 时不时地可能会在代码中作上自己的注记或解释, 如果是在**master**分支的话, 很可能一更新代码就会有冲突; 检出到另一个分支, 就不会有这种问题。

<br/>

* **追踪特定文件的变化历史**

      git log --follow <文件名>

  运行这条命令, 就可以追踪某个文件从诞生以来的变化历史。好处有**二**:
  
  * 跟踪该文件的历史变化过程, 可以详细**了解该模块代码的发展历程**。尤其是, 结合前面的`git show`命令给出的提交信息, 更**深入地了解发展变化的原因**。
  * 了解该文件最后一次改动的时间, 从侧面**了解该模块的稳定程度与开发热度**, 从而**决定是深入详读还是大致略读**。对于稳定的代码, 可详读; 而对于还在热烈开发中的代码, 也许代码还会变, 略读可能更合适。

<br/>

* **追踪文件内容的变化历史**

   前一个命令可能从文件的视角, 宏观地把握变化方向, 当深入阅读代码时, 还需要另一个命令, 来帮助追踪了解具体的代码的变化。

      git blame -C -L <start>,<end> <文件名>

   该命令可以小到**行的粒度**来了解代码的变化历史, `-C`选项可以追踪**某行代码之前是位于哪个文件中的**, `-L`选项则是选定**行范围**, 这样对于很大的文件, 对整个文件运行该命令可能会比较久, 指定感兴趣的行范围可以缩短时间。这两个选项都是**可选的**。

   **使用场景:**

   * 该命令会输出每一行引入的**时间**, **作者**, **commit ID**, 有了这些信息, 或者用`git show`命令阅读作者引入时的提交信息, **了解该改动的原因和做法**; 或者, 利用这些信息, 加上`lkml`关键字, 用Google搜索邮件列表存档, **更深入了解当时开发者们对这一变动的所解决的问题, 解决方法的讨论**。

<br/>

* **确定某次变化是哪次提交引入的**

   设想某本内核书籍(旧内核版本)提及一个数据结构, 但在你当前阅读的代码里却没有这个结构, 你想知道是哪次提交删除了这个结构的, 为何删除, 这其中蕴含着二分查找的思想, 因此, `git bisect`命令是完成这一工作的不二选择。

      git bisect start HEAD  <旧版本>  --no-checkout
      git bisect run sh -c 'git show BISECT_HEAD:<包含那个结构的文件路径> | grep -q "struct <结构名>"'

   第一条命令, 指定了查找的范围, `--no-checkout`表示对于每一次检查, 不检出当前版本库, 以加快速度。

   第二条命令, 运行一个shell命令, 检查当前版本库中文件中是否包含所有考察的结构, 有则返回0, 无则返回一个非0值(本例中是`grep -q`的返回值, 非0值必需在1-127之间, 包括127, 但排除125, 详见**man git-bisect**)。`BISECT_HEAD`指代当前正在检查的版本。

   当这两条命令运行结束, 引入变化的提交就被找到了。然后, 用前述的`git show`可以查看该次提交的说明和内容, 以了解改变的原因。



<br/>
# 实例演示 
<br/>

当从[这篇文章](http://lwn.net/Articles/211505/)了解到**Mel Gorman**引入**迁移类型(Migration Type)**以解决内存碎片问题的补丁时, 我想了解它们是**何时引入mainline**, **如何演变的**, 是这么做的:

   * 我知道相关的关于**Migration Type**的定义在`include/linux/mmzone.h`中:

        enum {
             MIGRATE_UNMOVABLE,
             MIGRATE_RECLAIMABLE,
             MIGRATE_MOVABLE,
              ...
        }

     运行

        $ git log --oneline --follow include/linux/mmzone.h
  
     然后从输出中**提交信息中**搜索关键字眼, 比如"**MOVABLE**", 找到最早出现的提交, 用`git show`查看,  然后依次顺藤摸瓜, 接下来查看以后的每次提交, 看是否有关于这一部分的代码。

    这种方法局限在于:
    * 提交信息中**不一定存在**这个字眼, 所以, 对**关键字的选取很重要**。假设查不到, 可能会用"migration"等。
    * 以后每次都检查是个费力的工作。 好在可以用**脚本自动化**完成这一工作,  比如用`git show`显示之后的每一次提交变更的内容, 查找该关键字, 若存在, 则记录下该次的commit ID。
    * 有可能存在某次修改是关于这部分内容的, 却**没有修改到这个文件**。这种比较棘手, 但是, 考虑到, 比如前面这个`enum`定义是重中之重, 不触及这部分的修改的可能性比较小; 而且, 作为了解发展脉络, 失却一两次提交可能不是大问题, 所以, 这个问题影响不大。

<br/>

  * 前一个做法是**自底向上**, 接下来的做法可称为**自顶向下**。

    同样从`enum`定义这部分定义入手, 在我当前代码中, 这部分大概是位于`include/linux/mmzone.h`文件的`第38一第41行`, 运行:

        $ git blame -C -L 38,41 include/linux/mmzone.h
        47118af0 (Michal Nazarewicz 2011-12-29 13:09:50 +0100 38) enum {
        47118af0 (Michal Nazarewicz 2011-12-29 13:09:50 +0100 39)       MIGRATE_UNMOVABLE,
        47118af0 (Michal Nazarewicz 2011-12-29 13:09:50 +0100 40)       MIGRATE_RECLAIMABLE,
        47118af0 (Michal Nazarewicz 2011-12-29 13:09:50 +0100 41)       MIGRATE_MOVABLE,

    发现: 作者不是**Mel Golman**, 说明有人改动过, 于是, 运行

        $ git show 47118af0

    查看提交说明及提交内容, 发现:

        -#define MIGRATE_UNMOVABLE     0
        -#define MIGRATE_RECLAIMABLE   1
        -#define MIGRATE_MOVABLE       2
        -#define MIGRATE_PCPTYPES      3 /* the number of types on the pcp lists */
        -#define MIGRATE_RESERVE       3
        -#define MIGRATE_ISOLATE       4 /* can't allocate from here */
        -#define MIGRATE_TYPES         5
        +enum {
        +       MIGRATE_UNMOVABLE,
        +       MIGRATE_RECLAIMABLE,
        +       MIGRATE_MOVABLE,

    原来这一次提交中把**宏定义**变为**enum定义**。于是, 回退到**这一次提交的前一次**, 即**宏定义**的版本

        $ git checkout -b temp 47118af0^

    然后, 重复用`git blame`命令, 找出上一次修改这部分代码的提交, 如此递推, 可以找到最开始引入这部分代码的提交。

    值得一提的是, 上面用的是`git checkout`命令检出到另一个临时分支, 这之后的回退, 由于已经在`temp分支`了, 运行`git reset <commit>^`即可。研究完成之后, 可以运行`git branch -D temp`把这一分支删掉。

    同样, 这种方法可以用**脚本自动化**。

    <center><strong>* * * * * * 全文完 * * * * * * </strong></center>
    
<span id="jmp1">[1]: 追踪Linus的mailine tree, 运行**git clone git://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git**。</span>

