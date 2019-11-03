# 使用 Travis CI 自动化更新 gitbook

**本方法是基于 [gitbook文档维护](./how_to_update_gitbook_doc.md) 进行的改进**，所以在进行任何操作之前请先确保你阅读过这篇文档，并且对 CI 带来的影响有一定了解。

## 为什么要使用 CI

传统的方法需要维护者使用 gitbook 工具进行手动更新，这样效率比较低。使用 CI 后，本地不再需要依赖，一切交给 CI。

## 配置方法

需要维护者注册开启 Travis-CI，并添加 Personal access token 以便在 CI 的虚拟环境中能有权限访问 github。

首先需要注册并开启 Travis

1. 用你的 GitHub 账号登录 Travis-CI，确认接受访问 GitHub 的权限。
2. 登录之后，Travis-CI 就会同步你 GitHub 账号的仓库。然后打开个人页面并给你想要构建的项目启用 Travis-CI。

然后需要设置一个 `Personal Access Token`

1. 在 Github 中，`Settings / Developer settings / Personal access tokens` 页面下创建一个新的 Token
2. **注意一定要勾选 `repo` 的作用权限，否则 CI 将无法正常工作**
3. 复制你的 token，在 travis-ci 的网站中该项目下选择 `More options / settings`
4. 在下方 `Environment Varaibles` 中添加一个环境变量
   1. NAME 一项输入 `GITHUB_TOKEN` 
   2. VALUE 一项输入你刚刚生成的 Token
5. 完成配置

再次提交后，即可看到自动构建开始。

## 目标与实现方法

为了尽量不修改项目结构，因此这个 `.Travis.yml` 文件的首要目标是只在项目中添加这一个文件，就可以完成需求的功能。

因此在 `.travis.yml` 中，主要做的事情就是编译后提交至原 repo 的 master 分支。

## 使用 CI 可能带来什么副作用

- 在每次提交后，文档都会自动编译更新，无法进行选择更新
  - 可以增加规则，但是这样又会增加维护者的心智负担
- 自动编译更新的文档会作为新的 Commit，但是这也造成下次提交之前需要手动 `git pull` 以更新本地进度。
  

## 其他问题

### 后续维护者可以考虑的改进方向

在改进过程中发现一些小问题。不影响使用，但仍有改进空间。

- 解决编辑者在下次提交之前需要先拉取 CI 自动生成的 Commit
  - （使用两个 Repo）
- 解决现在 node_modules 也被 git 管理的问题