### 练习3: 分析bootloader进入保护模式的过程

* 为何开启A20，以及如何开启A20
* 如何初始化GDT表
* 如何使能和进入保护模式

### 为何开启A20，如何开启A20

#### 背景知识

1. *A20*是什么？

   *A20*为处理器的第21根地址线。A即Address。A0是第一根地址线，以此类推，*A19*是第20根地址线，*A20*是第21根地址线。

2. 开启*A20*是什么？

   开启*A20*指的是开启*A20 Gate*。

   *A20 Gate*是80286处理器为了兼容8086处理器的程序而设置的，一个控制第21根地址线（*A20 Line*）的与门。

3. 为什么要有*A20 Gate*？

   8086处理器有20根地址线（*A0* ~ *A19*），可以寻址1MB内存。当物理地址达到0xFFFFF(11111111111111111111B)时，再加1，由于只能维持20位地址，进位会丢失导致地址变为0x00000(00000000000000000000B)。

   而80286处理器有24根地址线（*A0* ~ *A23*），可以寻址16M内存。当物理地址达到0x0FFFFF(000011111111111111111111B)，再加1，得到的地址为0x100000(000100000000000000000000)。若运行8086处理器的程序，会导致寻址出现错误。

   为了让80286处理器兼容8086处理器的程序，IBM在主板上添加了*A20 Gate*，当*A20 Gate*关闭（值为0）时，在与门的操作下，*A20 Line*的值始终为0，所以当0x(0)FFFFF[(000**0**)11111111111111111111B]增加1时80286处理器可以得到跟8086处理器一样的结果0x(0)00000[(000**0**)00000000000000000000]。

4. 如何开启*A20 Gate*？

   *A20 Gate*的控制阀门在8042键盘控制器（8042芯片）内，为*输出端口P2*的第二个bit（*P21引脚*）。

   为开启*A20 Gate*，只需向*P2端口*写入第二个bit为1的一个字节即可。

#### 问题分析

1. 为何开启A20？

   为了使CPU可以正常访问高于16位的地址。

2. 如何开启A20？

   见`bootasm.S`第25行到第43行。
   
   8042芯片的I/O端口为0x60~0x6F，实际上IBM PC/AT使用的只有0x60和0x64两个端口。

   8042芯片有四个8 bit长的寄存器：*Input Buffer*, *Output Buffer*, *Status Register*, *Control Register*。

   为向*输出端口P2*写入数据，需要先将要写入的数据传入8042芯片的*Output Buffer*，然后让8042芯片会将*Output Buffer*的内容写入*输出端口P2*。

   向*Output Buffer*写入数据的流程为：向0x64端口发送0xd1，表示写入，然后再将要写入的数据传入0x60端口。

   在向*Output Buffer*写入数据前，需要先读取*Status Register*的数据已获取芯片状态，得到的结果第二个bit表示0x60和0x64端口是否有数据，若无数据才可正常写入。

   所以可以参考代码：

   第30-32行表示：从0x64读入数据，将数据和0x02(00000010B)进行与操作，若得到结果不为0,即0x60和0x64端口内有数据，则跳转会第30行重复这一操作，直到端口内无数据，才可继续向下执行。第34-35行表示将0xd1写入0x64端口，表示将要向0x60端口传入将要写入*输出端口P2*的数据。

   第38-40行与第30-32行类似，从0x64端口获取状态，等到0x60和0x64端口内没有数据，即可执行第42-43行，向0x60端口写入数据以传入*Output Buffer*，然后8042芯片自动将*Output Buffer*中的数据写入*输出端口P2*。

   从该代码第42行可知，写入的数据为0xdf(11011111)，其第二个bit为1，即表示开启*A20 Gate*。另外7个bit表示其它参数，这里不再做了解。

#### 参考文献

* [关于A20 Gate](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_appendix_a20.html)；
* [A20 Line](https://wiki.osdev.org/A20_Line)；
* 《x86汇编语言：从实模式到保护模式》，电子工业出版社；

### 如何初始化GDT表

稍后补充

### 如何使能和进入保护模式

稍后补充

### bootasm.S

```x86asm
#include <asm.h>

# Start the CPU: switch to 32-bit protected mode, jump into C.
# The BIOS loads this code from the first sector of the hard disk into
# memory at physical address 0x7c00 and starts executing in real mode
# with %cs=0 %ip=7c00.

.set PROT_MODE_CSEG,        0x8                     # kernel code segment selector
.set PROT_MODE_DSEG,        0x10                    # kernel data segment selector
.set CR0_PE_ON,             0x1                     # protected mode enable flag

# start address should be 0:7c00, in real mode, the beginning address of the running bootloader
.globl start
start:
.code16                                             # Assemble for 16-bit mode
    cli                                             # Disable interrupts
    cld                                             # String operations increment

    # Set up the important data segment registers (DS, ES, SS).
    xorw %ax, %ax                                   # Segment number zero
    movw %ax, %ds                                   # -> Data Segment
    movw %ax, %es                                   # -> Extra Segment
    movw %ax, %ss                                   # -> Stack Segment

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

    # Switch from real to protected mode, using a bootstrap GDT
    # and segment translation that makes virtual addresses
    # identical to physical addresses, so that the
    # effective memory map does not change during the switch.
    lgdt gdtdesc
    movl %cr0, %eax
    orl $CR0_PE_ON, %eax
    movl %eax, %cr0

    # Jump to next instruction, but in 32-bit code segment.
    # Switches processor into 32-bit mode.
    ljmp $PROT_MODE_CSEG, $protcseg

.code32                                             # Assemble for 32-bit mode
protcseg:
    # Set up the protected-mode data segment registers
    movw $PROT_MODE_DSEG, %ax                       # Our data segment selector
    movw %ax, %ds                                   # -> DS: Data Segment
    movw %ax, %es                                   # -> ES: Extra Segment
    movw %ax, %fs                                   # -> FS
    movw %ax, %gs                                   # -> GS
    movw %ax, %ss                                   # -> SS: Stack Segment

    # Set up the stack pointer and call into C. The stack region is from 0--start(0x7c00)
    movl $0x0, %ebp
    movl $start, %esp
    call bootmain

    # If bootmain returns (it shouldn't), loop.
spin:
    jmp spin

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
