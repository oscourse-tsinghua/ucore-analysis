# gitbook文档维护

gitbook.io上的文档会在markdown文档修改后自动更新，但github.io上的文档显示并不会自动更新，需要手动维护。具体维护方法如下。

## 参考链接

github.io上的gitbook文档模板来来源于刘丰源同学。

 * https://xy-plus.github.io/webdoc/

## 文档维护方法
 1. 下载和配置gitbook工具的本地浏览功能。方法详见[本地浏览](https://xy-plus.github.io/webdoc/2.%20%E6%9C%AC%E5%9C%B0%E6%B5%8F%E8%A7%88.html#%E6%9C%AC%E5%9C%B0%E6%B5%8F%E8%A7%88)。 
 2. 执行本仓库根目录中的“update_book.sh”命令，以生成github.io显示所需要的docs目录中的文件，然后同步回仓库中。
 3. 这时github.io上的显示就应该更新了。

