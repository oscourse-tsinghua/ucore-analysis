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

#### 练习要求

```C
// LAB2 EXERCISE 1: YOUR CODE
// you should rewrite functions: `default_init`, `default_init_memmap`,
// `default_alloc_pages`, `default_free_pages`.
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

#### 参考文献

* 计算机操作系统（第四版），汤小丹，西安电子科技大学出版社
  
