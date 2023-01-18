@echo off
setlocal

start Main.cpp
cmd.exe /s /k "prompt $P$_$T$G$S&& chcp 65001 && "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat""
