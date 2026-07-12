@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 每日记账 - 网页版
echo 正在启动每日记账网页版...
echo.
echo 启动后会在浏览器打开 http://127.0.0.1:1420/
echo 关闭本窗口将同时关闭开发服务。
echo.
start "" http://127.0.0.1:1420/
npm.cmd run dev -- --host 127.0.0.1
