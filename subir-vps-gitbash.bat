@echo off
setlocal EnableExtensions

set "VPS_USER=ubuntu"
set "VPS_HOST=163.176.163.165"
set "VPS_PATH=/opt/contrx"
set "SSH_KEY=~/oracle-final.key"

set "GIT_BASH=%ProgramFiles%\Git\git-bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\git-bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%GIT_BASH%" set "GIT_BASH=%ProgramFiles(x86)%\Git\bin\bash.exe"

if not exist "%GIT_BASH%" (
  echo Git Bash nao encontrado. Instale o Git for Windows ou ajuste o caminho GIT_BASH neste arquivo.
  pause
  exit /b 1
)

set "REMOTE_COMMAND=cd %VPS_PATH% && git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build && docker compose -f docker-compose.prod.yml ps"

start "Contrx VPS Oracle" "%GIT_BASH%" -lc "echo '=== Contrx VPS Oracle ==='; echo 'Servidor: %VPS_USER%@%VPS_HOST%'; echo 'Pasta: %VPS_PATH%'; echo; ssh -i %SSH_KEY% %VPS_USER%@%VPS_HOST% '%REMOTE_COMMAND%'; STATUS=$?; echo; echo 'Comando finalizado com status:' $STATUS; echo 'Pressione Enter para fechar...'; read -r; exit $STATUS"

endlocal
