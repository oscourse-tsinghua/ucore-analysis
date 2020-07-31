### 练习3：释放某虚地址所在的页并取消对应二级页表项的映射

[练习文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab2/lab2_3_2_1_phymemlab_exercise.html)

#### 相关文件

* [pmm.c](/ucore/kern/mm/pmm_c.md)

### 释放某虚地址所在的页并取消对应二级页表项的映射

#### 练习内容

当释放一个包含某虚地址的物理内存页时，需要让对应此物理内存页的管理数据结构 `Page` 做相关的清除处理，使得此物理内存页成为空闲；另外还需把表示虚地址与物理地址对应关系的二级页表项清除。请仔细查看和理解 `page_remove_pte` 函数中的注释。为此，需要补全在 `kern/mm/pmm.c` 中的 `page_remove_pte` 函数。

#### 练习细节

按照惯例，先来看一下需要编写的 `page_remove_pte` 的注释：

```c
//	File:	pmm.c

//page_remove_pte - free an Page sturct which is related linear address la
//                - and clean(invalidate) pte which is related linear address la
//note: PT is changed, so the TLB need to be invalidate 
static inline void
page_remove_pte(pde_t *pgdir, uintptr_t la, pte_t *ptep) {
    /* LAB2 EXERCISE 3: YOUR CODE
     *
     * Please check if ptep is valid, and tlb must be manually updated if mapping is updated
     *
     * Maybe you want help comment, BELOW comments can help you finish the code
     *
     * Some Useful MACROs and DEFINEs, you can use them in below implementation.
     * MACROs or Functions:
     *   struct Page *page pte2page(*ptep): get the according page from the value of a ptep
     *   free_page : free a page
     *   page_ref_dec(page) : decrease page->ref. NOTICE: ff page->ref == 0 , then this page should be free.
     *   tlb_invalidate(pde_t *pgdir, uintptr_t la) : Invalidate a TLB entry, but only if the page tables being
     *                        edited are the ones currently in use by the processor.
     * DEFINEs:
     *   PTE_P           0x001                   // page table/directory entry flags bit : Present
     */
#if 0
    if (0) {                      //(1) check if this page table entry is present
        struct Page *page = NULL; //(2) find corresponding page to pte
                                  //(3) decrease page reference
                                  //(4) and free this page when page reference reachs 0
                                  //(5) clear second page table entry
                                  //(6) flush tlb
    }
#endif
}
```

首先，这里说明了函数的作用，即释放一个与线性地址 `la` 相关联的 `Page struct`，并且清理（使无效）与线性地址 `la`相关的 pte。

注意：PT 被改变，所以 TLB 需要被无效化。

接下来结合注释跟代码的提示就很容易写出啦，比如 (1) 就是检查标志位，(2) 调用 `pte2page`，(3) 使用 `page_ref_dec` 减少 `Page` 的引用计数等等。

参考答案：

```c
static inline void
page_remove_pte(pde_t *pgdir, uintptr_t la, pte_t *ptep) {
	if (*ptep & PTE_P)
	{
		struct Page * page = pte2page(*ptep);
		if (page_ref_dec(page) == 0)
			free_page(page);
		*ptep = 0;
		tlb_invalidate(pgdir, la);
	}
}
```

#### 问题分析

* 数据结构Page的全局变量（其实是一个数组）的每一项与页表中的页目录项和页表项有无对应关系？如果有，其对应关系是啥？

  首先来看一下全局变量 `pages` 的定义：

  ```c
  // virtual address of physicall page array
  struct Page *pages;
  ```

  还有结构体 `Page` 的定义：

  ```c
  /* *
   * struct Page - Page descriptor structures. Each Page describes one
   * physical page. In kern/mm/pmm.h, you can find lots of useful functions
   * that convert Page to other data types, such as phyical address.
   * */
  struct Page {
      int ref;                        // page frame's reference counter
      uint32_t flags;                 // array of flags that describe the status of the page frame
      unsigned int property;          // the num of free block, used in first fit pm manager
      list_entry_t page_link;         // free list link
  };
  ```

  再来复习一下上一个练习中的知识：线性地址 `la` 是由页目录项 PDE、页表项 PTE、页偏移 PGOFF 组成的。

  结合以上知识，就很容易想到，对于每个有效的页目录项或者页表项，都有一个 `page` 都记录着其信息。

* 如果希望虚拟地址与物理地址相等，则需要如何修改lab2，完成此事？ 鼓励通过编程来具体完成这个问题

  结合参考文献，将虚拟地址与物理地址的偏移改为 `0` 即可。

#### 参考文献

* [系统执行中地址映射的三个阶段](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab2/lab2_3_3_5_4_maping_relations.html)

