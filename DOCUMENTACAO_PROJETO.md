# Documentação do Projeto Contrx

## Visão Geral

O Contrx é uma aplicação web para gestão de locações, imóveis, pessoas, contratos, contas financeiras, agenda, configurações e administração do sistema.

O projeto é dividido em duas partes principais:

- **Frontend:** Next.js 16, React 19, Tailwind CSS e Recharts.
- **Backend:** NestJS, Prisma, PostgreSQL e autenticação JWT.

O sistema trabalha com autenticação, controle de sessão ativa por usuário, permissões por ferramenta, cadastro multiempresa e módulos financeiros integrados.

## Estrutura Principal

```text
contrx/
├── app/                         # Rotas e telas do frontend Next.js
├── components/                  # Componentes reutilizáveis do frontend
├── context/                     # Contextos React, incluindo autenticação
├── data/                        # Dados locais auxiliares/legados
├── lib/                         # Utilitários de domínio do frontend
├── public/                      # Imagens, logos e assets públicos
├── services/                    # Serviços HTTP e helpers do frontend
├── contrx-backend/              # API NestJS
├── package.json                 # Scripts e dependências do frontend
├── next.config.ts               # Configuração Next.js
├── render.yaml                  # Configuração de deploy
└── DOCUMENTACAO_PROJETO.md      # Este documento
```

## Frontend

### Stack

- **Next.js:** 16.2.4
- **React:** 19.2.4
- **Tailwind CSS:** 4
- **Recharts:** gráficos financeiros
- **Lucide React:** ícones
- **TypeScript:** tipagem estática

### Scripts

```bash
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run start
npm run lint
```

### Rotas Principais

```text
/
/dashboard
/imoveis
/pessoas
/contratos
/financeiro
/financeiro/relatorios
/contas-receber
/contas-pagar
/agenda
/configuracoes
/admin
```

### Arquivos de Tela

```text
app/page.tsx                         # Login e criação de conta
app/dashboard/page.tsx               # Dashboard
app/imoveis/page.tsx                 # Gestão de imóveis
app/pessoas/page.tsx                 # Gestão de pessoas
app/contratos/page.tsx               # Gestão de contratos
app/financeiro/page.tsx              # Resumo financeiro
app/financeiro/relatorios/page.tsx   # Relatórios financeiros
app/contas-receber/page.tsx          # Contas a receber
app/contas-pagar/page.tsx            # Contas a pagar
app/agenda/page.tsx                  # Agenda
app/configuracoes/page.tsx           # Configurações
app/admin/page.tsx                   # Administração do sistema
```

### Componentes Importantes

```text
components/PrivateRoute.tsx
components/auth/auth-guard.tsx
components/layout/app-shell.tsx
components/layout/app-frame.tsx
components/people/person-create-modal.tsx
```

### Serviços do Frontend

```text
services/api.ts
services/auth.ts
services/admin.service.ts
services/company-users.service.ts
services/company-storage.ts
services/contracts.service.ts
services/financial.service.ts
services/financial-summary.service.ts
services/minimized-modal.service.ts
services/people.service.ts
services/properties.service.ts
services/property-movements.service.ts
services/schedule.service.ts
services/settings.service.ts
services/settings-cache.ts
services/tool-permissions.ts
```

## Backend

### Stack

- **NestJS:** 11
- **Prisma:** 7.8
- **PostgreSQL:** banco relacional
- **JWT:** autenticação
- **bcrypt:** hash de senha
- **Jest:** testes

### Scripts

```bash
npm --prefix contrx-backend run build
npm --prefix contrx-backend run start
npm --prefix contrx-backend run start:dev
npm --prefix contrx-backend run start:prod
npm --prefix contrx-backend run test
npm --prefix contrx-backend run lint
```

### Módulos da API

```text
auth
autenticacao
admin
agenda
companies
empresas
imoveis
pessoas
contratos
contas-receber
contas-pagar
financeiro
property-movements
settings
prisma
```

### Controllers Principais

```text
contrx-backend/src/autenticacao/autenticacao.controller.ts
contrx-backend/src/admin/admin.controller.ts
contrx-backend/src/agenda/agenda.controller.ts
contrx-backend/src/imoveis/imoveis.controller.ts
contrx-backend/src/pessoas/pessoas.controller.ts
contrx-backend/src/contratos/contratos.controller.ts
contrx-backend/src/contas-receber/contas-receber.controller.ts
contrx-backend/src/contas-pagar/contas-pagar.controller.ts
contrx-backend/src/financeiro/financeiro.controller.ts
contrx-backend/src/settings/settings.controller.ts
```

### Services Principais

```text
contrx-backend/src/autenticacao/autenticacao.service.ts
contrx-backend/src/admin/admin.service.ts
contrx-backend/src/agenda/agenda.service.ts
contrx-backend/src/imoveis/imoveis.service.ts
contrx-backend/src/pessoas/pessoas.service.ts
contrx-backend/src/contratos/contratos.service.ts
contrx-backend/src/contas-receber/contas-receber.service.ts
contrx-backend/src/contas-pagar/contas-pagar.service.ts
contrx-backend/src/financeiro/financeiro.service.ts
contrx-backend/src/settings/settings.service.ts
contrx-backend/src/prisma/prisma.service.ts
```

## Autenticação e Sessão

O frontend usa `AuthContext` para armazenar e controlar:

- usuário autenticado;
- token JWT;
- login;
- criação de conta;
- logout;
- verificação periódica de sessão;
- encerramento de sessão quando outro dispositivo faz login.

Arquivos relacionados:

```text
context/AuthContext.tsx
components/PrivateRoute.tsx
services/auth.ts
services/api.ts
contrx-backend/src/autenticacao/autenticacao.service.ts
contrx-backend/src/autenticacao/strategies/estrategia-jwt.ts
```

O backend usa `activeSessionId` para manter apenas uma sessão ativa por usuário.

## Variáveis de Ambiente

### Frontend

Arquivo:

```text
.env.local
```

Variável principal:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend

Arquivo de exemplo:

```text
contrx-backend/.env.example
```

Variáveis esperadas:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
PORT=3001
```

## Banco de Dados

O banco é controlado pelo Prisma.

Arquivo principal:

```text
contrx-backend/prisma/schema.prisma
```

Migrations:

```text
contrx-backend/prisma/migrations/
```

Scripts auxiliares:

```text
contrx-backend/scripts/ensure-local-postgres.js
contrx-backend/scripts/ensure-database-schema.js
contrx-backend/scripts/apply-pending-migrations.js
contrx-backend/scripts/backup-database.js
contrx-backend/scripts/restore-json-backup.js
contrx-backend/scripts/inspect-database.js
contrx-backend/scripts/promote-system-owner.js
contrx-backend/scripts/update-admin-login.js
```

## Módulos Funcionais

### Login e Conta

Funcionalidades:

- login;
- criação de conta;
- lembrar e-mail;
- mensagens amigáveis de erro;
- logout;
- validação de sessão.

Arquivos:

```text
app/page.tsx
context/AuthContext.tsx
services/auth.ts
contrx-backend/src/autenticacao/
```

### Dashboard

Tela de visão geral do sistema.

Arquivo:

```text
app/dashboard/page.tsx
```

### Imóveis

Funcionalidades:

- cadastro de imóveis;
- edição;
- inativação;
- filtros;
- status disponível/alugado;
- histórico de movimentações;
- consulta de CEP;
- relatório visual.

Arquivos:

```text
app/imoveis/page.tsx
services/properties.service.ts
services/property-movements.service.ts
contrx-backend/src/imoveis/
contrx-backend/src/property-movements/
```

### Pessoas

Funcionalidades:

- cadastro de pessoas;
- classificação como inquilino;
- edição;
- filtros;
- modal reutilizável de criação.

Arquivos:

```text
app/pessoas/page.tsx
components/people/person-create-modal.tsx
services/people.service.ts
contrx-backend/src/pessoas/
```

### Contratos

Funcionalidades:

- cadastro de contratos;
- cancelamento;
- finalização;
- exclusão lógica;
- renovação;
- histórico;
- integração com contas a receber.

Arquivos:

```text
app/contratos/page.tsx
services/contracts.service.ts
contrx-backend/src/contratos/
```

### Financeiro

Funcionalidades:

- resumo financeiro;
- contas a receber;
- contas a pagar;
- status pago, pendente e vencido;
- pagamentos parciais;
- descontos;
- juros;
- estorno;
- atualização do resumo;
- relatórios gerenciais.

Arquivos:

```text
app/financeiro/page.tsx
app/financeiro/relatorios/page.tsx
app/contas-receber/page.tsx
app/contas-pagar/page.tsx
services/financial.service.ts
services/financial-summary.service.ts
contrx-backend/src/financeiro/
contrx-backend/src/contas-receber/
contrx-backend/src/contas-pagar/
```

### Relatórios Financeiros

Relatórios disponíveis:

- DRE gerencial;
- balancete financeiro;
- fluxo de caixa;
- inadimplência;
- ranking de maiores devedores;
- ranking de despesas por categoria;
- aging de atraso.

Recursos:

- filtros por período;
- filtros por origem;
- filtros por status;
- filtros por categoria;
- busca textual;
- KPIs;
- gráficos;
- resumo executivo;
- exportação CSV;
- impressão/PDF com layout A4.

Arquivo:

```text
app/financeiro/relatorios/page.tsx
```

### Agenda

Funcionalidades:

- criação de itens de agenda;
- edição;
- listagem por empresa.

Arquivos:

```text
app/agenda/page.tsx
services/schedule.service.ts
contrx-backend/src/agenda/
```

### Configurações

Funcionalidades:

- dados da empresa;
- dados do usuário;
- tema;
- templates de impressão;
- configurações locais/cacheadas.

Arquivos:

```text
app/configuracoes/page.tsx
services/settings.service.ts
services/settings-cache.ts
lib/printTemplates.ts
contrx-backend/src/settings/
```

### Administração

Funcionalidades:

- painel administrativo;
- gestão de empresas;
- gestão de usuários;
- permissões;
- reset de dados de teste;
- promoção de dono do sistema.

Arquivos:

```text
app/admin/page.tsx
services/admin.service.ts
services/company-users.service.ts
contrx-backend/src/admin/
```

## Permissões

O sistema possui controle de acesso por ferramenta.

Arquivo:

```text
services/tool-permissions.ts
```

Permissões relacionadas:

```text
dashboard
properties
people
contracts
financial
accountsReceivable
accountsPayable
schedule
settings
admin
```

## Layout Global

O layout principal do sistema fica em:

```text
components/layout/app-shell.tsx
components/layout/app-frame.tsx
```

Responsabilidades:

- menu lateral;
- topo do sistema;
- avatar/usuário;
- logout;
- configurações rápidas;
- modal minimizado global;
- controle de tema;
- permissões de menu.

## Modais Minimizados

Serviço:

```text
services/minimized-modal.service.ts
```

Objetivo:

- preservar o estado de cadastro em andamento;
- permitir restaurar ou fechar modais minimizados;
- sincronizar alterações via eventos no navegador.

## Assets

Arquivos principais:

```text
public/logo-contrx.png
public/logo-contrx.svg
public/logo-azul.png
public/publiclogin-illustration.png.png
public/icon.png
```

## Testes

### Frontend

Validação disponível:

```bash
npm run lint
npm run build
```

### Backend

Testes com Jest:

```bash
npm --prefix contrx-backend run test
```

Testes importantes:

```text
contrx-backend/src/financeiro/financeiro.service.spec.ts
contrx-backend/src/contas-receber/contas-receber.service.spec.ts
contrx-backend/src/contas-pagar/contas-pagar.service.spec.ts
contrx-backend/src/contratos/contratos.service.spec.ts
contrx-backend/src/imoveis/imoveis.service.spec.ts
contrx-backend/src/empresas/empresas.service.spec.ts
```

## Deploy

Arquivo:

```text
render.yaml
```

O frontend usa `NEXT_PUBLIC_API_URL` para apontar para a API pública.

O backend precisa de:

- banco PostgreSQL;
- `DATABASE_URL`;
- `DIRECT_URL`;
- `JWT_SECRET`;
- migrations aplicadas;
- build NestJS.

## Fluxo Local Recomendado

### 1. Instalar dependências

```bash
npm install
npm --prefix contrx-backend install
```

### 2. Configurar ambiente

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Backend:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
PORT=3001
```

### 3. Iniciar backend

```bash
npm run dev:backend
```

### 4. Iniciar frontend

```bash
npm run dev
```

### 5. Acessar aplicação

```text
http://localhost:3000
```

## Convenções Técnicas

- Código em TypeScript.
- Nomes técnicos em inglês.
- Interface em português do Brasil.
- Serviços frontend centralizados em `services/`.
- Regras de autenticação centralizadas em `AuthContext`.
- Chamadas HTTP centralizadas em `services/api.ts`.
- Backend modular com controller, service, dto e module.
- Prisma como camada de acesso ao banco.
- Relatórios financeiros usam cálculos no backend e apresentação no frontend.

## Cuidados Importantes

- Não editar `node_modules`.
- Não versionar `.env.local` com segredos.
- Não alterar migrations antigas sem necessidade real.
- Não remover alterações existentes sem revisar.
- Rodar `npm run build` antes de publicar frontend.
- Rodar testes backend quando mexer em regras financeiras, contratos ou autenticação.

## Arquivos Mais Sensíveis

```text
services/api.ts
context/AuthContext.tsx
components/layout/app-shell.tsx
app/financeiro/relatorios/page.tsx
contrx-backend/src/autenticacao/autenticacao.service.ts
contrx-backend/src/autenticacao/strategies/estrategia-jwt.ts
contrx-backend/src/financeiro/financeiro.service.ts
contrx-backend/prisma/schema.prisma
```

## Status Atual Observado

O projeto possui:

- frontend funcional em Next.js;
- backend modular em NestJS;
- autenticação JWT;
- sessão única por usuário;
- gestão de imóveis;
- gestão de pessoas;
- gestão de contratos;
- financeiro com contas a receber e pagar;
- relatórios financeiros profissionais;
- agenda;
- configurações;
- painel admin;
- testes backend relevantes;
- build frontend validável com `npm run build`.

## Comandos Úteis

```bash
# Frontend
npm run dev
npm run lint
npm run build

# Backend
npm --prefix contrx-backend run start:dev
npm --prefix contrx-backend run build
npm --prefix contrx-backend run test

# Teste financeiro específico
npm --prefix contrx-backend run test -- financeiro.service.spec.ts
```

## Observação Final

Este documento resume a arquitetura, módulos, scripts, arquivos principais e fluxo operacional do Contrx. Ele deve ser atualizado sempre que novos módulos, serviços, rotas, variáveis de ambiente ou regras críticas forem adicionados ao projeto.
