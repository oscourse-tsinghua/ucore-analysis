```c
#include <stdio.h>
#include <ulib.h>

int
main(void) {
    int pid, ret, i ,j;
    cprintf("I am the parent. Forking the child...
");
    pid = fork();
    if (pid== 0) {
        cprintf("I am the child. spinning ...
");
        while (1);
    }else if (pid<0) {
        panic("fork child error
");
    }
    cprintf("I am the parent. Running the child...
");

    yield();
    yield();
    yield();
    
    cprintf("I am the parent.  Killing the child...
");

    assert((ret = kill(pid)) == 0);
    cprintf("kill returns %d
", ret);

    assert((ret = waitpid(pid, NULL)) == 0);
    cprintf("wait returns %d
", ret);

    cprintf("spin may pass.
");
    return 0;
}
```
