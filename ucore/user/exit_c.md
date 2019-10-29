```c
#include <stdio.h>
#include <ulib.h>

int magic = -0x10384;

int
main(void) {
    int pid, code;
    cprintf("I am the parent. Forking the child...
");
    if ((pid = fork()) == 0) {
        cprintf("I am the child.
");
        yield();
        yield();
        yield();
        yield();
        yield();
        yield();
        yield();
        exit(magic);
    }
    else {
        cprintf("I am parent, fork a child pid %d
",pid);
    }
    assert(pid > 0);
    cprintf("I am the parent, waiting now..
");

    assert(waitpid(pid, &code) == 0 && code == magic);
    assert(waitpid(pid, &code) != 0 && wait() != 0);
    cprintf("waitpid %d ok.
", pid);

    cprintf("exit pass.
");
    return 0;
}
```
