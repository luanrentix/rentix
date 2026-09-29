---
name: contrx-security-protocol
description: Protocolo padrão de auditoria técnica e aplicação de correções de segurança DevSecOps no projeto Contrx.
---
# Protocolo Permanente de Auditoria e Segurança DevSecOps Contrx (SaaS Multi-tenant)

**Versão do Protocolo**: `v2.0.0` (Contrx SaaS)

Quando acionado para auditoria de segurança ou aplicação do protocolo, siga rigorosamente o fluxo em duas fases:

---

## REGRAS DE EXECUÇÃO RIGOROSAS (NÃO NEGOCIÁVEIS)

1. **FASE 1 - APENAS AUDITORIA E ANÁLISE ESTÁTICA**:
   - **NÃO executar correções imediatamente**.
   - Analisar todo o projeto, documentar, comprovar e apresentar o relatório técnico detalhado e o relatório executivo.
   - Aguardar a aprovação expressa do usuário antes de realizar qualquer alteração no código ou banco de dados.

2. **REGRAS PARA CORREÇÕES (FASE 2 - APÓS APROVAÇÃO)**:
   - **NÃO fazer alterações destrutivas**.
   - **NÃO remover funcionalidades existentes**.
   - **NÃO alterar regras de negócio**.
   - Manter 100% o comportamento atual do sistema.
   - **NÃO fazer commits, pushes ou deploys automáticos em produção** (respeitar regras do projeto).

---

## EIXOS OBRIGATÓRIOS DA AUDITORIA

### 1. **SUPABASE & BANCO DE DADOS**
- **Verificações**:
  - Tabelas sem RLS habilitado ou sem políticas declarativas.
  - Revogação de acesso das roles públicas `anon` e `authenticated` (`REVOKE ALL ON TABLE ... FROM anon, authenticated`).
  - Segurança de funções SQL / `SECURITY DEFINER` sem proteção de `search_path`.
  - Exposição indevida de Storage / Buckets.
  - Riscos de vazamento entre empresas / acesso cruzado.
- **Relatório por Tabela**:
  - RLS Habilitado? (Sim/Não) | Existe Risco? (Sim/Não) | Existe Vazamento? (Sim/Não) | Nível de Risco (Crítico/Alto/Médio/Baixo).

### 2. **ISOLAMENTO MULTIEMPRESA (MULTI-TENANCY)**
- **Verificações**:
  - Inspeção de todas as rotas, APIs e consultas (`findMany`, `findFirst`, `update`, `delete`, `count`, etc.).
  - Garantir a presença obrigatória da cláusula `where: { companyId }` vinculada ao `user.companyId` do token JWT autenticado.
  - Verificar se parâmetros de ID (`@Param('id')`) são isolados em conjunto com `companyId`.
  - Identificar qualquer filtro ausente ou bypass de isolamento.

### 3. **FRONTEND (NEXT.JS)**
- **Verificações**:
  - Exposição de chaves de serviço ou segredos privados (`SERVICE_ROLE_KEY`, `JWT_SECRET`).
  - URLs sensíveis, tokens visíveis em cliente ou credenciais hardcoded.
  - Vulnerabilidades XSS, DOM Injection e renderizações inseguras.
  - Armazenamento inseguro em `localStorage` ou `sessionStorage`.

### 4. **BACKEND (NESTJS)**
- **Verificações**:
  - Autenticação e proteção de rotas (`@UseGuards(JwtGuardAutenticacao)`).
  - Validação rigorosa de payloads (`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`).
  - Prevenção contra SQL Injection / NoSQL Injection / Mass Assignment / Escalada de Privilégios / SSRF.
  - Verificação de controle de autorização e papéis de usuário (`CompanyAdminGuard`, `SystemOwnerGuard`, `ToolPermissionGuard`).

### 5. **APIS & RATE LIMITING**
- **Verificações**:
  - Identificação de endpoints públicos e acesso anônimo sem proteção.
  - Proteção por Rate Limit (`@UseGuards(RateLimitGuard)`) em login, recuperação de senha e endpoints de ingestão (ex: `POST /admin/errors`).
  - Retorno indevido de dados sensíveis ou payloads excessivos.

### 6. **INFRAESTRUTURA & CONFIGURAÇÕES**
- **Verificações**:
  - Imagens Docker e Docker Compose (`Dockerfile`, `docker-compose.prod.yml`).
  - Variáveis de ambiente e gestão de segredos (`.env`, `.env.local`).
  - Configuração do proxy Nginx e cabeçalhos de segurança: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, CSP e CORS.
  - Alinhamento de limites de body (`client_max_body_size` vs Express json limit).

### 7. **CÓDIGO & DEPENDÊNCIAS**
- **Verificações**:
  - Identificação de código morto, rotas abandonadas e funções não utilizadas.
  - Análise de bibliotecas vulneráveis ou dependências desatualizadas no `package.json`.

---

## CLASSIFICAÇÃO DE VULNERABILIDADES (MATRIZ DE RISCO)

Para cada vulnerabilidade identificada na auditoria, informar obrigatoriamente:
- **Arquivo**: Caminho exato do arquivo.
- **Função / Localização**: Método e linhas aproximadas.
- **Descrição**: O que é o problema.
- **Impacto**: Qual a consequência técnica e de negócio.
- **Como Explorar**: Cenário/passo a passo de exploração.
- **Probabilidade**: Alta / Média / Baixa.
- **Severidade**: Crítica / Alta / Média / Baixa.

---

## ESTRUTURA DOS RELATÓRIOS DE AUDITORIA

Ao concluir a auditoria estática (Fase 1), gerar obrigatoriamente:
1. **Relatório Executivo**: Visão geral de alto nível, matriz de risco e estado de conformidade para a diretoria/gestão.
2. **Relatório Técnico Detalhado**: Listagem minuciosa de todas as vulnerabilidades agrupadas pelas 8 áreas, plano de correções recomendadas, impacto, riscos de regressão e estratégia de implementação segura.
