---
name: contrx-validation-protocol
description: Protocolo padrão de validação local e pré-deploy para o projeto Contrx ao comando 'iniciar'.
---
# Protocolo de Validação Pré-Deploy Contrx

**Versão Atual Validada Localmente**: `v1.0.15` (Anterior em Produção: `v1.0.14`)

Quando o usuário disser "iniciar", "iniciar verificações", "rodar protocolo", "auditoria de segurança" ou similar, execute AUTOMATICAMENTE os seguintes passos em segundo plano ou sequencialmente:

0. **Protocolo de Segurança DevSecOps & Supabase Hardening**:
   - Verificar RLS e permissões de tabelas no Supabase (`contrx-backend/prisma/migrations`).
   - Validar isolamento multiempresa (`companyId`) em consultas e rotas.
   - Garantir proteção de Rate Limit (`RateLimitGuard`) nos endpoints de autenticação e ingestão de erros.
   - Verificar se há segredos vazados no frontend.

1. **Validação do Frontend (Lint e Build)**:
   - Rodar `npm run lint` na raiz.
   - Rodar `npm run build` na raiz.

2. **Validação do Backend (Lint, Testes e Build)**:
   - Rodar `npm --prefix contrx-backend run lint` (se houver script).
   - Rodar `npm --prefix contrx-backend run test` (se houver script).
   - Rodar `npm --prefix contrx-backend run build` (se houver script).

3. **Ajustes de Responsividade Mobile & Padrão Visual ERP**:
   - Analisar a responsividade das páginas principais do frontend (`dashboard`, `imoveis`, `pessoas`, `bancos`, `admin`, etc.).
   - Verificar tabelas, modais, cards de KPI e menus no layout móvel (rolagem horizontal, flex-col no mobile).
   - Verificar padronização de fontes e tamanhos de texto no padrão ERP (tipografia limpa, hierarquia de títulos, tamanhos legíveis e profissionais).
   - Propor ou aplicar correções necessárias no CSS/Tailwind.

4. **Verificação de Arquivos Inúteis e Limpeza**:
   - Mapear e sinalizar/remover arquivos temporários, logs, builds de teste ou arquivos desnecessários para liberar espaço.

5. **Mapeamento e Listagem de Mudanças Realizadas (Changelog/Git Diff)**:
   - Verificar arquivos alterados, adicionados ou removidos via `git status` e `git diff`.
   - Listar detalhadamente na resposta final quais funcionalidades, componentes ou arquivos foram modificados nesta versão para transparência total antes do deploy.

6. **Versionamento e Execução do Script de Deploy/Atualização**:
   - Incrementar/verificar a versão nos arquivos de configuração/package.json.
   - Apontar o script `C:\Users\MacOS\Documents\Contrx\ATUALIZA-VERSÃO.BAT` para atualização de versão/envio, **respeitando estritamente a regra de não enviar nada automaticamente para produção** (apenas realizar os ajustes e preparar o ambiente/script para quando você autorizar a execução manual).

7. **Verificação Obrigatória do Supabase (Banco Remoto)**:
   - Inspecionar a pasta de migrations (`contrx-backend/prisma/migrations`) e verificar o status em relação ao Supabase.
   - O backend na VPS já aplica automaticamente as migrations pendentes no Supabase ao iniciar (`node scripts/apply-pending-migrations.js`).
   - Indicar no relatório se o banco do Supabase já está **Atualizado** ou se há novas migrations criadas no repositório.

8. **Não Enviar Nada Automaticamente**:
   - Garantir que nada seja enviado para produção (Oracle, GitHub, Supabase) sem autorização prévia.

Ao final, consolide todos os resultados em uma tabela informativa, inclua a **seção detalhada de mudanças realizadas** e aguarde instrução do usuário.
