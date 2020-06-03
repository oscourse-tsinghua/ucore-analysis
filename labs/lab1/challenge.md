### 扩展练习

[扩展练习文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_7_ex7.html)

* 扩展proj4,增加syscall功能，即增加一用户态函数，当内核初始完毕后，可从内核态返回到用户态的函数，而用户态的函数又通过系统调用得到内核态的服务

#### 相关文件

* [init.c](/ucore/kern/init/init_c_lab1.md)
* [trap.c](/ucore/kern/trap/trap_c_lab1.md)

### 扩展proj4，增加syscall功能

#### 背景知识

1. 什么是syscall？

   syscall即系统调用(System Call)。

   在计算中，系统调用（通常缩写为syscall）是一种编程方式，计算机程序通过该方法从执行其的操作系统内核请求服务。这可能包括与硬件相关的服务（例如，访问硬盘驱动器），创建和执行新进程以及与诸如进程调度之类的集成内核服务进行通信。系统调用提供了进程与操作系统之间的基本接口。

2. 如何实现系统调用(syscall)？

   实施系统调用需要将控制权从用户空间转移到内核空间，这涉及某种特定于体系结构的功能。一种典型的实现方法是使用软件中断或陷阱。中断将控制转移到操作系统内核，因此软件仅需要使用所需的系统调用号设置一些寄存器，然后执行软件中断即可。

3. 什么是软件中断？

   中断可大体分为硬件中断和软件中断。具体分类及介绍如下：

   * 硬件中断（Hardware Interrupt）：
     * 可屏蔽中断（maskable interrupt）。硬件中断的一类，可通过在中断屏蔽寄存器中设定位掩码来关闭。
     * 非可屏蔽中断（non-maskable interrupt，NMI）。硬件中断的一类，无法通过在中断屏蔽寄存器中设定位掩码来关闭。典型例子是时钟中断（一个硬件时钟以恒定频率—如50Hz—发出的中断）。
     * 处理器间中断（interprocessor interrupt）。一种特殊的硬件中断。由处理器发出，被其它处理器接收。仅见于多处理器系统，以便于处理器间通信或同步。
     * 伪中断（spurious interrupt）。一类不希望被产生的硬件中断。发生的原因有很多种，如中断线路上电气信号异常，或是中断请求设备本身有问题。
   * 软件中断（Software Interrupt）：
     * 软件中断。是一条CPU指令，用以自陷一个中断。由于软中断指令通常要运行一个切换CPU至内核态（Kernel Mode/Ring 0）的子例程，它常被用作实现系统调用（System call）。

   处理器通常含有一个内部中断屏蔽位，并允许通过软件来设定。一旦被设定，所有外部中断都将被系统忽略。这个屏蔽位的访问速度显然快于中断控制器上的中断屏蔽寄存器，因此可提供更快速地中断屏蔽控制。

   * 如果一个中断使得机器处于一种确定状态，则称为精确中断（precise interrupt）。精确中断须保证：
     * 程序计数器的值被保存在已知位置。
     * 程序计数器所指向的指令之前的所有指令已被执行完毕。
     * 程序计数器所指向的指令之后的所有指令不可被执行。如果中断信号到来后而转入处理前发生了任何针对寄存器／内存的更改，都必须予以还原。
     * 程序计数器所指向的指令地执行状态已知。

   倘无法满足以上条件，此中断被称作非精确中断（imprecise interrupt）。

4. 如何执行软件中断？

   在软件内调用汇编指令`int`即可引发软件中断

#### 问题分析

1. 如何从内核态切换到用户态？

   如何从内核态切换到用户态？对于这个问题，我们将它分成两个部分：引发中断和中断处理。

   引发中断，即字面意思，引发一个从内核态切换到用户态的中断，然后让中断处理程序来切换特权级。

   而最关键的处理中断，其中最主要的部分就是修改各种段寄存器中的特权级相关标志。

   具体操作参考问题2和问题3。

2. 如何引发从内核态切换到用户态的软中断？

   首先，在`trap.h`中已经定义了内核态切换到用户态的中断号`T_SWITCH_TOU`，即`trap_switch_to_user`的缩写。有了这个之后，我们可以直接引发该中断：

   ```c
   //	File:	init.c

   static void
   lab1_switch_to_user(void) {
	   asm volatile (
	       "int %0 \n"
	       : 
	       : "i"(T_SWITCH_TOU)
	   );
   }
   ```

   但直接引发中断有一个问题。我们查阅Intel的文档可以知道，引发中断时CPU会将寄存器内的一些状态保存到栈中，但有一个例外，就是SS与ESP寄存器。

   在内核态引发的中断会将SS与ESP寄存器的值保存到TSS(Task State Segment)中，而用户态的SS与ESP寄存器的值则会正常保存到栈中，那么问题来了：该怎样做才能使得特权级可以正常切换呢？

   答案就是：引发中断前，在栈中预留给SS和ESP的位置，然后在中断的处理过程中为其赋正确的值，中断处理结束后即可正常进入用户态。

   所以，在`int`语句之前，我们要对`esp`寄存器进行`sub`操作，使栈扩大一部分，为SS和ESP寄存器的值预留出空间。

   这里需要说明的一点是，SS和ESP所指向的内存中的栈，其中栈底在上方，栈顶在下方，所以为了使栈扩大，我们需要对ESP寄存器进行的操作是使其所指地址减小而不是增大。

   那么，我们需要移动的尺寸是多少呢？众所周知，ESP是32bit的，SS的可用部分是16bit的，但是作为一个32位处理器的寄存器，SS的实际尺寸是32bit，其中还有16bit存放这一些标志位。所以需要让栈顶指针移动的长度为64bit，即8字节。

   这样分析完成之后，我们将代码改成了如下的样子：

   ```c
   //	File:	init.c

   static void
   lab1_switch_to_user(void) {
	   asm volatile (
           "sub $0x8, %%esp \n"
	       "int %0 \n"
	       : 
	       : "i"(T_SWITCH_TOU)
	   );
   }
   ```

   还没完，由于编译器没有识别到我们在函数内对ESP做了变化，因此我们还要处理一些后事。

   通常情况下，在C语言中的一个函数，编译时*GCC*会在函数头部和尾部添加一些汇编指令来保证函数的正常运行。比如头部会添加`push %ebp`和`mov %esp, %ebp`，该指令的作用是把之前的栈帧压到栈中，再调整栈帧，相当于设置了一个栈底，不让函数内的操作越过自身的栈内存从而访问到不该访问的空间。

   同理，函数尾部也会被添加`mov %ebp, %esp`和`pop %ebp`来对栈进行还原。这两个指令也可以简写成一条指令`leave`。

   这里需要说明的是，头部的两条指令是必须添加的，因为要保护内存，但是当编译器没有检测到函数内有对栈的正常操作，即函数内栈没有变化，为节省开销，尾部的`mov %ebp, %esp`就可以不填加。

   那么问题来了，其实我们的汇编指令是有对栈的操作的，而且还不少，但是内联汇编并不属于对栈的正常操作，因此没有被*GCC*检测到，所以为了让我们的操作系统正常工作，必须把被省略的`mov %ebp, %esp`给补上。

   解决方案有两种，第一种：手动添加该指令

   ```asm
   static void
   lab1_switch_to_user(void) {
       //LAB1 CHALLENGE 1 : TODO
	   asm volatile (
	       "sub $0x8, %%esp \n"
	       "int %0 \n"
	       "movl %%ebp, %%esp"
	       : 
	       : "i"(T_SWITCH_TOU)
	   );
   }
   ```

   这样就将问题解决了。但我们还有第二种方法，就是让编译器意识到在这个语句里ESP寄存器被改变了，让编译器自己把这条语句给加上：

   ```asm
   static void
   lab1_switch_to_user(void) {
       //LAB1 CHALLENGE 1 : TODO
	   asm volatile (
	       "sub $0x8, %%esp \n"
	       "int %0 \n"
	       : 
	       : "i"(T_SWITCH_TOU)
		   : "%esp"
	   );
   }
   ```

   内联汇编的语法中，`asm`函数的参数是需要执行的汇编指令，后面还有三个可选的参数，用冒号分隔，分别是从汇编指令的输出的变量、输入到汇编指令的变量、汇编指令中破坏（编辑）过的寄存器。

   我们在此声明，ESP寄存器被我们编辑过，编译的时候*GCC*就会把最后需要的`mov %ebp, %esp`给补上了（编译器会将`mov`与`pop`语句组合为`leave`）。

   关于具体的编译结果，可以使用`objdump`对编译出的对象进行反汇编查看，编译出的对象位于`obj`目录内。如：`objdump -d obj/kern/init/init.o`。

3. 如何处理中断使特权级切换到用户态？

   我们在`init.c`中引发中断后，就需要到`trap.c`中处理中断了。

   处理中断的位置在函数`trap_dispatch`中，`case T_SWITCH_TOU`之后，在这个切换到用户态的中断号的位置处理中断。

   在`trap_dispatch`中传入了一个参数`struct trapframe *tf`，在这个`tf`中存储了中断的相关信息，如中断号，以及压入栈中的寄存器信息等。而特权级的切换就是针对栈中寄存器的值下手的。

   既然段寄存器的值都已经压入栈中，中断处理结束后又会重新弹出，那么我们需要做的就是趁中断处理期间，偷天换日，来达到切换特权级的目的。

   理解了需要做的事情，那么剩下的就很简单了，直接放参考答案：

   ```c
   //	File:	trap.c

   case T_SWITCH_TOU:
       if (tf->tf_cs != USER_CS) {
           switchk2u = *tf;
           switchk2u.tf_cs = USER_CS;
           switchk2u.tf_ds = switchk2u.tf_es = switchk2u.tf_ss = USER_DS;
           switchk2u.tf_esp = (uint32_t)tf + sizeof(struct trapframe) - 8;
	   
           // set eflags, make sure ucore can use io under user mode.
           // if CPL > IOPL, then cpu will generate a general protection.
           switchk2u.tf_eflags |= FL_IOPL_MASK;
	   
           // set temporary stack
           // then iret will jump to the right stack
           *((uint32_t *)tf - 1) = (uint32_t)&switchk2u;
       }
       break;
   ```

   在参考答案中，我们构造了一个`trapframe`指针，然后修改各种段寄存器的值以及ESP寄存器的值，最后将其替换掉原来的`trapframe`，就大功告成了。

   值得一提的是，这段代码中间还有一句`switchk2u.tf_eflags |= FL_IOPL_MASK;`，这行代码的作用是修改标志位的`IOPL`的值，即IO允许的特权级。如果当前代码段的特权级低于IO允许的特权级的话会导致程序无法进行IO。

   另外，在`mmu.h`中可以知道，`FL_IOPL_MASK`的值与`FL_IOPL_3`的值是相同的，所以这行代码的将IO允许的特权级设为了最低，即所有特权级下均可进行IO。

   当然，我们也可以不采用这么复杂的方法，直接对`tf`进行修改。这里就不再放代码了，需读者自行编写。

4. 如何引发从用户态切换到内核态的软中断？

   至于如何引发中断，在问题2中已经讲解过了，这里就不再重复。那么按照我们的思路，应该先引发中断，然后将栈顶的值下降8字节来销毁掉栈中存储的多余的SS和ESP寄存器的值，最后处理后事，`mov %ebp, %esp`。

   ```c
   //	File:	init.c

   static void
   lab1_switch_to_kernel(void) {
       //LAB1 CHALLENGE 1 :  TODO
   	   asm volatile (
   	       "int %0 \n"
		   "addl $8, %%esp \n"
   	       "movl %%ebp, %%esp"
   	       : 
   	       : "i"(T_SWITCH_TOK)
   	   );
   }
   ```

   细心的你可能发现了，在`mov`面前，对ESP的一切修改都是徒劳的，不管如何修改ESP寄存器，`mov`指令都会将其还原，所以我们索性将其删除，最后的`mov`指令会将其还原到最初的状态的。

   所以最终的代码为：

   ```c
   //	File:	init.c

   static void
   lab1_switch_to_kernel(void) {
       //LAB1 CHALLENGE 1 :  TODO
   	   asm volatile (
   	       "int %0 \n"
   	       "movl %%ebp, %%esp"
   	       : 
   	       : "i"(T_SWITCH_TOK)
   	   );
   }
   ```

5. 如何处理中断使特权级切换到内核态？

   有了问题3中的铺垫，这里便不再多说。需要注意的是，切换到内核态后，栈中便不存在ESP与SS寄存器的值了。尽管`trapframe`中仍旧存在`tf_esp`与`tf_ss`，但其指向的是栈内未知的数据，不对其进行修改就会一切正常。

   以下为参考答案：

   ```c
   //	File:	trap.c

   case T_SWITCH_TOK:
       if (tf->tf_cs != KERNEL_CS) {
           tf->tf_cs = KERNEL_CS;
           tf->tf_ds = tf->tf_es = KERNEL_DS;
           tf->tf_eflags &= ~FL_IOPL_MASK;
           switchu2k = (struct trapframe *)(tf->tf_esp - (sizeof(struct trapframe) - 8));
           memmove(switchu2k, tf, sizeof(struct trapframe) - 8);
           *((uint32_t *)tf - 1) = (uint32_t)switchu2k;
       }
       break;
   ```

   需要说明的还是对IOPL的处理。虽然理论上可以直接将其与`FL_IOPL_0`进行与操作，但是不要忘了，IOPL知识EFLAGS中的一个标志位，直接进行与操作会将其它位置的标志覆盖掉，所以最好的做法还是如参考答案一样，对`FL_IOPL_MASK`的非进行与操作，这样就不会影响到其它标志位的值了。

6. 为什么切换特权级后，CS寄存器修改了代码还能继续执行？

   善于思考的你可能发现了这个问题。

   是的，按道理CS与EIP是指向运行的下一条指令的寄存器，对其进行修改是会发生跳转的。但是在uCore里面，用户态和内核态的代码段位置其实是相同的，对CS的切换只是修改了标识CS特权级的值。

   具体可以参考`memlayout.h`中`KERNEL_CS`以及`USER_CS`的定义还有`pmm.c`中对GDT的修改。很明显用户态和内核态的CS地址是相同的。如果它们的值不同的话，切换特权级后再继续执行就没有这么简单了。

#### 参考文献

* [System Call - Wikipedia](https://en.wikipedia.org/wiki/System_call)
* [中断 - 维基百科](https://zh.wikipedia.org/wiki/%E4%B8%AD%E6%96%B7)
* [x86内存分段 - 维基百科](https://zh.wikipedia.org/wiki/X86%E8%A8%98%E6%86%B6%E9%AB%94%E5%8D%80%E6%AE%B5)
* [Lab1 Challenge1中关于 mov %ebp, %esp 意义的讨论](https://piazza.com/class/i5j09fnsl7k5x0?cid=1468)
* [关于Lab1 Challenge部分的问题](https://piazza.com/class/i5j09fnsl7k5x0?cid=1184)
* [Intel® 64 and IA-32 ArchitecturesSoftware Developer’s Manual](https://software.intel.com/sites/default/files/managed/39/c5/325462-sdm-vol-1-2abcd-3abcd.pdf)
  * Chap. 6.4.5, Vol. 1，介绍特权级相关内容
    * 注：旧版本文档内位于Chap. 6.3.5
  * Chap. 7, Vol. 3，介绍TSS相关内容

### 用键盘实现用户模式内核模式切换

#### 问题分析

1. 如何处理键盘的输入？

   众所周知，键盘输入是会引起硬件中断的，所以我们不妨去`trap.c`中找找看。

   如果你发现了`case IRQ_OFFSET + IRQ_KBD`这段代码，那么所有的问题就迎刃而解了。剩下的之有对输入的判断和特权级的切换了。

2. 如何切换特权级？

   参考Challenge1。

