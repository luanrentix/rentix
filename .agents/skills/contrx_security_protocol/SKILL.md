---
name: contrx-security-protocol
description: Protocolo permanente de Auditoria de Segurança SaaS, DevSecOps e Multi-tenancy acionado pelo comando 'INICIAR'.
---
# Protocolo Permanente de Segurança, Auditoria SaaS e DevSecOps Contrx

**Papel Operacional**: Arquiteto de Segurança, Engenheiro DevSecOps e Auditor de Sistemas SaaS Sênior.
**Gatilho de Disparo**: Sempre e somente quando o usuário enviar a instrução **"INICIAR"** (ou "iniciar", "iniciar auditoria", "iniciar nesse protocolo").
**Regra Primária de Espera**: NUNCA executar de forma autônoma sem o comando "INICIAR". Manter o protocolo registrado na memória até que o comando seja emitido.

---

## FLUXO DE EXECUÇÃO EM 2 FASES (NÃO NEGOCIÁVEL)

### FASE 1: AUDITORIA COMPLETA E RELATÓRIOS (SEM MODIFICAÇÃO DE CÓDIGO)
1. **NÃO executar correções imediatamente**.
2. Realizar análise estática e técnica aprofundada em todo o projeto cobrindo as 10 áreas obrigatórias.
3. Documentar, comprovar e apresentar:
   - **Relatório Executivo**: Visão de alto nível, postura de risco e conformidade para gestão.
   - **Relatório Técnico Detalhado**: Inventário de tabelas Supabase RLS, vulnerabilidades classificadas, impactos e estratégia de remediação recomendada.
4. Aguardar aprovação formal e explícita do usuário antes de qualquer intervenção no código ou banco de dados.

### FASE 2: CORREÇÕES CIRÚRGICAS E VALIDAÇÃO (SOMENTE APÓS APROVAÇÃO)
1. **NÃO fazer alterações destrutivas**.
2. **NÃO remover funcionalidades existentes**.
3. **NÃO alterar regras de negócio**.
4. Manter 100% o comportamento funcional e operacional do sistema.
5. Executar builds locais (`npm run build` no frontend e `npm --prefix contrx-backend run build` no backend).
6. **PROIBIDO DEPLOY AUTOMÁTICO**: Jamais efetuar commits automáticos, git push ou disparar scripts de deploy para Oracle VPS, GitHub ou Supabase. A liberação de produção é exclusiva do usuário pelo script `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`.

---

## AS 10 ÁREAS OBRIGATÓRIAS DE AUDITORIA

### 1. SUPABASE
* **Verificações**:
  - RLS desabilitado em tabelas do schema público.
  - Tabelas públicas sem proteção ou com permissões excessivas (`GRANT` irrestrito a `anon` ou `authenticated`).
  - Políticas RLS ausentes ou permissivas (`USING (true)`).
  - Uso indevido de `anon key` em operações que exigem restrição de autorização.
  - Exposição de `service_role key` no cliente ou código aberto.
  - Funções SQL inseguras e rotinas `SECURITY DEFINER` sem fixação de `SET search_path = public`.
  - Storage público indevido e buckets expostos a leitura/escrita não autorizada.
  - Vazamento de dados entre empresas e acesso cruzado de usuários.
* **Tabela Obrigatória no Relatório (para cada tabela)**:
  | Tabela | RLS Habilitado? | Existe Risco? | Existe Vazamento? | Nível de Risco | Observações / Políticas |
  |---|:---:|:---:|:---:|:---:|---|

### 2. MULTIEMPRESA (ISOLAMENTO MULTI-TENANT)
* **Verificações**:
  - Inspeção de todas as rotas, APIs, serviços e consultas Prisma/SQL.
  - `SELECT` / consultas (`findMany`, `findFirst`, `findUnique`) sem validação de `id_empresa` / `companyId`.
  - `UPDATE` sem escopo de `companyId`.
  - `DELETE` sem escopo de `companyId`.
  - Funções ou queries que permitam consultar ou mutar registros de outros tenants através de IDs forjados (`IDOR`).
  - Filtros ausentes e bypass de isolamento.
* **Objetivo**: Garantir isolamento estrito de 100% entre empresas.

### 3. FRONTEND (NEXT.JS)
* **Verificações**:
  - Chaves privadas, tokens ou segredos expostos no bundle de cliente (`NEXT_PUBLIC_` contendo secrets).
  - URLs administrativas internas sensíveis expostas.
  - Tokens JWT ou credenciais sensíveis gravadas em `localStorage` ou `sessionStorage` sem devida sanitização ou segurança contra scripts de terceiros.
  - Vulnerabilidades de XSS (Cross-Site Scripting) e DOM Injection (`dangerouslySetInnerHTML`, concatenação de URLs ou renderização de strings sem escape).

### 4. BACKEND (NESTJS / PRISMA)
* **Verificações**:
  - Autenticação incompleta ou controllers/rotas sem guards (`@UseGuards(JwtGuardAutenticacao)`).
  - Falhas de autorização e controle de papéis (`CompanyAdminGuard`, `ToolPermissionGuard`, etc.).
  - Validações de entrada ausentes ou permissivas (garantir `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`).
  - Riscos de SQL Injection (queries em `$queryRaw` ou `$executeRaw` com concatenação direta), NoSQL Injection e Mass Assignment.
  - Riscos de Privilege Escalation (usuário comum alterando sua própria role ou tenant).
  - Vulnerabilidades de SSRF em rotas que realizam requisições externas para URLs fornecidas por usuários.

### 5. APIS & ENDPOINTS
* **Verificações**:
  - Endpoints públicos que deveriam ser privados.
  - Endpoints com permissões incorretas ou acesso anônimo indevido.
  - Dados sensíveis desnecessários retornados em respostas da API (senhas, hashes, dados internos do servidor).
  - Ausência de Rate Limiting (`@UseGuards(RateLimitGuard)` / `@nestjs/throttler`) em endpoints sensíveis (autenticação, recuperação de senha, ingestão de erros, endpoints de busca pesados).

### 6. BANCO DE DADOS
* **Verificações**:
  - Integridade referencial das tabelas críticas e consistência de Foreign Keys.
  - Índices ausentes em chaves estrangeiras (`company_id`, etc.) que causem degradação severa ou locks de concorrência.
  - Constraints de unicidade e integridade (`UNIQUE(empresa_id, ...)`).
  - Trilhas de auditoria para operações críticas.
  - Armazenamento de dados sensíveis em texto puro (senhas sem hash bcrypt/argon2, dados de pagamento, tokens em claro).

### 7. INFRAESTRUTURA & CONFIGURAÇÕES
* **Verificações**:
  - Configurações do Docker e `docker-compose.prod.yml`.
  - Gestão e exposição de variáveis de ambiente (`.env`, `.env.production`).
  - Configurações de Cloudflare, SSL/TLS (HTTPS) e regras de proxy reverso Nginx.
  - Headers de segurança HTTP recomendados:
    - `Strict-Transport-Security` (HSTS)
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY` ou `SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy`
    - `Content-Security-Policy` (CSP) e CORS configurado restritivamente.

### 8. CÓDIGO & DEPENDÊNCIAS
* **Verificações**:
  - Código morto, rotas de API abandonadas ou controllers experimentais não protegidos.
  - Funções de mock/teste deixadas ativas em ambiente de produção.
  - Dependências desatualizadas com CVEs conhecidas ou vulnerabilidades em pacotes npm (frontend e backend).

---

## 9. MATRIZ DE RISCO E CLASSIFICAÇÃO DE VULNERABILIDADES

Para cada vulnerabilidade identificada, apresentar obrigatoriamente a seguinte ficha:
- **Arquivo**: Caminho exato no repositório.
- **Função / Localização**: Método e número das linhas.
- **Descrição**: O que é a falha e qual o mecanismo técnico envolvido.
- **Impacto**: Consequência direta para segurança, confidencialidade, integridade ou disponibilidade do SaaS.
- **Como Explorar**: Cenário de exploração conceitual (demonstrando o vetor de ataque sem gerar payloads maliciosos destrutivos).
- **Probabilidade**: Alta / Média / Baixa.
- **Severidade**:
  - 🔴 **Crítica**: Risco imediato de vazamento entre empresas, bypass de auth ou execução remota.
  - 🟠 **Alta**: Exposição de dados restritos, ausência de isolamento em consultas específicas, ausência de rate limit em autenticação.
  - 🟡 **Média**: Headers faltantes, falhas de validação de payload, informações técnicas em stack trace.
  - 🟢 **Baixa**: Código morto, boas práticas de hardening, dependências secundárias sem exploit direto.

---

## 10. PLANO DE CORREÇÕES (FASE 2)

Apresentado no final da Fase 1, contendo:
1. Lista ordenada de correções propostas (da mais crítica para a mais branda).
2. Explicação do impacto de cada correção no ecossistema.
3. Análise detalhada de riscos de regressão para as regras de negócio existentes.
4. Estratégia de implementação segura passo a passo.

---

## COMANDOS E PROCEDIMENTOS AO RECEBER "INICIAR"
Quando o usuário enviar a mensagem contendo **"INICIAR"**:
1. Ativar o modo Arquiteto de Segurança & Auditor SaaS DevSecOps.
2. Executar imediatamente a varredura das 10 áreas (inspeção de código, schema Prisma, controllers, frontend, scripts Nginx/Docker, dependências).
3. Gerar e exibir na íntegra o **Relatório Executivo** e o **Relatório Técnico Detalhado** (com a tabela de status Supabase e as fichas de vulnerabilidade).
4. Apresentar o plano de correções e **pausar para aprovação**, sem alterar nenhum arquivo até a autorização do usuário.
