### 练习3: 分析bootloader进入保护模式的过程

[练习3文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_3_ex3.html)

* 为何开启A20，以及如何开启A20
* 如何初始化GDT表
* 如何使能和进入保护模式

#### 相关文件

* [bootasm.S](/ucore/boot/bootasm_S_lab1.md)

### 为何开启A20，如何开启A20

#### 背景知识

1. *A20*是什么？

   *A20*为处理器的第21根地址线。A即Address。*A0*是第一根地址线，以此类推，*A19*是第20根地址线，*A20*是第21根地址线。

2. 开启*A20*是什么？

   开启*A20*指的是开启*A20 Gate*。

   *A20 Gate*是80286处理器为了兼容8086处理器的程序而设置的，一个控制第21根地址线（*A20 Line*）的与门。

3. 为什么要有*A20 Gate*？

   8086处理器有20根地址线（*A0* ~ *A19*），可以寻址1MB内存。当物理地址达到`0xFFFFF` (`11111111111111111111B`)时，再加1，由于只能维持20位地址，进位会丢失导致地址变为`0x00000` (`00000000000000000000B`)。

   而80286处理器有24根地址线（*A0* ~ *A23*），可以寻址16M内存。当物理地址达到`0x0FFFFF` (`000011111111111111111111B`)，再加1，得到的地址为`0x100000` (`000100000000000000000000`)。若运行8086处理器的程序，会导致寻址出现错误。

   为了让80286处理器兼容8086处理器的程序，IBM在主板上添加了*A20 Gate*，当*A20 Gate*关闭（值为0）时，在与门的操作下，*A20 Line*的值始终为0，所以当`0x(0)FFFFF` [`(0000)11111111111111111111B`]增加1时80286处理器可以得到跟8086处理器一样的结果`0x(0)00000` [`(0000)00000000000000000000`]。

4. 如何开启*A20 Gate*？

   *A20 Gate*的控制阀门在8042键盘控制器（8042芯片）内，为*输出端口P2*的第二个bit（*P21引脚*）。

   为开启*A20 Gate*，只需向*P2端口*写入第二个bit为1的一个字节即可。

#### 问题分析

1. 为何开启A20？

   为了使CPU可以正常访问高于16位的地址，为进入可寻址32位的保护模式做准备。

2. 如何开启A20？

   以下为开启A20的代码：
   
   ```x86asm
       #	File:	bootasm.S
       #	Line:	25-43

       # Enable A20:
       #  For backwards compatibility with the earliest PCs, physical
       #  address line 20 is tied low, so that addresses higher than
       #  1MB wrap around to zero by default. This code undoes this.
   seta20.1:
       inb $0x64, %al                                  # Wait for not busy(8042 input buffer empty).
       testb $0x2, %al
       jnz seta20.1
   
       movb $0xd1, %al                                 # 0xd1 -> port 0x64
       outb %al, $0x64                                 # 0xd1 means: write data to 8042's P2 port

   seta20.2:
       inb $0x64, %al                                  # Wait for not busy(8042 input buffer empty).
       testb $0x2, %al
       jnz seta20.2
   
       movb $0xdf, %al                                 # 0xdf -> port 0x60
       outb %al, $0x60                                 # 0xdf = 11011111, means set P2's A20 bit(the 1 bit) to 1
   ```
   
   8042芯片的I/O端口为0x60~0x6f，实际上IBM PC/AT使用的只有0x60和0x64两个端口。
   
   8042芯片有四个8 bit长的寄存器：*Input Buffer*, *Output Buffer*, *Status Register*, *Control Register*。
   
   为向*输出端口P2*写入数据，需要先将要写入的数据传入8042芯片的*Output Buffer*，然后让8042芯片会将*Output Buffer*的内容写入*输出端口P2*。
   
   向*Output Buffer*写入数据的流程为：向0x64端口发送0xd1，表示写入，然后再将要写入的数据传入0x60端口。
   
   在向*Output Buffer*写入数据前，需要先读取*Status Register*的数据已获取芯片状态，得到的结果第二个bit表示0x60和0x64端口是否有数据，若无数据才可正常写入。
   
   以下为具体步骤：
   
   ```x86asm
       #	File:	bootasm.S
       #	Line:	29-32

   seta20.1:
       inb $0x64, %al
       testb $0x2, %al
       jnz seta20.1
   ```

   首先，从0x64端口读入数据存入al，将al的值和0x02(00000010B)进行与操作，若得到结果不为0，即0x60和0x64端口内有数据，则跳转回标记`seta20.1`并重复这一操作，直到端口内无数据，则进行下一步。
   
   ```x86asm
       #	File:	bootasm.S
       #	Line:	34-35
       
       movb $0xd1, %al
       outb %al, $0x64
   ```
   
   然后将`0xd1`经al写入0x64端口，表示将要向0x60端口传入要写进*输出端口P2*的数据。
   
   ```x86asm
       #	File:	bootasm.S
       #	Line:	37-43

   seta20.2:
       inb $0x64, %al
       testb $0x2, %al
       jnz seta20.2
   
       movb $0xdf, %al
       outb %al, $0x60
   ```
   
   这里与`seta20.1`部分类似，从0x64端口获取状态，直到0x60和0x64端口内没有数据，即可执行下一部分。
   
   然后经al向0x60端口写入数据以传入*Output Buffer*，然后8042芯片自动将*Output Buffer*中的数据写入*输出端口P2*。
   
   在这段代码中写入0x60端口的数据为`0xdf` (`11011111B`)，其第二个bit为1，即表示开启*A20 Gate*。另外7个bit表示其它参数，这里不再做了解。

#### 参考文献

* [关于A20 Gate](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_appendix_a20.html)；
* [A20 Line](https://wiki.osdev.org/A20_Line)；
* 《x86汇编语言：从实模式到保护模式》，电子工业出版社；

### 如何初始化GDT表

#### 背景知识

1. 什么是GDT表

   Global Descriptor Table(全局描述符表)是IA32架构CPU的一种数据结构，它保存多个段描述符，其起始地址保存在全局描述符表寄存器(GDTR)中。GDTR长48位，其中高32位为基地址，低16位为段界限。

   其中，全局描述符表中第一个段描述符设定为空段描述符。GDTR中的段界限以字节为单位。对于含有N个描述符的描述符表的段界限通常可设为8\*N-1。

   GDT表由汇编指令`lgdt`加载，该指令将GDT表地址加载到GDTR中。

2. GDT表的作用
   
   在保护模式下，大多数内存管理和中断服务例程都是通过GDT表控制的。每个描述符(Descriptor)都存储着CPU可能需要的对象信息。

3. GDT表存储的内容

   * 空描述符（不会被加载）
   * 一个代码段描述符（在内核中，其类型应设为0x9A）
   * 一个数据段描述符（其类型应设为0x92）
   * 一个TSS(Task State Segment 任务段描述符)（uCore中没有使用）
   * ...

#### 问题分析

1. 如何初始化GDT表

   ```x86asm
       #	File:	bootasm.S
       #	Line:	49

       lgdt gdtdesc
   ```

   `gdtdesc`即GDT表的地址（见下文），使用`lgdt`指令加载即可。

2. uCore中GDT表的格式

   ```x86asm
       #	File:	bootasm.S
       #	Line:	77-86
    
   # Bootstrap GDT
   .p2align 2                                          # force 4 byte alignment
   gdt:
       SEG_NULLASM                                     # null seg
       SEG_ASM(STA_X|STA_R, 0x0, 0xffffffff)           # code seg for bootloader and kernel
       SEG_ASM(STA_W, 0x0, 0xffffffff)                 # data seg for bootloader and kernel

   gdtdesc:
       .word 0x17                                      # sizeof(gdt) - 1
       .long gdt                                       # address gdt
   ```

   `gdt`为存储的两个段描述符（以及之前的一个空的段描述符），`gdtdesc`为GDT表的段界限及段描述符(`gdt`)的起始地址。两个段描述符分别为：代码段描述符，数据段描述符。

   以下为代码中创建段描述符的宏以及其参数。

   ```c
	//	File:	asm.h
	//	Line:	4-23

	/* Assembler macros to create x86 segments */

	/* Normal segment */
	#define SEG_NULLASM                                             \
		.word 0, 0;                                                 \
		.byte 0, 0, 0, 0

	#define SEG_ASM(type,base,lim)                                  \
		.word (((lim) >> 12) & 0xffff), ((base) & 0xffff);          \
		.byte (((base) >> 16) & 0xff), (0x90 | (type)),             \
			(0xC0 | (((lim) >> 28) & 0xf)), (((base) >> 24) & 0xff)

	/* Application segment type bits */
	#define STA_X       0x8     // Executable segment
	#define STA_E       0x4     // Expand down (non-executable segments)
	#define STA_C       0x4     // Conforming code segment (executable only)
	#define STA_W       0x2     // Writeable (non-executable segments)
	#define STA_R       0x2     // Readable (executable segments)
	#define STA_A       0x1     // Accessed
   ```

   由以上代码可知，代码描述符的类型(type)值为`(0x90 | (STA_X|STA_R))`即`(0x90 | 0x0A) = 0x9A`，数据段描述符的类型(type)值为`(0x90 | STA_W)`即`(0x90 | 0x02) = 0x92`，与文档描述一致。

#### 参考文献

* [保护模式和分段机制](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_3_2_1_protection_mode.html)
* [Global Descriptor Table](https://wiki.osdev.org/Global_Descriptor_Table)

### 如何使能和进入保护模式

#### 背景知识

1. 什么是保护模式

   保护模式与实模式相对应，是在80286处理器之后现代Intel处理器主要的操作模式。在80386处理器或更高版本上，32位保护模式允许使用多个虚拟空间，每个虚拟空间最多具有4GB的可寻址内存，并能通过Rings限制可用的指令集使系统能够执行严格的内存和硬件I/O保护。

#### 问题分析

1. 如何进入保护模式

   在进入保护模式前，需要进行一系列操作：

   1. 禁用所有中断（执行`cli`命令）

   2. 启用*A20 Line*

   3. 使用适用于代码、数据和堆栈的段描述符加载GDT表

   做完准备工作后，就可以切换到保护模式了。

   控制实模式与保护模式切换的开关位于CR0寄存器。CR0是处理器内部的控制寄存器(Control Register, CR)，它是32位的寄存器，包含了一系列用于控制处理器操作模式和运行状态的标志位，它的第1位是保护模式允许位，把该位置设为1后处理器就会进入保护模式。

   ```x86asm
    #	File:	bootasm.S
    #	Line:	50-52

    movl %cr0, %eax
    orl $CR0_PE_ON, %eax
    movl %eax, %cr0
   ```
   
   由于CR0是32位寄存器，所以我们需要先将其值存入EAX寄存器。EAX寄存器是一个32位寄存器，AX是EAX的低16位。

   在存入数据后，对EAX的值与常量`CR0_PE_ON`进行位或操作，常量`CR0_PE_ON`的值为`0x1`，进行或操作后可使EAX内数值的第1位变为1，即将CR0状态标志位的保护模式允许为打开。

   然后将EAX寄存器内的值传入CR0，这时CR0内第1位的值变成了1，其它位的值也没有发生变化，这就标志着保护模式的启动。

#### 参考文献

* [Protected Mode](https://wiki.osdev.org/Protected_Mode)
* 《x86汇编语言：从实模式到保护模式》，电子工业出版社；

