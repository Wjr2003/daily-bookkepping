@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 每日记账 - 桌面版
echo 正在启动每日记账桌面版...
echo.
echo 首次启动如果稍慢是正常的，请不要关闭窗口。
echo 关闭本窗口将同时关闭桌面应用开发服务。
echo.
call "D:\visual studio\VC\Auxiliary\Build\vcvars64.bat" >nul
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
npm.cmd run tauri dev
