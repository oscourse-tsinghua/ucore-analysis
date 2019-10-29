# 附录1：如何编辑该文档

1. 在 [ucore分析文档整理设想](https://piazza.com/class/i5j09fnsl7k5x0?cid=1355) 帖子下回复自己的GitHub帐号，等待老师发出邀请，然后到自己**注册GitHub的邮箱**接受编辑权限的邀请 

2. Linux用户参考 [使用SSH连接到GitHub](https://help.github.com/cn/github/authenticating-to-github/connecting-to-github-with-ssh) 生成自己的ssh密钥，然后将公钥提交到自己的[GitHub设置](https://github.com/settings/keys)里

   不建议使用Windows系统进行编辑文档

3. 使用以下命令安装gitbook的命令行工具

   ```shell
   npm install gitbook-cli -g
   ```

     注意：需要安装`NodeJS`以及`NPM`

4. 使用以下命令把仓库克隆到本地

   ```shell
   git clone git@github.com:oscourse-tsinghua/ucore-analysis.git
   ```

   注意：从网页复制仓库链接时一定要选择 **Use SSH**，否则使用HTTPS的话每次提交都需要输入自己GitHub的帐号密码

5. 可以开始编辑文档了。需要编辑的是*markdown(.md)*文件，gitbook的配置老师已经编辑好了，不需要进行其他操作

   如果涉及增删文件，一定要**按照格式修改** *SUMMARY.md*，切记

   **注意**：不要在*docs*目录下编辑文件，这里的文件会被自动删除

6. 编写完成后，确认可以提交的话，运行 `sh update_book.sh` 即可提交，无须手动 `git push`

 大体方法就是这样，大家辛苦了

