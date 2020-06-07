### Piazza优质问题/笔记收集

只列出跟lab相关，且被老师/助教标为`good question`的问题或`good note`的笔记，按时间顺序排列。

链接下方会写出问题大意。

* [关于lab1中的bootloader和ucore的连接问题](https://piazza.com/class/i5j09fnsl7k5x0?cid=72)
  * 在lab1中当bootmain执行了将ucore内核加载到内存中之后，怎么样将cpu的控制权交到ucore的手中，具体是哪几行代码？
* [lab1中tools/function.mk中语句的理解？](https://piazza.com/class/i5j09fnsl7k5x0?cid=89)
  * lab1中tools/function.mk中有许多处出现`$$$$(dir $$$$@)`，这样的语句，请问是什么意思？
* [关于GDT和IDT的设置](https://piazza.com/class/i5j09fnsl7k5x0?cid=90)
  * IDT和GDT的初始化都是在bootloader中完成的吗？Lab1中BIOS部分在哪里可以体现？
* (note)[关于启动后的地址](https://piazza.com/class/i5j09fnsl7k5x0?cid=91)
  * BIOS第一步识别RAM，那么之前机器是怎么找到位置的?
* [关于lab1的SETGATE函数](https://piazza.com/class/i5j09fnsl7k5x0?cid=102)
  * 对`SETGATE`这个函数的参数使用不大理解，想询问具体含义。
* (note)[cpu寻址时机器如何区分ROM和RAM](https://piazza.com/class/i5j09fnsl7k5x0?cid=106)
  * 机器是通过什么机制或原理保障第一条指令是访问BIOS而不是内存呢？
* (note)[SETGATE宏的第二个参数istrap的设置](https://piazza.com/class/i5j09fnsl7k5x0?cid=125)
  * 我认为有更合适的实现方式
* (note)[扩展实验1的参考答案中里面有冗余(中间的指向有问题)!](https://piazza.com/class/i5j09fnsl7k5x0?cid=127)
  * `switchk2u.tf_esp = (uint32_t)tf + sizeof(struct trapframe)- 8;`，其实这个`-8`是多余的
* [如何单步跟踪BIOS](https://piazza.com/class/i5j09fnsl7k5x0?cid=143)
* [【注意】内联汇编（语句）分为基本和扩展asm语句](https://piazza.com/class/i5j09fnsl7k5x0?cid=215)
  * 基本asm语句寄存器前只需一个`%`，扩展asm语句寄存器前需要两个`%%`
* [原来boot sector signature验证是在BIOS中执行](https://piazza.com/class/i5j09fnsl7k5x0?cid=312)
* [内核栈、用户栈的问题](https://piazza.com/class/i5j09fnsl7k5x0?cid=654)
  * 网上说每次进程从用户态进入内核态的时候，得到的内核栈都是空的。那这样的话，进入内核态时，直接把用户栈当作内核栈就可以啦呀？
* [有关于mm/pmm.c中GDT表的建立](https://piazza.com/class/i5j09fnsl7k5x0?cid=1001)
  * 既然之后会有页机制来进行权限控制，为什么还要在这里重复进行检查呢，这一步是多余的吗（即段表只设置NULL和KERNEL可以吗）？
* (note)[lab1学习经验](https://piazza.com/class/i5j09fnsl7k5x0?cid=1308)
  * lab1是ucore的基础，它学好了后续的实验基本上都不成问题。lab1花费的时间长一些完全是可以接受的，关键是要弄懂它，懂得关键代码每一行的具体意义
* [一些心得和技巧分享](https://piazza.com/class/i5j09fnsl7k5x0?cid=1357)
  * 在学习 ucore 的过程中收获很大，这里分享一些个人的心得和调试技巧。我主要是在知乎专栏发布，有兴趣的同学可以关注我的知乎专栏。

