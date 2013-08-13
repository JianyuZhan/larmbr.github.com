---
layout: post
title: "Linux内核发布模式与开发组织模式(2)"
tagline: "Linux kernel release process and developemnt lieutenant system(2)"
description: ""
tags: [Linux内核, 内核开发]
---
{% include JB/setup %}

在[Linux内核发布模式与开发组织模式(1)](./2013/08/10/Linux-kernel-release-process-and-developemnt-lieutenant-system_1) 一文中讲了Linux内核发布模式的演变历程, 这篇文章讲述Linux内核的开发组织模式, 顺带地, 会描述几个Linux内核开发者必须知道的重要的内核分支。


# 开发组织模式

Linux在v2.6版本释出后, 逐渐形成了一套稳定的发布模式, 相应地, 也形成了一套**基于信任链**的层级组织模式。虽说Linux是去中心化的全球合作开发的典型案例, 但项目发展到庞大如斯, 仍然会有一个中心, 这个中心就是Linus本人维护的**mainline tree**(也叫**vanilla tree**)。在前文说的发布模式的稳定下来后, 这个分支会定期地(2-3个月)发布一个版本, 是为2.6时代的**v2.6.X**, 及3.0时代的**v3.X**。

全球的开发者贡献的补丁, 基本都以进入**mainline**为愿。早在10来年前, Linux的规模就已经不是一个人能掌控得了, 没有一个人能亲自review所有的补丁。因此, Linux在发展过程中逐渐探索出一套叫developemnt lieutenant system的**金字塔式层次组织模式**: 

    Linus作为项目领导者, 掌控大局, 把握项目发展方向。若干核心开发者, 则各自维护自己的以`mainline`为upstream的分支, 或者负责某一子系统, 比如核心子系统, 内存管理子系统, etc; 或者负责一个特性分支, 作为新功能试验场, 然后再把可接受的新功能并入`mainline`。而子系统分支下, 可能又有细分的分支, 由若干维护者专门维护。正是这种基于`信任链`的层级模式, 有效地组织起全球数以千计的开发者。

从v2.6时代, 确立并持续到今天的一个新版本的开发流程大概是这样的[[1]](#jmp1):

1. **合并窗口打开**

   从v2.6.14起, Linux就引入一个叫**合并窗口(merge window)**的概念, 这是一个**持续两周**的时间窗口。伴随着上一个版本的发布, 下一个新版本的开发就宣告开始, Linus会开启这个合并窗口, 在此期间, 各个子系统的维护者向Linus发出请求, 请求合并自己维护的子系统分支中, 精心挑选的新特性或新功能补丁。当然, 这些补丁不是凭空而来, 在这之前, 这些补丁很早就进入该子系统维护者的分支, 经历了若干测试了。两周时间一到, 合并窗口关闭, 基本该新版本所有的新功能确定, Linus释出第一个候选版本, 是为**rc1**(release candidate)。

   这个rc1也面向所有用户开放下载, Linus等开发者们的希望当然是鼓励更多的用户去帮忙测试。没有来得及在这个合并窗口中进入**mainline**的, 只有等待下一个版本的合并周期了[[2]](#jmp2)。

2. **发布若干轮候选版本**

   在发布了第一个候选版本rc1后, 距离真正发布这个新版本还有6到10周。原因是: 这些代码虽然在这之前有经过特性分支的测试, 但正如前一篇文章所说, 实际上少有开发者或用户愿意去测试特性分支, 因此, 测试的覆盖度或强度其实不如预期, 所以, 接下来这6至10周, 就是要使这些代码稳定的过程: 修补bug, 修补安全漏洞, 消除regression[[3]](#jmp3), 等等。Linus大概每周就发布一个rc版本, 比如2.6.X-rc2, 2.6.X-rc3, etc。

   当然, 开发者们也希望能有更多的用户可以在各种各样的平台上测试这些候选版, 但如前一篇文章所言, 事实上也少有用户去测试。**对于准备入门内核开发的人来说, 帮忙测试这些候选版, 可以发现很多问题, 并设法解决, 这是一个被鼓励的做法。**

   何时认为**代码已经稳定**了呢? 内核开发者们的目标是, **尽量**消除上一个发行版中的已知的regression。不过现实难有这么美好, 有些不是太严重的regression如果仍无法消除, 内核开发者也会暂时放过(毕竟, 不能无限期拖下去, 因为各个子系统的维护者手中的补丁日渐增加, 都等着下一个合并窗口打开呢, 拖太久对这些维护者来说是个很重的负担)。总之, 若干轮rc版本发布后, 新的版本就会发布!

3. **正式版本发布后的维护**
   
   新版本发布后, Linus会把它转交给一个团队来继续维护, 这个团队就是前一篇文章所说的Greg Kroah-Hartman领导的**-stable分支**维护团队。Linus本人则致力于下一个新版本的开发, 开启新一个**合并窗口**... 

   这个**-stable分支**的起缘上一篇文章已经解释过, 它的目标就是: 把修补bug或安全漏洞的补丁, **向后移植**到这个刚发布的版本中(当然, 这些修补肯定也会进入**mainline**中), 然后不定期地发布一个v2.6.X.Y(或v3.X.Y)的版本。随着每个Y版本号递增, 都会有若干个bug或漏洞被修补。

   这个维护过程大概会持续到下一个新版本发布, 然后这个版本就会被标记为**EOF(End Of Life)**, 不再继续有官方的维护; 但对于一些标明**LTS(Long Term Support)**的版本, 则会持续有长达数年的维护。比如**v3.0**的**-stable分支**, 在本文写作的今日(2013-08-12), 释出了**v3.0.90**, 此时, 距离[**v3.0**发布](https://lkml.org/lkml/2011/7/21/455), 已经过了将近两年又一个月了。


# 重要的内核分支

上面所述就是一个开发流程的大致面貌。如果从补丁的生命流程来看整个开发流程的话, 要牵涉到几个重要的**内核分支[[4]](#jmp4)**

## 各个子系统分支

前文说过, 补丁是经过各层级的分支, 一步步进入**mainline**的。这里有所有放置在[www.kernel.org](http://www.kernel.org)上的各子模块或子系统的[git分支列表](https://git.kernel.org/cgit/linux/kernel)。

**对开发者来说, 提交补丁时, 找到正确的子模块或子系统维护者, 并把补丁提交给到相应的[邮件列表](http://vger.kernel.org/vger-lists.html), 是非常关键的。** 内核代码中有一个脚本: `scripts/get_maintainer.pl`, 可以帮助决定你手头上的补丁, 应该提交给哪个(些)开发者。

## -mm分支

各个子系统维护者的分支代码, 虽然在合并到Linus的**mainline**前已经经过若干测试, 但毕竟只是在自己的子系统内测试, 还必须要有整合测试, 而这通常是暴露出更多问题的地方, 因此非常重要。这个整合测试的分支, 就是由核心开发者[Andrew Keith Paul Morton](http://en.wikipedia.org/wiki/Andrew_Morton_(computer_programmer\))维护的**-mm分支**[[5]](#jmp5)。

前一篇文章说过, 这个分支诞生于2.6发布前的特性冻洁期, 所有要最终进入**mainline**的代码都要经过该分支的测试, 它也是新功能的试验场, 被叫做**特性分支**。该分支主要包含的有:

    各个子系统维护者的代码树
    因各种原因没进入相应子系统的零散补丁
    一些不会进入`mainline`的仅用于debug目的的工具补丁
    一些牵强的还不足以在下个版本中释出的补丁

**另外, 值得一提的是, Andrew 的-mm分支不是用git来维护的, 而是用其开发的[quilt工具](http://linux.die.net/man/1/quilt), 这是一个补丁集管理工具。**

**-mm分支**的无所不包, 产生了不少问题, 导致Andrew不堪重负, 以至后来催生了**-next分支**, 对于子系统测试这一大部分功能被转移到**-next分支**中, 而Andrew则着重负责前述剩下的三种补丁, 这样他有更多的精力来review和测试代码。

后来, 为了满足一些开发者获取更新鲜热辣的**-mm分支**, Andrew又创建了一个新的[-mmotm分支](https://lkml.org/lkml/2008/12/16/327), 取意**-mm tree of the moment**。**现在-mm分支已经慢慢淡化了, -mmotm取代了它。人们谈论-mm, 其实就是谈论-mmotm**。这个分支是基于**mainline**的代码, 差不多一周多就会发布一次, 以补丁集的形式发布, 用户可以用quilt工具把这些补丁应用在该补丁集释出时的**mainline**最新代码上。更多详情, 看[这里](http://www.ozlabs.org/~akpm/mmotm/mmotm-readme.txt)。

## -next分支

[-next分支](http://linux.f-seidel.de/linux-next/pmwiki/pmwiki.php?n=Linux-next.FAQ)是由Stephen Rothwell维护的。前一节说过, 它是Andrew的**-mm分支**衍生的产物, 从Stephen发表的一封宣告该分支诞生的[邮件](http://lwn.net/Articles/268881/)中可以看出该分支诞生的初衷。

旧的**-mm分支**存在几个严重的问题:

    太过庞杂, 旨在作为功能测试场的该分支吸收了n多子系统的代码, 也是许多独立补丁的收集站, 合并所有这些代码的繁重工作导致该分支是几周一个发布。
    如此长的发布周期, 导致问题积累, 不能快速得到修正。因此, `-mm分支`经常存在严重的regression现象。
    前面两点又导致少有开发者愿于基于它来做测试, 因而子系统维护者也就很少测试其它子系统的代码, 这违背了这个分支存在的初衷。

因此, Andrew提出建立**-next分支**的设想, Stephen Rothwell承担了这一分支的维护工作。事实证明, 这一分支很成功:

    基于自动化的构建, 该分支每天都会自动去拉取(截至本文写作)多达222个子系统分支代码, 构建一颗`全新的git tree`。自动完成合并, 并基于几种典型的配置自动编译和运行。如果合并失败, 编译失败, 或运行时失败, 该分支会被剔除出`当天的代码树`, 并通过邮件通知该分支维护者。这样的结果是, 及早地消除问题, 减少在之后的合并窗口中, 被Linus拉取时候, 出现种种冲突或编译失败的可能性。这样相对之前粗糙的`-mm分支`, 稳定了不少, 因而也得到更多的开发者的注意, 从而得到更多的测试。 值得一提的是, 开发者通过拉取该分支代码, 基本就可以窥见下一个版本中即将增加的新功能的全貌，这也是该分支取名`next`的原因。正是这一分支, 及早且频繁地进行各子系统代码的整合与构建, 从而可以确保`合并窗口`期间, 代码进入`mainline`的过程更平和些, 因此, 它是现今Linux开发过程中不可或缺的重要一环。

**作为想入门内核开发的人来说, 我个人觉得每天跟踪这个分支, 并编译测试该分支, 是一个相当不错的入手点**。所以, 有必要说说该分支具体是如何工作的。

1. **跟踪该分支**

   按照这份[FAQ](http://linux.f-seidel.de/linux-next/pmwiki/pmwiki.php?n=Linux-next.FAQ)说明的做法, 可以基于Linus的**mainline分支**, 构建对这**-next分支**的跟踪。

       git remote add linux-next git://git.kernel.org/pub/scm/linux/kernel/git/next/linux-next.git  # 新增一个源, 叫linux-next
       git fetch linux-next  # 把源linux-next上的所有分支都抓取到本地, 对于每一个分支b的当前指向, 存放在本地的remotes/linux-next/b中
       git fetch --tags linux-next # 确保把所有的tag标记及这些标记指向的对象都抓取下来

2. **该分支的构建流程**

   该分支树的最大特点就是: **每天都是一个全新的树, 抛弃之前的历史**。因此, 使用`git pull`来更新是不正确的。当按照前面的做法构建对该分支的跟踪后, **每天获取该树的最新动态的正确做法**是: 

       git remote update linux-next

   从该树源码目录`Next/merge.log`中可以看出, Stephen是如何构建当天这棵树的。下面是从本文写作当天的最新**-next分支**: `next-20130812`抽取出来的操作指令:

       # 解释点1
       $ git checkout master
       $ git reset --hard stable

       # 解释点2
       $ git merge --no-ff origin/master
       $ git merge --no-ff fixes/master
          .
          . (省略若干个git merge --no-ff ...)
          .

       # 解释点3
       $ git merge akpm-current/current
       $ git commit -v -a
       $ git diff -M --stat --summary HEAD^..

       # 解释点4
       $ git am -3 ../patches/0001-memcontrol-further-merge-fix-patch.patch
       $ git reset HEAD^
       $ git add -A .
       $ git commit -v -a --amend

       # 解释点5
       $ git clone -s -l -n -q . ../rebase-tmp

       # 解释点6
       $ cd ../rebase-tmp
       $ git checkout -b akpm remotes/origin/akpm/master
       $ git rebase --onto master remotes/origin/akpm/master-base

       # 解释点7
       $ cd ../next
       $ git fetch -f ../rebase-tmp akpm:akpm/master
       $ git merge --no-ff akpm/master

       # 解释点8
       $ rm -rf ../rebase-tmp


    1.  开始时, 处于`next目录`。首先, 先检出到**-next tree**的**master**, 然后, 一个`git reset --hard stable`强制把这个分支的内容, 变为Linus的**mainline tree**当天的状态(`stable`追踪的是Linus的**mainline tree**), 因为, **-next分支**是要测试下一个合并窗口的新功能代码的, 只有保证每天基于Linus的代码成功地合并, 编译, Linus在合并窗口打开时, 才能平和顺利地合并这些子系统分支 。所以, 这棵树每天都基于当天Linus的**mainline tree**构建, 可以把它看成是**包含将在下一版本加入的新功能的mainline tree** 。

    2.  接下来是若干行的`git merge --no-ff`操作, 就是合并各个子系统分支的操作了。对照`Next/trees`文件, 可以看到每一棵被合并的git tree, 都有一条`git merge`操作。 `--no-ff`选项作用是: 即使这次合并是fast-forward, 也强制生成一条合并信息[[6]](#jmp6)。

    3.  对于merge冲突的分支, 需要人工介入, Stephen会尝试修补冲突, `git commit`生成一次提交, 然后`git diff`打印出本次冲突的内容。然后, Stephen会发一封邮件到<linux-next@vger.kernel.org>和该分支维护者, 告知此事, 并给出他做的修改(当然, 如果分支维护者认为如此修改不正确, 就回复邮件告知如何修改)。

    4.  对于独立的补丁, 则用`git am`打上, 然后`git reset HEAD^`把最新提交回退一次, 再`git commit -v -a --amend`作一次修补提交。这几条命令的作用是: 这个独立的补丁本应是属于**akpm-current/current分支**的, 但不知何故遗漏了, 所以, 手工打上, 并整合到该分支上, 做一次独立的提交。

    5.  当所有分支合并完毕, `git clone . ../rebase-tmp`完成了**重新生成当天-next tree的魔术**的主要部分: 把当前目录clone到一个新的临时目录`rebase-tmp`中。**注意: 应该把`rebase-tmp`看成一个源, 只不过这个源在本地。理解这一点, 对理解后面的命令很重要。**

    6.  去到`rebase-tmp`中。**注意, 现在来到新的一个`源`, 那么, 对于这个源来说, 它的远程源`origin`其实就是`next`目录。**

        `git checkout -b akpm remotes/origin/akpm/master`检出远程源(`next`目录)的`akpm/master`分支到一个新的分支`akpm`中, 此时处于`akpm分支`中, `HEAD`指向`akpm`, 也就是指向`akpm/master`[[7]](#jmp7) 。如图: 

                                                           HEAD
                                                            |
              remote: akpm/master-base --->  A---B---C <---akpm(remote : akpm/master)
                         
                                               D---E---F---G <---master
                  

        根据当前`HEAD`的指向, `git rebase`一句的完整形式是: `git rebase --onto master remotes/origin/akpm/master-base remotes/origin/akpm/master`, 意为: 把当前节点`HEAD`(即akpm/master)与(远程源即`next`目录)中的`akpm/master-base`分支这之间的提交,  rebase到`master`分支上来; 同时, 当前分支会被自动切换到`master`。如图:

              remote: akpm/master-base ---> A---B---C <---akpm(remote : akpm/master)
                                           /
                              D---E---F---G  <---master
                                          |
                                        HEAD

        总之, 执行完这两条命令后, `源rebase-tmp`中, **master分支**最新部分是来自`next`目录中**akpm/master-base分支**到**akpm/master分支**之间的所有提交。
  

    7.  回到`next源`。

        `git fetch -f`把刚刚构建的`rebase-tmp`目录作为源, 以**akpm分支**作为远程分支,  强制更新本地的**akpm/master**分支。然后, 再合并。 
         
        因为`rebase-tmp源`是从`next源` clone过去的, 所以,  `next源`其实也有着与上面类似的结构, 经过合并, 其结构如图:

                             A---B---C <--- akpm/master
                            /        ^
               D---E---F---G         |
                                   master
                                     ^
                                     |
                                    HEAD
        
        现在综合起来看第`6`, `7`步, 如此大费周章, 就是为了把**akpm分支**上的更新,  拣出来, 用rebase操作放置到**master分支**最前头。
        
        **akpm/master-base**与**akpm/master**之间的提交是来自于Andrew Morton的**-mmotm分支**的补丁集。而之所以要拣选出来放在最前头的原因是: Andrew Morton的**-mmotm分支**是用quilt来维护的, quilt是一个补丁集管理工具, 对补丁的先后次序很严格。而且, Andrew Morton会基于**-next分支**来做测试, 因而, **-next分支**上应用的**-mmotm**的补丁要放最前头, 这样才能方便Andrew方便地基于**-next**上继续打后续的补丁做测试。

    8. `rebase-tmp`无用了, 可以删除掉。


## mainline分支

当新一个版本开发周期开始, Linus开启合并窗口, 之前经过**-next分支**检验的各个子系统代码, 在子系统维护者发出pull request后, 如果Linus批准, 就会被其拉入**mainline**。当然, 也有极少数例外的补丁是直接提交到**mainline**中的。不出意外, 它们都将成为下一个版本中释出的代码。

通过层次模式, 一步步从开发者手中, 进入相应模块, 再到子系统中, 再经过**-mm分支**或**-next分支**, 最终进入**mainline**。道路是曲折的, 但这也是保证Linux内核代码的高质量的一重要途径。

## -stable分支

**-stable分支**顾名思义就是稳定的分支, 它现在主要由[Greg Kroah-Hartman](http://www.linux.com/news/special-feature/linux-developers/717573-3    0-linux-kernel-developer-workspaces-in-30-weeks-greg-kroah-hartman)在维护。它的目的在于**对已经发布的正式版本(比如v2.6时代的v2.6.X, 及v3.0时代的v3.X)的后续维护, 只包括一些bugfix或安全补丁, 不包括功能补丁。** 每当Linus发布一个新版本, 就把它丢给Greg K-H,进入**-stable分支** 由他带领的团队来维护。不定期地, Greg K-H会拣选出一些bugfix或安全补丁, 然后发布一个修订版(比如v2.6时代的v2.6.X.Y, 及v3.0时代的v3.X.Y)。对于大多数版本, 在下一版本出来后不久, 该版本的**-stable分支**维护工作就将结束, 它会被标上EOF(End Of Life)标记; 也有一些版本, 会被标记上LTS(Long Term Support)而长期支持。

这个分支的诞生说来也有一番曲折。早在**v2.6.11**之前, 是没有对已经发布的版本发由后续修订版这一惯例的。如前一篇文章所说, 在**v2.6**时代以前, Linux的发布模式是**维护一个奇数号(如v2.3)的开放版本2-3年, 等到它非常稳定了, 再升级到稳定版本号释放出来。** 这种文火熬老汤的做法, 能保证发行版本出来后非常稳定。进入**v2.6**后, Linux社区抛弃了这种漫长的发布周期模式; 直接在2.6版本上开发新功能, 以Andrew Morton的**-mm分支**代替之前的奇数版本号开发版本的功能, 作为新功能的试验场, 采用较短周期的开发模式。仅一年就从**v2.6.0**发布到**v2.6.10**, 尽管整个社区都对代码质量有严格管控, 但仍免不了每个版本都有测试不充分的补丁进入, 导致不少问题, 比如**v2.6.8**发布当天就暴露了NFS代码一个重大错误, 无可奈何下, 当天Linus就又发布了一个修订版本**v2.6.8.1**, 历史上**第一次引入发布新版本后, 再发布修订版本**。对于快速开发而引进的缺乏足够测试的先天痼疾, Linus有想过稍微改变下模式, 但开发者们并不看好。于是, 亡羊补牢成了一个比较务实的做法。Greg K-H就勇敢地[承担](http://lwn.net/Articles/126785/)了这一在Linus看来"无趣, 吃力不讨好"的工作, 还定下了这一分支的["三条五例"](http://lwn.net/Articles/126915/)。

到本文写作的今天, 这一分支已经工作了8年, 事实证明它工作得不错; 不过, 也存在问题: 因为进入**-stable分支**的补丁也终将进入**mainle**(也很好理解, 否则在前面的修订版解决了某个问题, 但到下一个正式版, 问题又出现), 所以, 有一些开发者投机取巧, 利用它来绕过前面说的开发组织模式, 使补丁更容易地进入到mainline中。比如, 在最近的**v3.10.1**发布邮件上, Greg K-H就有一番[报怨](https://lwn.net/Articles/559113/)。有人忽视前面说的"三条五例", 混水摸鱼想把既非修改一个确定的bug, 也非修补某个特定问题的补丁标记为准备进入**-stable分支**; 更严重的, 进入这个分支的补丁原意就是要尽快地修补问题, 但有些开发者却扣着这些补丁, 等到下一个合并窗口打开才发出, 只因合并窗口期间, 会有大量补丁涌入Linus的**mainline**, 这样更容易进入。

当然, 也有开发者[反驳](https://lwn.net/Articles/559134/)Greg K-H的抱怨, 道出这也是开发者囿于雇主的发行版时间表的压力而不得不为之。其实立场不同, 利益考究自然不同, **-stable分支**作为各种方案权衡下的产物, 是开发者的承诺, 也是终端用户和发行版商的企盼, 纷扰纠葛, 原也说不到一个准。

## -staging分支

内核中还有一个重要也特殊的分支: **-staging分支**。2008年6月10日, Greg K-H在内核邮件列表上发了一封[邮件](https://lkml.org/lkml/2008/6/10/329), 宣布创建了一个新的[-staging tree](git://git.kernel.org/pub/scm/linux/kernel/git/gregkh/staging.git), , 它的目的是要存放那些还不足以进入**mainline**的独立的文件系统或驱动代码。有开发者质疑说已经存在**-next分支**, 为何还要增加一个类似功能的分支。 Greg K-H表示说, 这个分支里的代码都是从未出现在**mainline**中的; 它们会将很近的将来进入**mainline**, 但不是下一个版本, 甚至都不保证说一定会进入。

2009年3月18日, Greg K-H又写了一篇[博文](http://www.kroah.com/log/linux/linux-staging-update.html), 再次申明了这棵分支树的作用。值得注意的是, 文中提到, 该分支已经包含在内核源码中, 就位于`drivers/staing`目录。 并且, 本文前面提到的每日一建的**-next分支**都有包含**-staging分支**的最新代码, 需要基于**-staging分支**工作的, 应该每天检出**-next分支**, 并基于其上作开发。

**还有一点值得说的是, Greg K-H鼓励Janitor[[8]](#jmp8)项目新手和驱动开发者新手, 从这个分支入手, 因为这个分支上有很多简单的工作做, 适合新手入门内核开发。**


   <center><strong>* * * * * * 全文完 * * * * * * </strong></center>


<span id="jmp1">[1]: 注意, 这里描述的只是普遍或理想的流程, 事实上, 有不少例外。</span>

<span id="jmp2">[2]: 这就有一个例外, 比如是新增的硬件驱动, 过了这个合并窗口还是可能被接受的, 因为之前代码库中没有这些代码, 引入不会造成regression。</span>

<span id="jmp3">[3]: regression就是指之前正常的代码, 因为新引入的补丁而不能正常工作, 出现倒退的现象。</span>

<span id="jmp4">[4]: 现在包括Linus在内的基本所有子系统维护者都使用git来协作维护代码, 所以内核分支经常被叫做-XXX tree, 不过负责**-mm分支**的Andrw Morton使用的是自己开发的quilt工具来管理补丁。所以, 本文统统以分支来指称。</span>

<span id="jmp5">[5]: **-mm**这个名字确实是来自Memory Management。该分支起初是作为内存管理的分支, 进入v2.6时代后, 响应发布模式的变化, Andrew把它变为一个功能测试分支, 作为向Linus提供通过考验的补丁的中转站。</span>

<span id="jmp6">[6]: 强制生成合并信息是为了更好的保留历史信息, 虽然, 对-next tree 这种生命周期只有一天的树, 保留历史信息作用不大,  但它可以给其它开发者一个提示: 这里合并了某某分支, 而简单的fast-forward只能留下提交信息。</span>

<span id="jmp7">[7]: akpm就是Andrew Keith Paul Morton名字的缩写。</span>

<span id="jmp8">[8]: <a href="http://code.google.com/p/kernel-janitors/">Janitor</a>项目旨在帮助新手进入内核开发领域。</span>

