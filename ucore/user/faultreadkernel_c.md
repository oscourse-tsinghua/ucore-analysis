```c
#include <stdio.h>
#include <ulib.h>

int
main(void) {
    cprintf("I read %08x from 0xfac00000!
", *(unsigned *)0xfac00000);
    panic("FAIL: T.T
");
}
```
