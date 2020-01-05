### 练习1: 实现 first-fit 连续物理内存分配算法

[练习文档](https://chyyuu.gitbooks.io/ucore_os_docs/content/lab2/lab2_3_2_1_phymemlab_exercise.html)


#### 相关文件

* [default_pmm.c](/ucore/kern/mm/default_pmm_c.md)

### 实现 first-fit 连续物理内存分配算法

#### 背景知识

1. 什么是`first-fit 连续物理内存分配算法`

   首次适应(first fit, FF)算法，要求空闲分区链以地址递增的次序链接。在分配内存时，从链首开始顺序查找，直至找到一个大小能满足要求的空闲分区为止。然后再按照作业的大小，从该分区划出一块内存空间，分配给请求者，余下的空闲分区仍留在空闲链中。若从链首直至链尾都不能找到一个能满足要求的分区，则表明系统中已没有足够大的内存分配给该进程，内存分配失败，返回。

2. `first fit`算法的特点是什么

   该算法倾向于优先利用内存中低地址部分的空闲分区，从而保留了高址部分的大空闲区。这为以后到达的大作业分配大的内存空间创造了条件。其缺点是低址部分不断被划分，会留下许多难以利用的、很小的空闲分区，称为碎片。而每次查找又是从低址部分开始的，这无疑又会增加查找可用分区时的开销。

3. 分区分配的操作是什么

   * 分配内存：

      系统应利用某种分配算法，从空闲分区链(表)中找到所需大小的分区。设请求的分区大小为`u.size`，表中每个空闲分区的大小可表示为`m.size`，若`m.size-u.size<=size`(size是事先规定的不再切割的剩余分区的大小)，说明多余部分太小，可不再切割，将整个分区分配给请求者。否则(即多余部分超过`size`)，便从该分区中按请求的大小划分出一块内存空间分配出去，余下的部分仍留在空闲分区链(表)中。然后，将分配区的首址返回给调用者。

   * 回收内存

      当进程运行完毕释放内存时，系统根据回收区的首址，从空闲区链(表)中找到相应的插入点，此时可能出现以下四种情况之一：

      1. 回收区与插入点的前一个空闲分区F1相邻接。此时应将回收区与插入点的前一分区合并，不必为回收分区分配新表项，而只需修改前一分区F1的大小。

	  2. 回收分区与插入点的后一空闲分区F2相邻接。此时也可将两份区合并，形成新的空闲分区，但用回收区的首地址作为新空闲区的首址，大小为两者之和。

	  3. 回收区同时与插入点的前、后两个分区邻接。此时将三个分区合并，使用F1的表项和F1的首址，取消F2的表项，大小为三者之和。

	  4. 回收区既不与F1邻接，又不与F2邻接。这时应为回收区单独建立一个新表项，填写回收区的首址和大小，并根据其首地址插入到空闲链中的适当位置。

#### 练习内容

结合 清华大学出版社 严蔚敏 《数据结构》，第196~198页，第8.2节，了解First Fit算法，并重写以下函数：`default_init`，`default_init_memmap`，`default_alloc_pages`，`default_free_pages`。

#### 练习细节

```C
//	File:	default_pmm.c
//	Line:	18-95

/*
 * Details of FFMA
 * (1) Preparation:
 *  In order to implement the First-Fit Memory Allocation (FFMA), we should
 * manage the free memory blocks using a list. The struct `free_area_t` is used
 * for the management of free memory blocks.
 *  First, you should get familiar with the struct `list` in list.h. Struct
 * `list` is a simple doubly linked list implementation. You should know how to
 * USE `list_init`, `list_add`(`list_add_after`), `list_add_before`, `list_del`,
 * `list_next`, `list_prev`.
 *  There's a tricky method that is to transform a general `list` struct to a
 * special struct (such as struct `page`), using the following MACROs: `le2page`
 * (in memlayout.h), (and in future labs: `le2vma` (in vmm.h), `le2proc` (in
 * proc.h), etc).
 * (2) `default_init`:
 *  You can reuse the demo `default_init` function to initialize the `free_list`
 * and set `nr_free` to 0. `free_list` is used to record the free memory blocks.
 * `nr_free` is the total number of the free memory blocks.
 * (3) `default_init_memmap`:
 *  CALL GRAPH: `kern_init` --> `pmm_init` --> `page_init` --> `init_memmap` -->
 * `pmm_manager` --> `init_memmap`.
 *  This function is used to initialize a free block (with parameter `addr_base`,
 * `page_number`). In order to initialize a free block, firstly, you should
 * initialize each page (defined in memlayout.h) in this free block. This
 * procedure includes:
 *  - Setting the bit `PG_property` of `p->flags`, which means this page is
 * valid. P.S. In function `pmm_init` (in pmm.c), the bit `PG_reserved` of
 * `p->flags` is already set.
 *  - If this page is free and is not the first page of a free block,
 * `p->property` should be set to 0.
 *  - If this page is free and is the first page of a free block, `p->property`
 * should be set to be the total number of pages in the block.
 *  - `p->ref` should be 0, because now `p` is free and has no reference.
 *  After that, We can use `p->page_link` to link this page into `free_list`.
 * (e.g.: `list_add_before(&free_list, &(p->page_link));` )
 *  Finally, we should update the sum of the free memory blocks: `nr_free += n`.
 * (4) `default_alloc_pages`:
 *  Search for the first free block (block size >= n) in the free list and reszie
 * the block found, returning the address of this block as the address required by
 * `malloc`.
 *  (4.1)
 *      So you should search the free list like this:
 *          list_entry_t le = &free_list;
 *          while((le=list_next(le)) != &free_list) {
 *          ...
 *      (4.1.1)
 *          In the while loop, get the struct `page` and check if `p->property`
 *      (recording the num of free pages in this block) >= n.
 *              struct Page *p = le2page(le, page_link);
 *              if(p->property >= n){ ...
 *      (4.1.2)
 *          If we find this `p`, it means we've found a free block with its size
 *      >= n, whose first `n` pages can be malloced. Some flag bits of this page
 *      should be set as the following: `PG_reserved = 1`, `PG_property = 0`.
 *      Then, unlink the pages from `free_list`.
 *          (4.1.2.1)
 *              If `p->property > n`, we should re-calculate number of the rest
 *          pages of this free block. (e.g.: `le2page(le,page_link))->property
 *          = p->property - n;`)
 *          (4.1.3)
 *              Re-caluclate `nr_free` (number of the the rest of all free block).
 *          (4.1.4)
 *              return `p`.
 *      (4.2)
 *          If we can not find a free block with its size >=n, then return NULL.
 * (5) `default_free_pages`:
 *  re-link the pages into the free list, and may merge small free blocks into
 * the big ones.
 *  (5.1)
 *      According to the base address of the withdrawed blocks, search the free
 *  list for its correct position (with address from low to high), and insert
 *  the pages. (May use `list_next`, `le2page`, `list_add_before`)
 *  (5.2)
 *      Reset the fields of the pages, such as `p->ref` and `p->flags` (PageProperty)
 *  (5.3)
 *      Try to merge blocks at lower or higher addresses. Notice: This should
 *  change some pages' `p->property` correctly.
 */
```

其大意为：

1. 准备

   熟悉`list.h`中的结构体`list`及其接口，并了解`le2page`等**宏**的作用；

2. `default_init`

   你可以重复使用`default_init`函数初始化`free_list`和`nr_free`。`free_list`用来记录空闲的内存块。`nr_free`是空闲内存块的总数。

3. `default_init_memmap`

   调用路径： `kern_init` --> `pmm_init` --> `page_init` --> `init_memmap` --> `pmm_manager` --> `init_memmap`.

   该函数被用来初始化一个空闲内存块。

4. `default_alloc_pages`
   
   在空闲块的链表内搜索第一个空闲的内存块，并重新设置该块的尺寸。

5. `default_free_pages`

   将内存页重新连接到空闲块的链表中，有可能会将几个小的空闲内存块合并为一个大的内存块。


#### 代码解析

1. `default_init`

   该函数代码为

   ```C
   //	File:	default_pmm.c
   //	Line:	101-105

   static void
   default_init(void) {
       list_init(&free_list);
       nr_free = 0;
   }
   ```

   注意，在先前曾定义了`free_area`与两个相关的宏`free_list`，`nr_free`：

   ```C
   //	File:	default_pmm.c
   //	Line:	96-99

   free_area_t free_area;

   #define free_list (free_area.free_list)
   #define nr_free (free_area.nr_free)
   ```

   其中，`free_area_t`的定义为

   ```C
   //	File:	memlayout.h
   //	Line:	155-158

   /* free_area_t - maintains a doubly linked list to record free (unused) pages */
   typedef struct {
       list_entry_t free_list;         // the list header
       unsigned int nr_free;           // # of free pages in this free list
   } free_area_t;
   ```

   显然，在`default_pmm.c`中，宏`free_list`和`nr_free`即为变量`free_area`的两个成员，这样写调用更为简便。
   
   综上，函数`default_init`的作用为，为`free_area`初始化，创建一个双向链表用来存储空闲的内存块。

2. `default_init_memmap`

   ```C
   //	File:	default_pmm.c
   //	Line:	107-120

   static void
   default_init_memmap(struct Page *base, size_t n) {
       assert(n > 0);
       struct Page *p = base;
       for (; p != base + n; p ++) {
           assert(PageReserved(p));
           p->flags = p->property = 0;
           set_page_ref(p, 0);
       }
       base->property = n;
       SetPageProperty(base);
       nr_free += n;
       list_add(&free_list, &(base->page_link));
   }
   ```

   据解释可知，该函数作用为：初始化一个空闲的内存块。

   在此需要提起的是，在`memlayout.h`中定义了两个宏以及对其的一系列操作：

   ```C
   //	File:	memlayout.h
   //	Line:	106-115

   /* Flags describing the status of a page frame */
   #define PG_reserved                 0       // if this bit=1: the Page is reserved for kernel, cannot be used in alloc/free_pages; otherwise, this bit=0 
   #define PG_property                 1       // if this bit=1: the Page is the head page of a free memory block(contains some continuous_addrress pages), and can be used in alloc_pages; if this bit=0: if the Page is the the head page of a free memory block, then this Page and the memory block is alloced. Or this Page isn't the head page.
   
   #define SetPageReserved(page)       set_bit(PG_reserved, &((page)->flags))
   #define ClearPageReserved(page)     clear_bit(PG_reserved, &((page)->flags))
   #define PageReserved(page)          test_bit(PG_reserved, &((page)->flags))
   #define SetPageProperty(page)       set_bit(PG_property, &((page)->flags))
   #define ClearPageProperty(page)     clear_bit(PG_property, &((page)->flags))
   #define PageProperty(page)          test_bit(PG_property, &((page)->flags))
   ```

   这两个宏是内存块所在`page`的flag，其中，`PG_reserved`是flag的第0位，当其值为`1`时表示该页是内核预留页，不能被`alloc`或`free_pages`使用；`PG_property`是flag的第一位，当其值为`1`时表示该页是一个空闲内存块的第一个页，可以被`alloc_pages`使用，当其值为`0`时，如果此页是一个空闲内存块的第一个页，那么该页以及该内存块已经被分配。

   以下几个宏(函数)均为对这两个flag的操作，不再做赘述。

   所以`default_init_memmap`函数在执行时，首先需判断要初始化的内存块页数是否为正值，然后在循环中对其进行初始化。由介绍中的调用路径可知，该函数由内核调用（`kern_init`），所以需使用`PageReserved`判断每一页是否为内核预留页，然后将该页的参数初始化为0。

   循环结束后，将首页的`property`设为该内存块的总页数，然后将其`Property`这个flag的值设为`1`。需要注意的是，前者为页的参数`property`，后者为页的flag中一个bit，二者有区别。

   以上一系列操作结束后，将该内存块添加到`free_area`中，函数结束。

3. `default_alloc_pages`

   ```C
   //	File:	default_pmm.c
   //	Line:	122-148

   static struct Page *
   default_alloc_pages(size_t n) {
       assert(n > 0);
       if (n > nr_free) {
           return NULL;
       }
       struct Page *page = NULL;
       list_entry_t *le = &free_list;
       while ((le = list_next(le)) != &free_list) {
           struct Page *p = le2page(le, page_link);
           if (p->property >= n) {
               page = p;
               break;
           }
       }
       if (page != NULL) {
           list_del(&(page->page_link));
           if (page->property > n) {
               struct Page *p = page + n;
               p->property = page->property - n;
               list_add(&free_list, &(p->page_link));
           }
           nr_free -= n;
           ClearPageProperty(page);
       }
       return page;
   }
   ```

   据解释可知，该函数作用为分配内存，即在空闲块的链表内搜索第一个空闲的内存块，并重新设置该块的尺寸。结合以上讲解很容易理解，不再赘述。

4. `default_free_pages`

   ```C
   static void
   default_free_pages(struct Page *base, size_t n) {
       assert(n > 0);
       struct Page *p = base;
       for (; p != base + n; p ++) {
           assert(!PageReserved(p) && !PageProperty(p));
           p->flags = 0;
           set_page_ref(p, 0);
       }
       base->property = n;
       SetPageProperty(base);
       list_entry_t *le = list_next(&free_list);
       while (le != &free_list) {
           p = le2page(le, page_link);
           le = list_next(le);
           if (base + base->property == p) {
               base->property += p->property;
               ClearPageProperty(p);
               list_del(&(p->page_link));
           }
           else if (p + p->property == base) {
               p->property += base->property;
               ClearPageProperty(base);
               base = p;
               list_del(&(p->page_link));
           }
       }
       nr_free += n;
       list_add(&free_list, &(base->page_link));
   }
   ```

   据解释可知，该函数作用为释放内存，即将内存页重新连接到空闲块的链表中，有可能会将几个小的空闲内存块合并为一个大的内存块。

   结合以上讲解，很容易可以看出，该代码进行的操作为：

   1. 将被回收的内存页初始化；

   2. 在空闲内存块中搜索，是否有空闲内存块与该内存块前后相邻，若相邻则将其合并。

   3. 将该内存块重新插入回链表。

#### 参考文献

* 数据结构（C语言版），严蔚敏，清华大学出版社

* 计算机操作系统（第四版），汤小丹，西安电子科技大学出版社
  
