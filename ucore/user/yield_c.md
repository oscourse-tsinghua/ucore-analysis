```c
#include <ulib.h>
#include <stdio.h>

int
main(void) {
    int i;
    cprintf("Hello, I am process %d.
", getpid());
    for (i = 0; i < 5; i ++) {
        yield();
        cprintf("Back in process %d, iteration %d.
", getpid(), i);
    }
    cprintf("All done in process %d.
", getpid());
    cprintf("yield pass.
");
    return 0;
}
```
