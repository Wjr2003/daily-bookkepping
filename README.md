# 每日记账

一个运行在 Windows 上的个人记账应用，支持收入、支出、两级分类、分类统计，以及用户自定义分类。

这个项目目前使用 `React + TypeScript + Vite + Tauri + SQLite` 开发，既可以用网页模式开发，也可以用桌面模式运行。

## 主要功能

- 记录收入和支出
- 支持一级分类和二级分类
- 查看最近记录、今日统计、本月统计
- 查看分类汇总和图表
- 支持编辑、删除记录
- 支持系统预置分类
- 支持用户新增、修改、删除自定义分类
- 桌面版数据存入本地 SQLite 数据库

## 当前技术方案

### 前端

- React 18
- TypeScript
- Vite
- React Router
- Recharts

### 桌面端

- Tauri 2
- Rust

### 数据存储

- 桌面版：SQLite
- 网页开发模式：localStorage

## 运行环境

建议在 Windows 上使用，当前项目也是按 Windows 开发和调试的。

需要提前安装：

- Node.js
- npm
- Rust
- Visual Studio C++ Build Tools

## 启动方式

### 方式 1：直接双击脚本

项目根目录已经提供了两个启动脚本：

- `启动网页版.cmd`
- `启动桌面版.cmd`

如果你只是想快速打开项目，直接双击这两个文件即可。

### 方式 2：命令行启动

先安装依赖：

```bash
npm install
```

启动网页开发模式：

```bash
npm run dev
```

启动桌面开发模式：

```bash
npm run tauri dev
```

打包前端：

```bash
npm run build
```

## 数据存储位置

### 桌面版

桌面版会把数据存进本地 SQLite 数据库，数据库文件名是：

```text
daily-bookkeeping.sqlite
```

数据库位置由 Tauri 的应用数据目录决定，一般会在类似下面的位置：

```text
C:\Users\你的用户名\AppData\Roaming\com.codex.dailybookkeeping\
```

### 网页模式

网页模式不会写入 SQLite，而是保存在浏览器的 `localStorage` 里。

## 分类规则

项目目前有两类分类来源：

- 系统分类：应用预置，用户只能使用，不能改名和删除
- 自定义分类：用户自己创建，可以新增、改名、删除

当前已经支持：

- 自定义一级分类
- 自定义二级分类
- 区分收入分类和支出分类

## 项目结构

```text
src/                前端页面和业务逻辑
src-tauri/          Tauri 桌面端和 Rust 后端
installer/          安装包相关配置
codex.md            项目文档和方案记录
AGENTS.md           项目协作规则
启动网页版.cmd       网页版启动脚本
启动桌面版.cmd       桌面版启动脚本
```

## 目前的产品状态

当前版本已经具备一个可用的桌面记账应用基础能力，适合继续在下面这些方向迭代：

- 预算功能
- 月度报表
- 数据导出
- 安装包优化
- 界面继续美化
- 更多筛选和搜索能力

## GitHub 仓库

当前项目远程仓库：

- `https://github.com/Wjr2003/daily-bookkepping`

## 说明

这个项目是面向非技术用户逐步迭代完成的，所以文档、交互和后续开发会优先采用容易理解、容易维护的方式推进。
