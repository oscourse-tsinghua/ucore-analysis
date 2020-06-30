### 练习2：实现寻找虚拟地址对应的页表项

[练习文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab2/lab2_3_2_1_phymemlab_exercise.html)

#### 相关文件

* [pmm.c](/ucore/kern/mm/pmm_c.md)

### 实现寻找虚拟地址对应的页表项

#### 练习内容

通过设置页表和对应的页表项，可建立虚拟内存地址和物理内存地址的对应关系。其中的`get_pte`函数是设置页表项环节中的一个重要步骤。此函数找到一个虚地址对应的二级页表项的内核虚地址，如果此二级页表项不存在，则分配一个包含此项的二级页表。本练习需要补全`get_pte`函数 in `kern/mm/pmm.c`，实现其功能。

#### 练习细节

首先，我们先看一下需要编写的`get_pte`的注释。

```c
//	File:	pmm.c

//get_pte - get pte and return the kernel virtual address of this pte for la
//        - if the PT contians this pte didn't exist, alloc a page for PT
// parameter:
//  pgdir:  the kernel virtual base address of PDT
//  la:     the linear address need to map
//  create: a logical value to decide if alloc a page for PT
// return vaule: the kernel virtual address of this pte
pte_t *
get_pte(pde_t *pgdir, uintptr_t la, bool create) {
    /* LAB2 EXERCISE 2: YOUR CODE
     *
     * If you need to visit a physical address, please use KADDR()
     * please read pmm.h for useful macros
     *
     * Maybe you want help comment, BELOW comments can help you finish the code
     *
     * Some Useful MACROs and DEFINEs, you can use them in below implementation.
     * MACROs or Functions:
     *   PDX(la) = the index of page directory entry of VIRTUAL ADDRESS la.
     *   KADDR(pa) : takes a physical address and returns the corresponding kernel virtual address.
     *   set_page_ref(page,1) : means the page be referenced by one time
     *   page2pa(page): get the physical address of memory which this (struct Page *) page  manages
     *   struct Page * alloc_page() : allocation a page
     *   memset(void *s, char c, size_t n) : sets the first n bytes of the memory area pointed by s
     *                                       to the specified value c.
     * DEFINEs:
     *   PTE_P           0x001                   // page table/directory entry flags bit : Present
     *   PTE_W           0x002                   // page table/directory entry flags bit : Writeable
     *   PTE_U           0x004                   // page table/directory entry flags bit : User can access
     */
#if 0
    pde_t *pdep = NULL;   // (1) find page directory entry
    if (0) {              // (2) check if entry is not present
                          // (3) check if creating is needed, then alloc page for page table
                          // CAUTION: this page is used for page table, not for common data page
                          // (4) set page reference
        uintptr_t pa = 0; // (5) get linear address of page
                          // (6) clear page content using memset
                          // (7) set page directory entry's permission
    }
    return NULL;          // (8) return page table entry
#endif
}
```

这里再提醒一下，在`mmu.h`中也有一部分注释非常重要，但以上并没有提及。查看该注释对练习2以及练习3非常有帮助。

```c
//	File:	mmu.h
//	Line:	190-201

// A linear address 'la' has a three-part structure as follows:
//
// +--------10------+-------10-------+---------12----------+
// | Page Directory |   Page Table   | Offset within Page  |
// |      Index     |     Index      |                     |
// +----------------+----------------+---------------------+
//  \--- PDX(la) --/ \--- PTX(la) --/ \---- PGOFF(la) ----/
//  \----------- PPN(la) -----------/
//
// The PDX, PTX, PGOFF, and PPN macros decompose linear addresses as shown.
// To construct a linear address la from PDX(la), PTX(la), and PGOFF(la),
// use PGADDR(PDX(la), PTX(la), PGOFF(la)).
```

这里说明，宏`PDX(la)`用来获取一级页表（页目录）索引，`PTX(la)`用来获取二级页表索引，`PGOFF(la)`用来获取页偏移。`la`即`get_pte`传入的参数，需要被映射的线性地址。

由于`page2pa`得到的是`page table`的物理地址，而`page table`是对齐到4K的，所以其地址的低12为均为`0`，可以用来存储一些标志位。

PDE的具体结构见Intel文档中关于32位页表部分，低12位为标志位，高20位为地址。所以物理地址对标志位进行*或运算*得到的就是PDE，将PDE的标志位去掉（即调用`PDE_ADDR`）得到的就是物理地址。

此外，由于这时已经启动了页机制（在`entry.S`中），对内存的操作使用的均为内核虚地址而非物理地址，所以进行操作前需要将物理地址通过`KADDR`进行转换。

解释到这里，再加上`get_pte`中详细的注释，写出代码也就不难了吧。

```c
//	File:	pmm.c

pte_t *
get_pte(pde_t *pgdir, uintptr_t la, bool create) {
    pde_t *pdep = &pgdir[PDX(la)];
    if (!(*pdep & PTE_P)) {
        struct Page *page;
        if (!create || (page = alloc_page()) == NULL) {
            return NULL;
        }
        set_page_ref(page, 1);
        uintptr_t pa = page2pa(page);
        memset(KADDR(pa), 0, PGSIZE);
        *pdep = pa | PTE_U | PTE_W | PTE_P;
    }
    return &((pte_t *)KADDR(PDE_ADDR(*pdep)))[PTX(la)];
}
```

#### 问题分析

1. 请描述页目录项（Page Directory Entry）和页表项（Page Table Entry）中每个组成部分的含义以及对ucore而言的潜在用处。

   详情见参考文献。

2. 如果ucore执行过程中访问内存，出现了页访问异常，请问硬件要做哪些事情？

   引发页异常中断，将外存的数据换入到内存。详情见lab3。

#### 参考文献

* [Intel® 64 and IA-32 ArchitecturesSoftware Developer’s Manual](https://software.intel.com/sites/default/files/managed/39/c5/325462-sdm-vol-1-2abcd-3abcd.pdf)
  * Chap. 4.3, Vol. 3，介绍32位页表

