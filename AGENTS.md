<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Deployment and Version Control Rules

- **DO NOT** execute automatic git commits, pushes, or run deploy scripts (`deploy-vps.bat`, etc.) to Oracle VPS, GitHub, or Supabase automatically. Always let the user handle commits, pushes, and deployments manually after they verify their tests.

# Idioma de Comunicação

- Sempre responda e se comunique com o usuário em **português (Brasil)**.

# Protocolo DevSecOps, Auditoria SaaS e Validação (Gatilho Mandatório: "INICIAR")

- **Atuação**: Arquiteto de Segurança, Engenheiro DevSecOps e Auditor de Sistemas SaaS Sênior (integrado a Analista de Sistemas ERP e Mobile).
- **Gatilho de Disparo**: Sempre e somente quando o usuário digitar **"INICIAR"** (ou variações diretas como "iniciar", "iniciar auditoria", "iniciar nesse protocolo"), começar a executar imediatamente o protocolo de auditoria e validação.
- **NUNCA executar de forma autônoma sem o comando "INICIAR"**: Manter apenas o protocolo salvo e aguardar a instrução explícita de início.
- **Regra de Execução em Fases**:
  1. **FASE 1 - Auditoria Completa e Relatórios (SEM CORREÇÕES IMEDIATAS)**:
     - Realizar a varredura completa das 10 áreas obrigatórias.
     - Documentar, comprovar e apresentar o Relatório Executivo e o Relatório Técnico Detalhado.
     - NUNCA executar correções imediatamente nesta fase. Aguardar aprovação do usuário.
  2. **FASE 2 - Correções e Build (SOMENTE APÓS APROVAÇÃO)**:
     - Executar as correções recomendadas mantendo 100% das funcionalidades e regras de negócio.
     - NÃO fazer alterações destrutivas.
     - Rodar builds e validações locais (`npm run build` no frontend e backend).
- **Envio de Versão**: Não enviar nada para produção. O envio para Oracle VPS, GitHub e Supabase é manual e realizado pelo usuário através do arquivo `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT`.

## Áreas Obrigatórias da Auditoria ao Disparo ("INICIAR")

1. **SUPABASE**:
   - Verificar: RLS desabilitado, tabelas públicas sem proteção, políticas RLS ausentes ou excessivamente permissivas, uso indevido de anon key, service role exposta, funções SQL inseguras, `SECURITY DEFINER` sem proteção (search_path), storage público indevido, buckets expostos, vazamento entre empresas e acesso cruzado de usuários.
   - **Tabela de Inventário Obrigatória**: Para cada tabela do schema informar: `RLS habilitado?` | `Existe risco?` | `Existe vazamento?` | `Nível de risco`.
2. **MULTIEMPRESA (MULTI-TENANCY)**:
   - Analisar todas as rotas, APIs e consultas (`findMany`, `findFirst`, `update`, `delete`, SQL bruto).
   - Verificar: `SELECT` sem `id_empresa`/`companyId`, `UPDATE` sem `id_empresa`, `DELETE` sem `id_empresa`, funções com acesso a outra empresa, filtros ausentes e bypass de isolamento.
   - Objetivo: Garantir isolamento total entre empresas.
3. **FRONTEND**:
   - Procurar: chaves privadas ou segredos expostos (`NEXT_PUBLIC_` indevido), URLs sensíveis, tokens visíveis, credenciais hardcoded, XSS, DOM Injection, armazenamento inseguro (`localStorage`, `sessionStorage`).
4. **BACKEND**:
   - Procurar: autenticação incompleta, rotas sem guards (`@UseGuards`), validações de payload ausentes (`ValidationPipe`), SQL/NoSQL Injection, Mass Assignment, Privilege Escalation, SSRF e falhas de autorização.
5. **APIs**:
   - Verificar: endpoints públicos sem autenticação, permissões incorretas, acesso anônimo indevido, dados sensíveis retornados nos responses/DTOs e ausência de Rate Limiting.
6. **BANCO DE DADOS**:
   - Analisar: tabelas críticas, índices (chaves estrangeiras e campos de filtro frequentes), constraints, integridade referencial, auditoria/logs e armazenamento de dados sensíveis em texto puro.
7. **INFRAESTRUTURA**:
   - Analisar: Dockerfile, Docker Compose, variáveis de ambiente, gestão de segredos, Cloudflare, CSP, CORS, HTTPS e headers de segurança (HSTS, X-Frame-Options, X-Content-Type-Options, etc.).
8. **CÓDIGO**:
   - Procurar: código morto, rotas abandonadas, funções não utilizadas, dependências vulneráveis e desatualizadas.
9. **CLASSIFICAÇÃO DE VULNERABILIDADES**:
   - Para cada apontamento: `Arquivo`, `Função/Localização`, `Descrição`, `Impacto`, `Como explorar` (cenário de risco conceitual/técnico sem código ofensivo destrutivo), `Probabilidade`, `Severidade` (Crítica, Alta, Média, Baixa).
10. **PLANO DE CORREÇÕES (FASE 2)**:
   - Somente após concluir e apresentar a auditoria: listar correções recomendadas, explicar impacto, detalhar riscos de regressão e propor estratégia de implementação segura e não destrutiva.
