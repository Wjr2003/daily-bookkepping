@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 每日记账 - 生成安装包
echo 正在生成 MSI 安装包...
echo.
call "D:\visual studio\VC\Auxiliary\Build\vcvars64.bat" >nul
set "PATH=%~dp0.tools\wix;%USERPROFILE%\.cargo\bin;%PATH%"
if not exist "%~dp0installer\dist" mkdir "%~dp0installer\dist"
"%~dp0.tools\wix\candle.exe" -nologo -ext WixUIExtension -out "%~dp0installer\dist\Product.wixobj" "%~dp0installer\Product.wxs"
if errorlevel 1 goto :fail
"%~dp0.tools\wix\light.exe" -nologo -ext WixUIExtension -out "%~dp0installer\dist\每日记账安装包.msi" "%~dp0installer\dist\Product.wixobj"
if errorlevel 1 goto :fail
echo.
echo 安装包已生成：
echo %~dp0installer\dist\每日记账安装包.msi
pause
exit /b 0

:fail
echo.
echo 安装包生成失败，请把当前窗口截图给 Codex。
pause
exit /b 1
