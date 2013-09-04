---
layout: post
title: "一个普适性的Git分支workflow"
tagline: "A general git branching workflow"
description: "A general git branching workflow"
category: git 
tags: [Git, workflow]
---
{% include JB/setup %}

Git作为一个分布式版本控制系统, 去中心化的基因深入骨子里。除了每个参与者的版本库皆能成为中心版本这一重要特性之外, 我想最能体现Git的优秀就是它对**分支(branch)**创建, 操作与删除的轻灵的驾驭能力, 这衍生了许多基于分支的强大的协同工作流(workflow)模式。

传统的版本控制系统(如**SVN**)对于**分支**的理解是**另一份工作区的拷贝**。这是一种很符合直觉的做法, 却也是一种非常重量级(High-weighed)的做法, 虽然**SVN**采取了**廉价复制**的做法, 这避免了复制所有工作区文件的做法, 只有在为了区分不同版本的对象时才会复制数据, 但本质上仍没脱离这个窠臼。

Git对于**分支**的创新性看法源于它本质上是一个**按内容寻址的(content addressable)**数据库! 它把所有的文件内容当成一个个存放在数据库中的对象, 叫做**blob**, 每个**blob**均有一个对应的键值(**SHA-1 key**), 而从文件系统视角看的**目录**, 则很自然地被当成是包含若干个**blob**的树对象, 叫做**tree**。

当基于这个数据库构建可追踪历史的版本控制系统时, 每一次**提交**不过是对工作区内的**blob**或/和**tree**的修改后的一个**整体快照(snapshot)**, 这个快照对象叫**commit**, 它包含有当前快照的**tree**的key, 因而可以获取当前整个工作区所有目录下所有文件的内容;　它还包含有一个指向前一次**commit**(第一次除外)的key的字段, 这样构建起一个提交历史的链表, 以此作为构建版本控制系统的基石。

因而, Git的**分支**仅仅就是包含某一个**commit**的key的文件(这个**commit**叫做当前分支的tip)! 由这个**commit**便可追溯以前的历史。因此, Git分支的创建与删除其实就是**创建或删除一个文件**, 相当轻灵快速的操作!


## 基本模型

所谓**workflow**, 直译为**工作流**, 局限于本文的语境, 在这里理解为基于Git的代码进入**主版本库(master)**的流程。

在这种workflow里, 人为定义一个版本库为**中心版本库(central repo)**, 所有参与者都clone这个版本库, 从这里pull更新或push更新到这里。这个**中心版本库**里存在两个分支:

　* **master**: 该分支中反映当前最新发布的代码状态。换言之, 该分支中的每一次提交都是一个新的版本(或修正版), 它是**稳定的**。
　* **develop**: 该分支中的代码反映下一个将发布的版本的代码状态。这是一个开发分支, 它的**稳定性很差**。它也叫**集成分支(Integration branch)**, 因为许多**每晚构建(nightly build)**都是基于该分支。

这两个分支的交互如下:

      develop:    O --> O --> O --> O --> O ......
                ↗             \           \
               /               ↘           ↘
      master: O --------------> O ---------> O ......
              ↑                 ↑            ↑
            初始版本v1.0       v2.0          v3.0

如图, 当`develop分支`到达一个稳定点或完成既定的特性开发后, 就会被merge回`master分支`, 成为一个新的发布版本, 并打上一个标记, 以便以后查询或追踪。

这个workflow涉及的典型操作如下:

      $ git checkout -b develop master
        Switched to a new branch 'develop'

      ... 热烈的开发, 调试 ...

      $ git checkout master
        Switched to branch 'master'
      $ git merge --no-ff develop
        Merge made by the 'recursive' strategy.
      $ git tag -a v2.0

注意, `--no-ff`选项表示: 即使是fast-forward, 也要当成是合并, 生成一次合并提交。这避免了丢失掉这次合并的历史, 更重要的是, `master分支`中的提交是一个个发布的节点, 因而该选项能保证每一次合并都只引入一个提交。如图:

      git merge --no-ff :  A ---> B ----------------------> H
                                   ↘                      ↗ 
                                     C ---> D ---> E ---> F
       
              git merge :  A ---> B ---> C ---> D ---> E ---> F
                                   ↘                     
                                     C ---> D ---> E ---> F


## 3个辅助分支

以上两个分支是**长期分支**, 更精细化地, 还存在3个**短期分支**, 以辅助这一模型更好地运转。分别是:

  * **feature**: 虽然**develop**定位于开发分支, 但对于一些大的功能, 开发周期长, 无法在下一版本发布, 甚至具体什么时间点能完成也无法确定, 将这些功能的开发与下一版本的功能开始一起混合在**develop**中显然不是合理的做法, 为此必要增加一个新的分支, 它从**develop**分离, 在经历漫长的开发后, 可以合并回**develop**, 甚至可以选择这个新功能。然后, 这个分支的生命周期就可以结束了。

    这个分支涉及的典型操作如下:

        $ git checkout -b feature-x develop
          Switched to a new branch "feature-x"

          ... 漫长的开发, 调试 ...

        $ git checkout develop
          Switched to branch 'develop'
        $ git merge --no-ff feature-x
          Merge made by the 'recursive' strategy.
        $ git branch -d feature-x
          Deleted branch myfeature
        $ git push origin develop // 推送到中心服务器的develop分支

 
  * **release**: 在基本模型中, 一旦**develop**稳定了或完成了预定功能的开发后, 就合并回**master**形成一次新的发布。这种模型的问题是, **develop**分支的时效性非常强, 而要进入**master**要保证稳定性非常强, 这个点不是很好把握, 所以实践中, 有**特性冻结(feature freeze)**这一做法。就是当预定功能开发完毕, 处于候选发布状态时, 不再接受新的功能的提交, 只接受bugfix提交。这就促成了在完成预定功能开发后, 从**develop**分离出一个新的分支, 该分支将接受广泛测试, 修改bug, 以期达到稳定状态再合并加**master**。同时也要合并回**develop**, 确保其中的bug也得到修复。

    此外, 新增这个分支, 相当于增加一个缓冲层, 可以做额外的事情。比如做一些元数据处理, 如修改版本号, 修改总体的changelog等。

    这个分支涉及的典型操作如下(假设接下来的发布版本号定为**2.0**):

        $ git checkout -b release-v2.0 develop
          Switched to a new branch "release-v2.0"

          ... 测试, 只接受bugfix ...

        $ git checkout master
          Switched to branch 'master'
        $ git merge --no-ff release-2.0
          Merge made by the 'recursive' strategy.
        $ git tag -a 2.0

        $ git checkout develop
          Switched to branch 'develop'
        $ git merge --no-ff release-2.0 // 可能会有冲突, 有则解决之
          Merge made by the 'recursive' strategy.

        $ git branch -d feature-x
          Deleted branch myfeature
  
  * **hotfix**: 前两个临时分支都是计划中的, 而这个分支则可以说是计划外的, 因为它主要解决**已经部署运行的发布版本中偶然出现的重大问题**。比如上面的**2.0**发布并部署运行后, 发现了一个很严重的bug, 导致服务中断。此时, 将基于当前这个发布节点, 紧急分离出一个分支, 修复问题。

    这个分支涉及的典型操作如下(假设当前发布版本号定为**2.0**):

        $ git checkout -b hotfix-2.0.1 master
          Switched to a new branch "hotfix-1.2.1"

          ... 紧急修复问题 ...

        $ git checkout master
          Switched to branch 'master'
        $ git merge --no-ff hotfix-2.0.1
          Merge made by the 'recursive' strategy.
        $ git tag -a 2.0.1 // 重新发布一个当前版本的修订版本

        // 把补丁向后移植到**develop**中(如果此时有存在**release分支**, 则就移植到**release**中)
        $ git checkout develop
          Switched to branch 'develop'
        $ git merge --no-ff hotfix-2.0.1 

        $ git branch -d hotfix-2.0.1
          Deleted branch hotfix-2.0.1

    上面的操作过程, 有个要注意的点: 如果在向后移植时, 存在着一个`release分支`(即下一个版本快要发布了), 则应该向后移植到该`release分支`中, 而不是`develop分支`。因为该`release分支`最终也将会被合并回`develop分支`。


## 总结

传统的**主分支+开发分支**同时存在, 使稳定版本与开发版本的合理分离, 确保开发过程的稳定推进。而**Feature**, **Release**, **Hotfix**三个**辅助分支**的加入, 则使这一过程能够被更精细地控制, 更好地应对实际开放环境中的问题。


   <center><strong>* * * * * * 全文完 * * * * * * </strong></center>
