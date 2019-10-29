```c
#include <stdio.h>
#include <ulib.h>

int zero;

int
main(void) {
    cprintf("value is %d.
", 1 / zero);
    panic("FAIL: T.T
");
}
```
