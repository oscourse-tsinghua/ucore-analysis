```c
#include <stdio.h>

int
main(void) {
    printf("# handler
");
    printf(".text
");
    printf(".globl __alltraps
");

    int i;
    for (i = 0; i < 256; i ++) {
        printf(".globl vector%d
", i);
        printf("vector%d:
", i);
        if ((i < 8 || i > 14) && i != 17) {
            printf("  pushl $0
");
        }
        printf("  pushl $%d
", i);
        printf("  jmp __alltraps
");
    }
    printf("
");
    printf("# vector table
");
    printf(".data
");
    printf(".globl __vectors
");
    printf("__vectors:
");
    for (i = 0; i < 256; i ++) {
        printf("  .long vector%d
", i);
    }
    return 0;
}
```
