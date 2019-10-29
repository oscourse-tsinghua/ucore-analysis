```c
#include <ulib.h>
#include <stdio.h>

const int max_child = 32;

int
main(void) {
    int n, pid;
    for (n = 0; n < max_child; n ++) {
        if ((pid = fork()) == 0) {
            cprintf("I am child %d
", n);
            exit(0);
        }
        assert(pid > 0);
    }

    if (n > max_child) {
        panic("fork claimed to work %d times!
", n);
    }

    for (; n > 0; n --) {
        if (wait() != 0) {
            panic("wait stopped early
");
        }
    }

    if (wait() == 0) {
        panic("wait got too many
");
    }

    cprintf("forktest pass.
");
    return 0;
}
```
