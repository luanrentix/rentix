@echo off
setlocal
title Contrx - Atualizar Supabase

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%contrx-backend"
set "LOCAL_ENV=%BACKEND_DIR%\.env"
set "SUPABASE_ENV=%BACKEND_DIR%\.env.supabase"
set "DUMP_FILE=%BACKEND_DIR%\backups\contrx-sync-local-to-supabase.sql"

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
if exist "%PG_BIN%\pg_dump.exe" (
  set "PG_DUMP=%PG_BIN%\pg_dump.exe"
  set "PSQL=%PG_BIN%\psql.exe"
) else (
  set "PG_DUMP=pg_dump"
  set "PSQL=psql"
)

echo.
echo ============================================================
echo  Contrx - Atualizar Estrutura do Supabase (Migrations)
echo ============================================================
echo.
echo Este processo vai aplicar as novas tabelas e alteracoes do Prisma (migrations) no Supabase.
echo Ele NAO altera nem apaga as movimentacoes e dados ja existentes em producao.
echo.

if not exist "%LOCAL_ENV%" (
  echo ERRO: arquivo local nao encontrado:
  echo %LOCAL_ENV%
  goto :error_exit
)

if not exist "%SUPABASE_ENV%" (
  echo Criando arquivo de configuracao do Supabase...
  echo # Contrx - conexao manual com Supabase> "%SUPABASE_ENV%"
  echo # Preencha os valores abaixo com os dados em Supabase ^> Project Settings ^> Database>> "%SUPABASE_ENV%"
  echo # DATABASE_URL: use a conexao "Transaction pooler" na porta 6543.>> "%SUPABASE_ENV%"
  echo # DIRECT_URL: use a conexao direta na porta 5432.>> "%SUPABASE_ENV%"
  echo.>> "%SUPABASE_ENV%"
  echo DATABASE_URL="postgresql://postgres.PROJECT_REF:SENHA_DO_BANCO@HOST_DO_SUPABASE:6543/postgres?sslmode=require">> "%SUPABASE_ENV%"
  echo DIRECT_URL="postgresql://postgres:SENHA_DO_BANCO@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require">> "%SUPABASE_ENV%"
  echo.
  echo Criei o arquivo:
  echo %SUPABASE_ENV%
  echo.
  echo Agora vou abrir este arquivo no Bloco de Notas.
  echo Substitua PROJECT_REF, SENHA_DO_BANCO e HOST_DO_SUPABASE pelos dados do Supabase.
  echo Depois salve o arquivo e execute este .bat novamente.
  start "" notepad "%SUPABASE_ENV%"
  goto :error_exit
)

call :read_env "%LOCAL_ENV%" "DATABASE_URL" "LOCAL_DATABASE_URL"
if not defined LOCAL_DATABASE_URL (
  call :read_env "%LOCAL_ENV%" "DIRECT_URL" "LOCAL_DATABASE_URL"
)

call :read_env "%SUPABASE_ENV%" "DIRECT_URL" "SUPABASE_DATABASE_URL"
if not defined SUPABASE_DATABASE_URL (
  call :read_env "%SUPABASE_ENV%" "DATABASE_URL" "SUPABASE_DATABASE_URL"
)

if not defined LOCAL_DATABASE_URL (
  echo ERRO: DATABASE_URL/DIRECT_URL nao encontrado em %LOCAL_ENV%
  goto :error_exit
)

if not defined SUPABASE_DATABASE_URL (
  echo ERRO: DIRECT_URL/DATABASE_URL nao encontrado em %SUPABASE_ENV%
  goto :error_exit
)

set "SUPABASE_PLACEHOLDER="
if not "%SUPABASE_DATABASE_URL:PROJECT_REF=%"=="%SUPABASE_DATABASE_URL%" set "SUPABASE_PLACEHOLDER=1"
if not "%SUPABASE_DATABASE_URL:SENHA_DO_BANCO=%"=="%SUPABASE_DATABASE_URL%" set "SUPABASE_PLACEHOLDER=1"
if not "%SUPABASE_DATABASE_URL:HOST_DO_SUPABASE=%"=="%SUPABASE_DATABASE_URL%" set "SUPABASE_PLACEHOLDER=1"

if defined SUPABASE_PLACEHOLDER (
  echo ERRO: o arquivo do Supabase ainda esta com dados de exemplo.
  echo.
  echo Abra este arquivo e preencha com a conexao real do Supabase:
  echo %SUPABASE_ENV%
  echo.
  echo Vou abrir o arquivo para voce ajustar.
  start "" notepad "%SUPABASE_ENV%"
  goto :error_exit
)

echo Banco local: configurado em %LOCAL_ENV%
echo Supabase:    configurado em %SUPABASE_ENV%
echo.
echo Para confirmar, digite ATUALIZAR e pressione Enter.
set /p "CONFIRMACAO=> "

if /I not "%CONFIRMACAO%"=="ATUALIZAR" (
  echo Operacao cancelada.
  echo.
  pause
  exit /b 0
)

echo.
echo [1/2] Criando backups das tabelas no Supabase...
pushd "%BACKEND_DIR%"
set "DATABASE_URL=%SUPABASE_DATABASE_URL%"
set "DIRECT_URL=%SUPABASE_DATABASE_URL%"
set "CONTRX_DB_SSL_REJECT_UNAUTHORIZED=false"
node scripts\backup-supabase-tables.js
if errorlevel 1 (
  popd
  echo ERRO: falha ao criar backup das tabelas no Supabase.
  goto :error_exit
)

echo.
echo [2/3] Aplicando migrations pendentes no Supabase...
node scripts\apply-pending-migrations.js
if errorlevel 1 (
  popd
  echo ERRO: falha ao aplicar migrations no Supabase.
  goto :error_exit
)

echo.
echo [3/3] Garantindo a integridade do schema e ativando RLS nas tabelas...
node scripts\ensure-database-schema.js
if errorlevel 1 (
  popd
  echo ERRO: falha ao garantir schema e ativar RLS no Supabase.
  goto :error_exit
)
popd

echo.
echo ============================================================
echo  Supabase atualizado com sucesso (backups criados e migracoes aplicadas).
echo ============================================================
echo.
pause
exit /b 0

:error_exit
echo.
echo A operacao nao foi concluida.
echo Leia a mensagem acima, corrija o problema e execute novamente.
echo.
pause
exit /b 1

:read_env
set "ENV_VALUE="
for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /c:"%~2=" "%~1"`) do set "ENV_VALUE=%%B"
if not defined ENV_VALUE exit /b 1
set "ENV_VALUE=%ENV_VALUE:"=%"
set "%~3=%ENV_VALUE%"
exit /b 0
