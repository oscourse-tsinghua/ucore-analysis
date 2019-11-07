### 练习6: 完善中断初始化和处理

[练习6文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_1_ex6.html)

* 中断描述符表（也可简称为保护模式下的中断向量表）中一个表项占多少字节？其中哪几位代表中断处理代码的入口？
* 请编程完善kern/trap/trap.c中对中断向量表进行初始化的函数idt_init。在idt_init函数中，依次对所有中断入口进行初始化。使用mmu.h中的SETGATE宏，填充idt数组内容。每个中断的入口由tools/vectors.c生成，使用trap.c中声明的vectors数组即可。
* 请编程完善trap.c中的中断处理函数trap，在对时钟中断进行处理的部分填写trap函数中处理时钟中断的部分，使操作系统每遇到100次时钟中断后，调用print_ticks子程序，向屏幕上打印一行文字”100 ticks”。

#### 相关文件

* [trap.c](/ucore/kern/trap/trap_c_lab1.md)
* [mmu.h](/ucore/kern/mm/mmu_h.md)

### 中断描述符表中一个表项占多少字节？其中哪几位代表中断处理代码的入口？

#### 背景知识

1. 什么是中断描述符表

   中断描述符表（Interrupt Descriptor Table，IDT）将每个异常或中断向量分别与它们的处理过程联系起来。与GDT和LDT表类似，IDT也是由8字节长描述符组成的一个数组。

#### 问题分析

1. 中断描述符表中一个表项占多少字节

   参考代码

   ```c
   //	File:	trap.c
   //	Line:	28

   static struct gatedesc idt[256] = {{0}};
   ```

   由代码可知，中断描述符表`idt`的类型为`struct gatedesc`，其定义为

   ```c
   //	File:	mmu.h
   //	Line:	49-60

   /* Gate descriptors for interrupts and traps */
   struct gatedesc {
       unsigned gd_off_15_0 : 16;        // low 16 bits of offset in segment
       unsigned gd_ss : 16;            // segment selector
       unsigned gd_args : 5;            // # args, 0 for interrupt/trap gates
       unsigned gd_rsv1 : 3;            // reserved(should be zero I guess)
       unsigned gd_type : 4;            // type(STS_{TG,IG32,TG32})
       unsigned gd_s : 1;                // must be 0 (system)
       unsigned gd_dpl : 2;            // descriptor(meaning new) privilege level
       unsigned gd_p : 1;                // Present
       unsigned gd_off_31_16 : 16;        // high bits of offset in segment
   };
   ```

   所占位数为: `16 + 16 + 5 + 3 + 4 + 1 + 2 + 1 + 16 = 64 bit`

   所占字节数为: `64 / 8 = 8 byte`

2. 中断描述符表中哪几位代表中断处理代码的入口

   由`struct gatedesc`代码注释可知，第1-16位与48-64位构成段偏移，第17-32位为段选择子，两者联合可计算出入口地址

#### 参考文献

* [中断描述符表](https://baike.baidu.com/item/%E4%B8%AD%E6%96%AD%E6%8F%8F%E8%BF%B0%E7%AC%A6%E8%A1%A8/1907776)

