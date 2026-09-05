---
title: 静态编译下，方法重写使逃逸分析变得不可能
description: 一篇 2021 年留下的逃逸分析查证记录，保留当时对运行时多态与编译期优化关系的理解。结论可能不完整，欢迎指正。
date: 2021-09-24
updated: 2026-09-05
tags:
  - java
  - jvm
status: archived
draft: false
---

讨论逃逸分析时搜到维基百科，里面有一句话一直没想通。

![静态编译下的方法重写使得逃逸分析变得不可能](https://img.jimmy42x.com/images/2026/09/java/escape-analysis-static-compilation/wikipedia-escape-analysis.b423a693.webp)

## 先说结论

面向对象里有很多东西没法在静态编译时钉死，逃逸分析放在运行时做更合适。如果一定要在编译期做，大概就得放弃动态加载这一类特性。这是 2021 年的阅读笔记，当时并没有真正想通，下面只记录查过的材料和当时的理解。

## 查过的材料

编译原理和计算机组成原理的 PDF 翻过一遍，还是没对上这句话。后来从维基百科、极客时间、知乎查到几篇相关的。

![指针的运行时查找](https://img.jimmy42x.com/images/2026/09/java/escape-analysis-static-compilation/runtime-vtable-lookup.f6d1ebd0.webp)

![极客时间-编译原理](https://img.jimmy42x.com/images/2026/09/java/escape-analysis-static-compilation/geektime-compiler-course.f8312adc.webp)

![知乎-逃逸分析为何不能在编译期进行？](https://img.jimmy42x.com/images/2026/09/java/escape-analysis-static-compilation/zhihu-escape-analysis-answer.7e5f8fa7.webp)

## 当时的理解

面向对象有很多不能在静态编译时确定的地方，所以放在运行时优化更恰当。如果一定要在编译期优化，那就只能丢掉动态加载。

可能还需要更多铺垫。先记在这里。

## 参考

- RednaxelaFX，[逃逸分析为何不能在编译期进行？](https://www.zhihu.com/question/27963717/answer/38871719)
- [C++ Programming/RTTI](https://en.wikibooks.org/wiki/C%2B%2B_Programming/RTTI)
- 极客时间，[继承和多态：面向对象运行期的动态特性](https://time.geekbang.org/column/article/134978)
- 极客时间，[23 \| 逃逸分析](https://time.geekbang.org/column/article/18048)
- 2021 年原文：<https://www.cnblogs.com/Jimmy-cnblog/p/15331761.html>
