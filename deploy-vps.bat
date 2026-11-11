@echo off
setlocal
echo Este atalho usa o fluxo validado e exige confirmacao manual antes do envio.
call "%~dp0ATUALIZA-VERSAO-VALIDADA.BAT"
exit /b %ERRORLEVEL%
