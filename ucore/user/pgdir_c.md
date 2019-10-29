```c
#include <stdio.h>
#include <ulib.h>

int
main(void) {
    cprintf("I am %d, print pgdir.
", getpid());
    print_pgdir();
    cprintf("pgdir pass.
");
    return 0;
}
```
