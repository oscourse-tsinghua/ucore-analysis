### 练习1: 理解通过make生成执行文件的过程

[练习1文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_1_ex1.html)

* 操作系统镜像文件ucore.img是如何一步一步生成的
* 一个被系统认为符合规范的硬盘主引导扇区的特征是什么

#### 相关文件

* [Makefile](/ucore/Makefile_lab1.md)
* [sign.c](/ucore/tools/sign_c.md)

### 操作系统镜像文件ucore.img是如何一步一步生成的

#### 背景知识

1. 什么是`make`

   在这里，`make`一般指的是*GNU make*。在软件开发中，*GNU make*是一个工具程序，经由读取叫做`Makefile`的文件，自动化建构软件。

   它是一种转化文件形式的工具，转换的目标称为*target*；与此同时，它也检查文件的依赖关系，如果需要的话，它会调用一些外部软件来完成任务。它的依赖关系检查系统非常简单，主要根据依赖文件的修改时间进行判断。大多数情况下，它被用来编译源代码，生成结果代码，然后把结果代码连接起来生成可执行文件或者库文件。它使用叫做`Makefile`的文件来确定一个target文件的依赖关系，然后把生成这个target的相关命令传给shell去执行。

2. 什么是`Makefile`

   `Makefile`是*GNU make*进行操作的规则，开发者在里面定义了不同的*target*，可以根据需要去执行不同的操作。

   比如，在uCore中的`Makefile`包含以下*target*：`lab1-mon`, `debug-mon`, `qemu-mon`, `qemu`, `qemu-nox`等，直接执行`make`或在命令后面填写*target*的名称可进行不同的操作。

3. 如何调试`Makefile`

   当执行make时，一般只会显示输出，不会显示make到底执行了哪些命令。

   如想了解make执行了哪些命令，可以执行：

   ```bash
   $ make "V="
   ```

   要获取更多有关make的信息，可上网查询，并请执行

   ```bash
   $ man make
   ```

#### 问题分析

1. 操作系统镜像文件ucore.img是如何一步一步生成的

   我们先执行`make "V="`查看所得输出
   
   > \+ cc kern/init/init.c
   >
   > gcc -Ikern/init/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/init/init.c -o obj/kern/init/init.o
   >
   > \+ cc kern/libs/stdio.c
   >
   > gcc -Ikern/libs/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/stdio.c -o obj/kern/libs/stdio.o
   >
   > \+ cc kern/libs/readline.c
   > 
   > gcc -Ikern/libs/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/libs/readline.c -o obj/kern/libs/readline.o
   >
   > \+ cc kern/debug/panic.c
   > 
   > gcc -Ikern/debug/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/panic.c -o obj/kern/debug/panic.o
   >
   > \+ cc kern/debug/kdebug.c
   > 
   > gcc -Ikern/debug/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kdebug.c -o obj/kern/debug/kdebug.o
   >
   > \+ cc kern/debug/kmonitor.c
   > 
   > gcc -Ikern/debug/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/debug/kmonitor.c -o obj/kern/debug/kmonitor.o
   >
   > \+ cc kern/driver/clock.c
   > 
   > gcc -Ikern/driver/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/clock.c -o obj/kern/driver/clock.o
   > 
   > \+ cc kern/driver/console.c
   > 
   > gcc -Ikern/driver/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/console.c -o obj/kern/driver/console.o
   > 
   > \+ cc kern/driver/picirq.c
   > 
   > gcc -Ikern/driver/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/picirq.c -o obj/kern/driver/picirq.o
   > 
   > \+ cc kern/driver/intr.c
   > 
   > gcc -Ikern/driver/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/driver/intr.c -o obj/kern/driver/intr.o
   > 
   > \+ cc kern/trap/trap.c
   > 
   > gcc -Ikern/trap/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trap.c -o obj/kern/trap/trap.o
   > 
   > \+ cc kern/trap/vectors.S
   > 
   > gcc -Ikern/trap/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/vectors.S -o obj/kern/trap/vectors.o
   > 
   > \+ cc kern/trap/trapentry.S
   > 
   > gcc -Ikern/trap/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/trap/trapentry.S -o obj/kern/trap/trapentry.o
   > 
   > \+ cc kern/mm/pmm.c
   > 
   > gcc -Ikern/mm/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Ikern/debug/ -Ikern/driver/ -Ikern/trap/ -Ikern/mm/ -c kern/mm/pmm.c -o obj/kern/mm/pmm.o
   > 
   > \+ cc libs/string.c
   > 
   > gcc -Ilibs/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/string.c -o obj/libs/string.o
   > 
   > \+ cc libs/printfmt.c
   > 
   > gcc -Ilibs/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/  -c libs/printfmt.c -o obj/libs/printfmt.o
   > 
   > \+ ld bin/kernel
   > 
   > ld -m    elf_i386 -nostdlib -T tools/kernel.ld -o bin/kernel  obj/kern/init/init.o obj/kern/libs/stdio.o obj/kern/libs/readline.o obj/kern/debug/panic.o obj/kern/debug/kdebug.o obj/kern/debug/kmonitor.o obj/kern/driver/clock.o obj/kern/driver/console.o obj/kern/driver/picirq.o obj/kern/driver/intr.o obj/kern/trap/trap.o obj/kern/trap/vectors.o obj/kern/trap/trapentry.o obj/kern/mm/pmm.o  obj/libs/string.o obj/libs/printfmt.o
   > 
   > \+ cc boot/bootasm.S
   > 
   > gcc -Iboot/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootasm.S -o obj/boot/bootasm.o
   > 
   > \+ cc boot/bootmain.c
   > 
   > gcc -Iboot/ -fno-builtin -fno-PIC -Wall -ggdb -m32 -gstabs -nostdinc  -fno-stack-protector -Ilibs/ -Os -nostdinc -c boot/bootmain.c -o obj/boot/bootmain.o
   > 
   > \+ cc tools/sign.c
   > 
   > gcc -Itools/ -g -Wall -O2 -c tools/sign.c -o obj/sign/tools/sign.o
   > 
   > gcc -g -Wall -O2 obj/sign/tools/sign.o -o bin/sign
   > 
   > \+ ld bin/bootblock
   > 
   > ld -m    elf_i386 -nostdlib -N -e start -Ttext 0x7C00 obj/boot/bootasm.o obj/boot/bootmain.o -o obj/bootblock.o
   > 
   > 'obj/bootblock.out' size: 496 bytes
   > 
   > build 512 bytes boot sector: 'bin/bootblock' success!
   > 
   > dd if=/dev/zero of=bin/ucore.img count=10000
   > 
   > dd if=bin/bootblock of=bin/ucore.img conv=notrunc
   > 
   > dd if=bin/kernel of=bin/ucore.img seek=1 conv=notrunc

	**注意**: 此处仅列出`stdout`的输出结果，并没有列出`stderr`的内容；在进行编译/链接操作时，先输出了命令的简化描述，后输出了执行的完整命令

   由该内容可以看出，`make`进行操作的顺序为

   1. 编译kern目录下的所有文件（`cc kern/*`）

   2. 链接以上文件，生成内核文件`kernel`（`ld bin/kernel`）

     其文件格式为：`bin/kernel: ELF 32-bit LSB executable, Intel 80386, version 1 (SYSV), statically linked, not stripped`

   3. 编译boot目录下的所有文件（`cc boot/*`）
	
   4. 编译用来生成扇区文件的工具`sign.c`（`cc tools/sign.c`）
	
   5. 链接boot目录编译出的文件，生成文件`bootblock`（`ld bin/bootblock`）

      注意: 在链接`bootblock`时，`ld`命令指定了程序`bootasm`被实际加载到内存的位置为`0x7C00`。另外，进一步分析`Makefile`文件可以得知，`ld`链接后的文件为`bootblock.o`，该文件为Linux下的可执行文件。而后经过`objcopy`命令，将该可执行文件复制并转换为纯粹的，机器可直接执行的二进制文件`bootblock.out`，同时也为其缩小了文件尺寸，从超过1k缩小到了512字节以内，为编辑成主引导扇区提供了条件。
      
      ```makefile
      #	File:	Makefile
      #	Line:	156
      
          @$(OBJCOPY) -S -O binary $(call objfile,bootblock) $(call outfile,bootblock)
      ```
   
   6. 将`bootblock`编辑成为符合规范的硬盘主引导扇区

      注意：`make "V="`的输出内未列出执行的命令(该命令位于`Makefile`第157行)，但列出了`sign`执行的结果(见下方代码)：

      > build 512 bytes boot sector: 'bin/bootblock' success!

      执行完成后，`bootblock`的文件格式为：`bin/bootblock: DOS/MBR boot sector`
      
      ```makefile
      #		File:	Makefile
      #		Line:	157
      
          @$(call totarget,sign) $(call outfile,bootblock) $(bootblock)
      ```
      
      ```c
      //	File:	sign.c
      //	Line:	40
      
          printf("build 512 bytes boot sector: '%s' success!\n", argv[2]);
      ```

   7. 使用`dd`命令创建空的镜像`ucore.img`，然后将`bootblock`与`kernel`分别写入`ucore.img`，至此创建完成。

#### 参考文献

* [Make (software)](https://en.wikipedia.org/wiki/Make_%28software%29)
  
### 一个被系统认为符合规范的硬盘主引导扇区的特征是什么

#### 背景知识

1. 什么是主引导扇区

   主引导扇区位于整个磁盘的0磁头0柱面1扇区，包括主引导记录和分区表。

#### 问题分析

1. 符合规范的硬盘主引导扇区的特征是什么

   查阅文档可知，主引导扇区的特征为：

   1. 大小为512字节

   2. 以`0x55AA`结束

   参考`tools/sign.c`可以发现，该代码执行结果符合以上特征

   ```c
   //	File:	sign.c
   //	Line:	22

   char buf[512];

   //	Line:	31-34

   buf[510] = 0x55;
   buf[511] = 0xAA;
   FILE *ofp = fopen(argv[2], "wb+");
   size = fwrite(buf, 1, 512, ofp);
   ```

   该代码定义了长度为512的`char`型数组`buf`，把最后两个字节设为`0x55AA`后将其写入文件。

#### 参考文献

* [主引导扇区](https://baike.baidu.com/item/%E4%B8%BB%E5%BC%95%E5%AF%BC%E6%89%87%E5%8C%BA/7612621)

