# Checklist para Formatação da Máquina - Projeto Contrx

Este guia contém tudo o que você precisa salvar antes de formatar a máquina e o que precisa reinstalar para rodar o projeto novamente sem perdas de dados ou configurações.

---

## 1. Backups Importantes (FAÇA ANTES DE FORMATAR!)

> [!IMPORTANT]
> **Não formate a máquina antes de garantir estes backups, ou você poderá perder todo o histórico de dados locais do sistema.**

- [ ] **Pasta do projeto:** Fazer uma cópia completa da pasta `C:\projetos\contrx` para um HD Externo, Pendrive ou nuvem (Google Drive, OneDrive, etc.).
- [ ] **Arquivos de configuração (`.env`):** Garanta que salvou os arquivos que não vão para o Git:
  - [ ] `C:\projetos\contrx\.env.local` (Configurações do frontend)
  - [ ] `C:\projetos\contrx\contrx-backend\.env` (Credenciais do banco local, SMTP do Resend, chaves JWT)
  - [ ] `C:\projetos\contrx\contrx-backend\.env.supabase` (Acessos do Supabase de produção)
- [ ] **Backup do Banco de Dados PostgreSQL Local:**
  O projeto utiliza um banco local que roda na porta `55432` com os dados armazenados em `contrx-backend/.local-postgres/data`. Faça um dump do banco rodando o seguinte comando no terminal (com o banco ativo):
  ```bash
  pg_dump -U postgres -h 127.0.0.1 -p 55432 -d contrx -F c -b -v -f "C:\caminho_seguro_do_backup\contrx_backup.dump"
  ```

---

## 2. Programas para Reinstalar

- [ ] **Git**
  - Necessário para controle de versão e scripts.
  - [Download do Git](https://git-scm.com/)
- [ ] **Node.js (Versão LTS - 20 ou superior)**
  - Necessário para rodar o Next.js (frontend) e NestJS (backend).
  - [Download do Node.js](https://nodejs.org/)
- [ ] **PostgreSQL 18**
  - **Nota Importante:** O script automatizado `ensure-local-postgres.js` busca o executável especificamente em `C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe`. Por isso, instale a **versão 18** no caminho padrão do Windows.
- [ ] **VS Code** (ou seu editor de preferência)
  - [Download do VS Code](https://code.visualstudio.com/)

---

## 3. Como Rodar o Projeto Após a Formatação

- [ ] Mover a pasta do projeto de volta para `C:\projetos\contrx`.
- [ ] Restaurar o banco de dados PostgreSQL:
  1. Crie um banco vazio chamado `contrx` no PostgreSQL local.
  2. Restaure o arquivo de backup (.dump) feito anteriormente:
     ```bash
     pg_restore -U postgres -h 127.0.0.1 -p 55432 -d contrx -v "C:\caminho_seguro_do_backup\contrx_backup.dump"
     ```
- [ ] Colocar os arquivos `.env`, `.env.local` e `.env.supabase` de volta nas respectivas pastas.
- [ ] Instalar as dependências do Frontend (na raiz `C:\projetos\contrx`):
  ```bash
  npm install
  ```
- [ ] Instalar as dependências do Backend (na pasta `C:\projetos\contrx\contrx-backend`):
  ```bash
  npm install
  ```
- [ ] Iniciar o projeto para testar:
  ```bash
  npm run dev
  ```
