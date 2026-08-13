---
name: contrx-security-protocol
description: Protocolo padrão de auditoria e aplicação de correções de segurança DevSecOps no projeto Contrx.
---
# Protocolo Permanente de Segurança DevSecOps Contrx

**Versão do Protocolo**: `v1.0.0` (Contrx SaaS)

Sempre que o usuário solicitar "auditoria de segurança", "aplicar correções de segurança", "verificar vulnerabilidades", "rodar protocolo de segurança" ou similar, execute **AUTOMATICAMENTE** os seguintes passos de verificação e aplicação:

---

## Eixos do Protocolo de Segurança

### 1. **Supabase & Banco de Dados (Row Level Security & Permissions)**
- **Verificação**:
  - Inspecionar novas tabelas criadas no `schema.prisma` e na pasta de migrations (`contrx-backend/prisma/migrations`).
  - Garantir que toda nova tabela criada possua uma migration associada aplicando `ENABLE ROW LEVEL SECURITY` e `REVOKE ALL ON TABLE public.<tabela> FROM anon, authenticated`.
- **Ação Automática**:
  - Se houver novas tabelas sem hardening, gerar a migration SQL complementar na pasta `contrx-backend/prisma/migrations/<timestamp>_harden_tables_supabase/migration.sql`.

### 2. **Isolamento Multiempresa (Multi-tenancy)**
- **Verificação**:
  - Inspecionar controllers e services no backend (`contrx-backend/src`) garantindo que **TODAS** as consultas (`findMany`, `findFirst`, `update`, `delete`, `count`, etc.) possuam a cláusula `where: { companyId }` associada ao usuário autenticado `user.companyId`.
  - Garantir que IDs recebidos via parâmetros (`@Param('id')`) sejam filtrados em conjunto com `companyId`.

### 3. **Rate Limiting & Proteção contra DoS / Brute-Force**
- **Verificação**:
  - Garantir que todos os endpoints de autenticação (`/autenticacao/login`, `/autenticacao/recuperar-senha`, `/autenticacao/criar-conta`) e rotas públicas/anônimas de ingestão (como `POST /admin/errors`) possuam o decorator `@UseGuards(RateLimitGuard)`.
- **Ação Automática**:
  - Aplicar o `RateLimitGuard` e prover no módulo correspondente se algum novo endpoint for identificado sem proteção.

### 4. **Alinhamento de Limites de Payload HTTP & Headers de Segurança**
- **Verificação**:
  - Verificar alinhamento entre o Express (`main.ts`: `json({ limit })`) e o Nginx (`nginx/contrx.conf`: `client_max_body_size`).
  - Verificar presença dos headers de segurança: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer` e `Permissions-Policy`.

### 5. **Frontend (Sanitização e Exposição de Segredos)**
- **Verificação**:
  - Verificar se `.env.local` ou código no frontend contêm chaves de serviço (`SERVICE_ROLE_KEY` ou `JWT_SECRET`).
  - Garantir que apenas `NEXT_PUBLIC_...` contenham variáveis públicas (como URL da API).
  - Verificar XSS e renderização de dados sensíveis.

### 6. **Validação Automática Local**
- Executar os testes de verificação e compilação:
  - `npm run lint` na raiz
  - `npm --prefix contrx-backend run build` no backend

---

## Diretrizes Rigorosas

- **NÃO alterar regras de negócio ou comportamento funcional do ERP**.
- **NÃO realizar commits, pushes ou deploys automáticos em produção (Oracle VPS/GitHub/Supabase)**.
- **Ao final da verificação/aplicação**, gerar um relatório consolidado resumindo:
  - Vulnerabilidades / Pontos auditados
  - Correções aplicadas (com links para os arquivos alterados)
  - Status dos builds de validação local.
