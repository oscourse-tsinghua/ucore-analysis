### 练习2：使用qemu执行并调试lab1中的软件

[练习2文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_2_1_2_ex2.html)

[相关阅读：启动后第一条执行的指令](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab1/lab1_5_appendix.html)

为了熟悉使用qemu和gdb进行的调试工作，我们进行如下的小练习：

1. 从CPU加电后执行的第一条指令开始，单步跟踪BIOS的执行。
2. 在初始化位置0x7c00设置实地址断点,测试断点正常。
3. 从0x7c00开始跟踪代码运行,将单步跟踪反汇编得到的代码与bootasm.S和 bootblock.asm进行比较。
4. 自己找一个bootloader或内核中的代码位置，设置断点并进行测试。

#### 相关文件

* [gdbinit](/ucore/tools/gdbinit.md)
* [bootasm.S](/ucore/boot/bootasm_S.md)

### 从CPU加电后执行的第一条指令开始，单步跟踪BIOS的执行。

#### 背景知识

1. 什么是`gdb`？

   在这里，`gdb`指的是*GNU Debugger*，`gdb`即其缩写。

   *GDB*是GNU软件系统中的标准调试器，此外*GDB*也是个具有移携性的调试器，经过移携需求的调修与重新编译，如今许多的类UNIX操作系统上都可以使用*GDB*，而现有*GDB*所能支持调试的编程语言有C、C++、Pascal以及FORTRAN。

2. 如何使用`gdb`？

   如直接使用，在命令行调用即可。但*ucore*的`Makefile`中已写好了调用`gdb`的命令，可直接使用。在本练习中，我们只需修改`tools/gdbinit`中*GDB*的配置文件即可。

   附：`Makefile`中调用`gdb`的命令及参数含义

   调用gdb的命令：

   ```makefile
   # File:   Makefile
   # Line:   220-223

   debug: $(UCOREIMG)
       $(V)$(QEMU) -S -s -parallel stdio -hda $< -serial null &
       $(V)sleep 2
       $(V)$(TERMINAL) -e "gdb -q -tui -x tools/gdbinit"
   ```

   由以上代码可以知道，在执行`make debug`以启动`debug`这一target后，会先完成`UCOREIMG`这一target，然后相继启动`qemu`、`gdb`。

   `qemu`的参数不再赘述，本节重点讨论`gdb`的相关参数。

   首先，`make`调用`$(TERMINAL) -e "gdb -q -tui -x tools/gdbinit"`。这里使用Linux内置的终端开启了一个新窗口然后在其中调用`gdb`。

   * `-q`，即`--quiet`或`--silent`，作用为：Do not print version number on startup.
      * 在正常启动`gdb`时，`gdb`会输出相关的版本信息，如笔者的会输出：
	   
          > GNU gdb (GDB) 9.1
		  > 
          > Copyright (C) 2020 Free Software Foundation, Inc.
		  > 
          > License GPLv3+: GNU GPL version 3 or later <http://gnu.org/licenses/gpl.html>
		  > 
          > This is free software: you are free to change and redistribute it.
		  > 
          > There is NO WARRANTY, to the extent permitted by law.
		  > 
          > Type "show copying" and "show warranty" for details.
		  > 
          > This GDB was configured as "x86_64-pc-linux-gnu".
		  > 
          > Type "show configuration" for configuration details.
		  > 
          > For bug reporting instructions, please see:
		  > 
          > <http://www.gnu.org/software/gdb/bugs/>.
		  > 
          > Find the GDB manual and other documentation resources online at:
		  > 
          > <http://www.gnu.org/software/gdb/documentation/>.
		  > 
          > For help, type "help".
		  > 
          > Type "apropos word" to search for commands related to "word".
		  > 
          > (gdb)

         然后即可在`(gdb)`后面输入命令。
         而添加`-q`参数后启动`gdb`，则会输出：

          > (gdb)
         
         仅此而已。

   * `-tui`，作用为：Use a terminal user interface. 即在终端中使用UI，读者可亲自尝试，本处不再赘述。

     另外，如果不需要该选项，可以将`make debug`替换为`make debug-nox`。

   * `-x file`，作用为：Execute GDB commands from file file. 即从文件中执行*GDB*命令。

   以上就是`Makefile`中`gdb`所使用的参数含义。

#### 问题分析

1. CPU加电后第一条指令从哪里开始执行？

   从`0xffff0`开始执行。

   为验证这一结论，我们可以修改`tools/gdbinit`文件，然后在`lab1`目录下输入`$ make debug`启动调试。

   要修改的`gdbinit`的内容：

   ```
   set architecture i8086
   target remote :1234
   ```

   启动debug后，我们可以看到*GDB*停在了`0xfff0`位置，这里的`0xfff0`即IP寄存器内的值。如果我们想要知道此时指令所在位置，还需要有CS寄存器的值。

   我们在`gdb`中键入：`info registers cs eip`，可以看到下面返回了

   > (gdb) info registers cs eip 
   > 
   > cs             0xf000              61440
   >
   > eip            0xfff0              0xfff0


   那么此时BIOS第一条指令所在位置就是CS:IP所指向的位置，即`0xffff0`了。

   那么，应该如何查看这条指令是什么汇编指令呢？我们尝试在`gdb`的命令行中输入`x/i 0xffff0`，就可以看到这条指令的内容了。

   > (gdb) x/i 0xffff0
   > 
   >    0xffff0:     ljmp   $0xf000,$e05b

   显然这是一条跳转指令，将指令跳转到了`0xfe05b`。我们在`gdb`中键入`stepi`，或者其缩写`si`，可以跳转到下一步指令的位置。

   然后我们可以继续输入`x/10i 0xfe05b`，可以查看接下来的10条指令，将此处的10改为更大的值，可以查看更多指令，此处请读者自行尝试。

   > (gdb) x/i 0xfe05b
   > 
   >    0xfe05b:     cmpw   $0xffc8,%cs:(%esi)
   > 
   >    0xfe060:     bound  %eax,(%eax)
   > 
   >    0xfe062:     jne    0xd241d0b6
   > 
   >    0xfe068:     mov    %edx,%ss
   > 
   >    0xfe06a:     mov    $0x7000,%sp
   > 
   >    0xfe06e:     add    %al,(%eax)
   > 
   >    0xfe070:     mov    $0x8a4,%dx
   > 
   >    0xfe074:     verw   %cx
   > 
   >    0xfe077:     mov    $0xee,%dl
   > 
   >    0xfe079:     push   %bp

#### 参考文献

* [GNU Debugger](https://en.wikipedia.org/wiki/GNU_Debugger)
* [GNU调试器](https://zh.wikipedia.org/wiki/GNU%E4%BE%A6%E9%94%99%E5%99%A8)
  
### 在初始化位置0x7c00设置实地址断点,测试断点正常。

#### 背景知识

1. 如何在`gdb`中设置断点？

   在`gdb`中设置断点需使用指令`berak`或者其缩写`b`。设置断点有多种方法，在此我们只讲解两种：函数断点和内存断点。

   * 函数断点：`break function`，直接在`break`后加函数名即可。注意此方法需提前加载被执行程序的符号表，否则*GDB*无法识别该函数所在具体位置。函数断点在ucore中经常使用，我们在调试内核时就在`kern_init`函数处设置了断点，然后就可以从此处进行进一步的调试。

   * 内存断点：`break *address`，比如我们要在`0x7c00`处设置断点，就可键入`break *0x7c00`，当程序执行到断点时程序就会自动停止，然后就可以开始调试了。

#### 问题分析

1. 在初始化位置0x7c00设置实地址断点,测试断点正常。

   我们在`gdbinit`文件中设置断点`break *0x7c00`，然后启动调试，发现启动后程序停在了`0x7c00`处，说明断点设置正常。


#### 参考文献

* 练习2文档

### 从0x7c00开始跟踪代码运行,将单步跟踪反汇编得到的代码与bootasm.S和bootblock.asm进行比较。

#### 背景知识

1. 如何单步跟踪反汇编代码？

   我们可以修改`gdbinit`文件，在其中添加如下命令：

   ```
   define hook-stop
   x/i $pc
   end
   ```

   该命令在`gdb`中定义了一个钩子，每执行一步操作都会输出当前命令所在位置的汇编代码。随后我们就可以键入`stepi`观察每一步命令了。

2. `gdb`中的单步命令

   在gdb中，有next, nexti, step, stepi等指令来单步调试程序，他们功能各不相同，区别在于单步的“跨度”上。

   > next 单步到程序源代码的下一行，不进入函数。
   > 
   > nexti 单步一条机器指令，不进入函数。
   > 
   > step 单步到下一个不同的源代码行（包括进入函数）。
   > 
   > stepi 单步一条机器指令。

#### 问题分析

1. 从0x7c00开始跟踪代码运行并将单步跟踪反汇编得到的代码与bootasm.S和bootblock.asm进行比较

   单步跟踪得到的反汇编代码（`bootasm.S`部分）：

   > 0x7c02:	cli    
   > 
   > 0x7c01:	cld    
   > 
   > 0x7c02:	xor    %eax,%eax
   > 
   > 0x7c04:	mov    %eax,%ds
   > 
   > 0x7c06:	mov    %eax,%es
   > 
   > 0x7c08:	mov    %eax,%ss
   > 
   > 0x7c0a:	in     $0x64,%al
   > 
   > 0x7c0c:	test   $0x2,%al
   > 
   > 0x7c0e:	jne    0x7c0a
   > 
   > 0x7c10:	mov    $0xd1,%al
   > 
   > 0x7c12:	out    %al,$0x64
   > 
   > 0x7c14:	in     $0x64,%al
   > 
   > 0x7c16:	test   $0x2,%al
   > 
   > 0x7c18:	jne    0x7c14
   > 
   > 0x7c1a:	mov    $0xdf,%al
   > 
   > 0x7c1c:	out    %al,$0x60
   > 
   > 0x7c1e:	lgdtl  (%esi)
   > 
   > 0x7c23:	mov    %cr0,%eax
   > 
   > 0x7c26:	or     $0x1,%ax
   > 
   > 0x7c2a:	mov    %eax,%cr0
   > 
   > 0x7c2d:	ljmp   $0xb866,$0x87c32
   > 
   > 0x7c32:	mov    $0x10,%ax
   > 
   > 0x7c36:	mov    %eax,%ds
   > 
   > 0x7c38:	mov    %eax,%es
   > 
   > 0x7c3a:	mov    %eax,%fs
   > 
   > 0x7c3c:	mov    %eax,%gs
   > 
   > 0x7c3e:	mov    %eax,%ss
   > 
   > 0x7c40:	mov    $0x0,%ebp
   > 
   > 0x7c45:	mov    $0x7c00,%esp
   > 
   > 0x7c4a:	call   0x7d0f

   受篇幅限制，后续请读者自行分析与`bootasm.S`、`bootblock.asm`的区别。
   
   **提示**：`bootblock.asm`文件位于`lab1/obj/bootblock.asm`


#### 参考文献

* 练习2文档

### 自己找一个bootloader或内核中的代码位置，设置断点并进行测试。

略

