### 练习4：分析bootloader加载ELF格式的OS的过程

[练习4文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_4_ex4.html)
[相关阅读：硬盘访问概述](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_3_2_3_dist_accessing.html)
[相关阅读：ELF文件格式概述](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_3_2_4_elf.html)

* bootloader如何读取硬盘扇区的
* bootloader是如何加载ELF格式的OS

#### 相关文件

* [bootmain.c](/ucore/boot/bootmain_c.md)
* [elf.h](/ucore/libs/elf.h)

### bootloader如何读取硬盘扇区的

#### 背景知识

1. 什么是`bootloader`
   
   `bootloader`是为了加载内核而编写的程序。

2. `bootloader`的作用是什么

   1. 将内核加载到内存

   2. 向内核提供正常工作所需的信息

   3. 切换到内核所需的环境

   4. 将控制权转移给内核

3. 什么是扇区
   
   磁盘上的每个磁道被等分为若干个弧段，这些弧段便是磁盘的扇区。硬盘的读写以扇区为基本单位。

4. 如何读写扇区

   硬盘相关IO地址及其对应功能：
   
   `0x1f0`: 读数据，当0x1f7不为忙状态时，可以读

   `0x1f2`: 要读写的扇区数，每次读写前，你需要表明你要读写几个扇区。最小是1个扇区

   `0x1f3`: 如果是LBA模式，就是LBA参数的0-7位

   `0x1f4`: 如果是LBA模式，就是LBA参数的8-15位

   `0x1f5`: 如果是LBA模式，就是LBA参数的16-23位

   `0x1f6`: 第0~3位：如果是LBA模式就是24-27位 第4位：为0主盘；为1从盘

   `0x1f7`: 状态和命令寄存器。操作时先给命令，再读取，如果不是忙状态就从0x1f0端口读数据

   读取扇区的流程大致如下：
   
   1. 等待磁盘准备好
   2. 发出读取扇区的命令
   3. 等待磁盘准备好
   4. 把磁盘扇区数据读到指定内存

#### 问题分析

1. `bootloader`是如何读取硬盘扇区的

   参考以下代码：

   ```c
   //	File:	bootmain.c
   //	Line:	43-61
   
   /* readsect - read a single sector at @secno into @dst */
   static void
   readsect(void *dst, uint32_t secno) {
       // wait for disk to be ready
       waitdisk();
   
       outb(0x1F2, 1);                         // count = 1
       outb(0x1F3, secno & 0xFF);
       outb(0x1F4, (secno >> 8) & 0xFF);
       outb(0x1F5, (secno >> 16) & 0xFF);
       outb(0x1F6, ((secno >> 24) & 0xF) | 0xE0);
       outb(0x1F7, 0x20);                      // cmd 0x20 - read sectors
   
       // wait for disk to be ready
       waitdisk();
   
       // read a sector
       insl(0x1F0, dst, SECTSIZE / 4);
   }
   ```

   其中，`waitdisk`函数的代码为：

   ```c
   //	File:	bootmain.c
   //	Line:	36-41

   /* waitdisk - wait for disk ready */
   static void
   waitdisk(void) {
       while ((inb(0x1F7) & 0xC0) != 0x40)
           /* do nothing */;
   }
   ```

   由以上代码可知，`bootloader`读取硬盘扇区步骤为

   1. 从`0x1F7`端口读硬盘状态，直到硬盘不忙
   2. 向`0x1F2`端口发送读写的扇区数量
   3. 向`0x1F3`~`0x1F6`端口发送LBA参数
   4. 向`0x1F7`端口发送读扇区的指令
   5. 从`0x1F7`端口读硬盘状态，直到硬盘不忙
   6. 从`0x1F0`端口读入扇区内容至`dst`

#### 参考文献

* [硬盘访问概述](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_3_2_3_dist_accessing.html)
* [Bootloader](https://wiki.osdev.org/Bootloader)

### bootloader是如何加载ELF格式的OS

#### 背景知识

1. `ELF`是什么

   `ELF`是类Unix系统上的一种文件格式，常用于二进制文件、可执行文件、目标代码、共享库和核心转储格式文件。

2. `ELF`的格式是什么

   参考代码：

   ```c
   //	File:	elf.h
   //	Line:	8-25

   /* file header */
   struct elfhdr {
       uint32_t e_magic;     // must equal ELF_MAGIC
       uint8_t e_elf[12];
       uint16_t e_type;      // 1=relocatable, 2=executable, 3=shared object, 4=core image
       uint16_t e_machine;   // 3=x86, 4=68K, etc.
       uint32_t e_version;   // file version, always 1
       uint32_t e_entry;     // entry point if executable
       uint32_t e_phoff;     // file position of program header or 0
       uint32_t e_shoff;     // file position of section header or 0
       uint32_t e_flags;     // architecture-specific flags, usually 0
       uint16_t e_ehsize;    // size of this elf header
       uint16_t e_phentsize; // size of an entry in program header
       uint16_t e_phnum;     // number of entries in program header or 0
       uint16_t e_shentsize; // size of an entry in section header
       uint16_t e_shnum;     // number of entries in section header or 0
       uint16_t e_shstrndx;  // section number that contains section name strings
   };
   ```

#### 问题分析

1. `bootloader`是如何加载`ELF`格式的OS

   参考代码：

   ```c
   //	File:	bootmain.c
   //	Line:	85-115

   /* bootmain - the entry of bootloader */
   void
   bootmain(void) {
       // read the 1st page off disk
       readseg((uintptr_t)ELFHDR, SECTSIZE * 8, 0);

       // is this a valid ELF?
       if (ELFHDR->e_magic != ELF_MAGIC) {
           goto bad;
       }

       struct proghdr *ph, *eph;
	   	
       // load each program segment (ignores ph flags)
       ph = (struct proghdr *)((uintptr_t)ELFHDR + ELFHDR->e_phoff);
       eph = ph + ELFHDR->e_phnum;
       for (; ph < eph; ph ++) {
           readseg(ph->p_va & 0xFFFFFF, ph->p_memsz, ph->p_offset);
       }

       // call the entry point from the ELF header
       // note: does not return
       ((void (*)(void))(ELFHDR->e_entry & 0xFFFFFF))();

   bad:
       outw(0x8A00, 0x8A00);
       outw(0x8A00, 0x8E00);

       /* do nothing */
       while (1);
   }
   ```

   由代码可知，`bootloader`加载OS的流程为：

   1. 将硬盘第一个扇区的内容读入`ELFHDR`
   2. 验证`ELFHDR`是否为合格的`ELF`格式
   3. 加载`ELF`的每个程序段
   4. 调用`ELF`头内的OS入口，加载OS成功

#### 参考文献

* [ELF文件格式概述](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_3_2_4_elf.html)
* [ELF](https://wiki.osdev.org/ELF)

