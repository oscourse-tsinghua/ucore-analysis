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

### 编程完善kern/trap/trap.c中对中断向量表进行初始化的函数idt_init

#### 背景知识

1. 什么是中断向量表？

   在x86架构上，中断向量表（Interrupt Vector Table, IVT）是一个表，用于指定在实模式下使用的所有256个中断处理程序的地址。

   IVT通常位于0000:0000H处，大小为400H字节（每个中断4字节）。尽管可以在较新的CPU上使用LIDT指令更改默认地址，但是通常不这样做，因为它不方便且与其他实现和/或较旧的软件（例如MS-DOS程序）不兼容。但是，请注意，代码必须保留在RAM的第一个MiB中。

2. 什么是IDT？

   中断描述符表（Interrupt Description Table, IDT）是特定于IA-32体系结构。它是实模式中断向量表（IVT）的保护模式副本，它告诉中断服务例程（Interrupt Service Routines, ISR）所在的位置（每个中断向量一个）。它的结构类似于全局描述符表。

   IDT条目称为门。它可以包含中断门，任务门和陷阱门。

   在实施IDT之前，请确保您具有有效的GDT。

#### 问题分析

1. 如何对中断向量表进行初始化？

   我们先看该实验的说明：

   ```c
   //	File:	trap.c
   //	Line:	37-48

   /* LAB1 YOUR CODE : STEP 2 */
   /* (1) Where are the entry addrs of each Interrupt Service Routine (ISR)?
    *     All ISR's entry addrs are stored in __vectors. where is uintptr_t __vectors[] ?
    *     __vectors[] is in kern/trap/vector.S which is produced by tools/vector.c
    *     (try "make" command in lab1, then you will find vector.S in kern/trap DIR)
    *     You can use  "extern uintptr_t __vectors[];" to define this extern variable which will be used later.
    * (2) Now you should setup the entries of ISR in Interrupt Description Table (IDT).
    *     Can you see idt[256] in this file? Yes, it's IDT! you can use SETGATE macro to setup each item of IDT
    * (3) After setup the contents of IDT, you will let CPU know where is the IDT by using 'lidt' instruction.
    *     You don't know the meaning of this instruction? just google it! and check the libs/x86.h to know more.
    *     Notice: the argument of lidt is idt_pd. try to find it!
    */
   ```

   由该说明我们可以看出，需要做的第一步是将`vector.S`作为中断向量引入代码内，说明中已经给出提示，使用`extern uintptr_t __vectors[];`即可。

   第二步则是对IDT进行初始化，即对变量`idt`进行设置，这里提示我们使用宏`SETGATE`来设置IDT的每一项。

   我们先来看`SETGATE`及其说明：

   ```c
   //	File:	mmu.h
   //	Line:	62-81

   /* *
    * Set up a normal interrupt/trap gate descriptor
    *   - istrap: 1 for a trap (= exception) gate, 0 for an interrupt gate
    *   - sel: Code segment selector for interrupt/trap handler
    *   - off: Offset in code segment for interrupt/trap handler
    *   - dpl: Descriptor Privilege Level - the privilege level required
    *          for software to invoke this interrupt/trap gate explicitly
    *          using an int instruction.
    * */
   #define SETGATE(gate, istrap, sel, off, dpl) {            \
       (gate).gd_off_15_0 = (uint32_t)(off) & 0xffff;        \
       (gate).gd_ss = (sel);                                \
       (gate).gd_args = 0;                                    \
       (gate).gd_rsv1 = 0;                                    \
       (gate).gd_type = (istrap) ? STS_TG32 : STS_IG32;    \
       (gate).gd_s = 0;                                    \
       (gate).gd_dpl = (dpl);                                \
       (gate).gd_p = 1;                                    \
       (gate).gd_off_31_16 = (uint32_t)(off) >> 16;        \
   }
   ```

   我们刚打开`trap.c`文件的时候，就可以看到，变量`idt`其实是空的：

   ```c
   //	File:	trap.c
   //	Line:	28

   static struct gatedesc idt[256] = {{0}};
   ```
   
   在`SETGATE`中也可以看出，这个宏一直在修改参数`gate`的值，对比该参数的成员以及`idt`的类型`struct gatedesc`，很明显就可以得知，要传入的第一个参数就是`idt`了。

   再看第二个参数`istrap`的解释，传入`1`表示这是一个`trap`，等效于`exception`，传入`0`表示这是一个`interrupt gate`，所以对所有的中断，我们要传入的就是`0`了。

   第三个参数`sel`指的是代码段选择子，看到这个就会联想到GDT表中也设置过相关的东西。这里的描述可能有点不太清楚，但是经过一番追查，我们可以找到`memlayout.h`，查看注释可以了解到，`SEG`开头的是段代码，`GD`开头的是段描述符，那么很显然我们应该选择的是`GD`开头的了。

   ```c
   //	File:	memlayout.h
   //	Line:	6-18

   /* global segment number */
   #define SEG_KTEXT    1
   #define SEG_KDATA    2
   #define SEG_UTEXT    3
   #define SEG_UDATA    4
   #define SEG_TSS        5
   
   /* global descriptor numbers */
   #define GD_KTEXT    ((SEG_KTEXT) << 3)        // kernel text
   #define GD_KDATA    ((SEG_KDATA) << 3)        // kernel data
   #define GD_UTEXT    ((SEG_UTEXT) << 3)        // user text
   #define GD_UDATA    ((SEG_UDATA) << 3)        // user data
   #define GD_TSS        ((SEG_TSS) << 3)        // task segment selector
   ```

   然后是具体的描述符的选择，这里要求是代码段，排出以`DATA`结尾的数据段选择子，然后现在是处于内核态，排除`GD_UTEXT`，可以得知这里应该选择的是`GD_KTEXT`了。

   接着是需要执行代码的偏移`off`，中断需要执行的当然是中断向量咯，所以这里我们选择使用`__vectors`变量。

   最后一个是特权级描述符DPL，我们刚才在追查`memlayout.h`时也有发现，这里定义了`DPL_KERNEL`和`DPL_USER`，作为内核态的中断，当然应该选择`DPL_KERNEL`。

   `SETGATE`完成之后，不要忘记执行一下`lidt`指令。那么说到这里，需要编写的代码就呼之欲出了。

   ```c
   //	File:	trap.c

   extern uintptr_t __vectors[];
   int i;
   for (i = 0; i < sizeof(idt) / sizeof(struct gatedesc); i ++)
       SETGATE(idt[i], 0, GD_KTEXT, __vectors[i], DPL_KERNEL);
   lidt(&idt_pd);
   ```

#### 参考文献

* [Interrupt Vector Table - OSDev Wiki](https://wiki.osdev.org/Interrupt_Vector_Table)
* [Interrupt Descriptor Table - OSDev Wiki](https://wiki.osdev.org/Interrupt_Descriptor_Table)

### 对时钟中断进行处理

#### 问题分析

1. 如何对时钟中断进行处理？

   ```c
   case IRQ_OFFSET + IRQ_TIMER:
       /* LAB1 YOUR CODE : STEP 3 */
       /* handle the timer interrupt */
       /* (1) After a timer interrupt, you should record this event using a global variable (increase it), such as ticks in kern/driver/clock.c
        * (2) Every TICK_NUM cycle, you can print some info using a funciton, such as print_ticks().
        * (3) Too Simple? Yes, I think so!
        */
       ticks ++;
       if (ticks % TICK_NUM == 0)
           print_ticks();
       break;
   ```

   根据提示，我们很容易就能在该位置写出以上代码。

   很简单吗？

   是的，非常简单。

