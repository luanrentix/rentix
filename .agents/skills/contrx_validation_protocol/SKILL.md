---
name: contrx-validation-protocol
description: Protocolo padrão de validação local e pré-deploy para o projeto Contrx ao comando 'iniciar'.
---
# Protocolo de Validação Pré-Deploy Contrx

Quando o usuário disser "iniciar", "iniciar verificações", "rodar protocolo" ou similar, execute AUTOMATICAMENTE os seguintes passos em segundo plano ou sequencialmente:

1. **Validação do Frontend (Lint e Build)**:
   - Rodar `npm run lint` na raiz.
   - Rodar `npm run build` na raiz.

2. **Validação do Backend (Lint, Testes e Build)**:
   - Rodar `npm --prefix contrx-backend run lint`.
   - Rodar `npm --prefix contrx-backend run test`.
   - Rodar `npm --prefix contrx-backend run build`.

3. **Ajustes e Verificação de Telas Mobile**:
   - Analisar a responsividade das páginas principais do frontend (`dashboard`, `imoveis`, `pessoas`, `bancos`, `admin`, etc.).
   - Verificar se tabelas, modais, cards de KPI e menus do dashboard quebram no layout móvel ou necessitam de ajustes CSS/Tailwind (como rolagem horizontal nas tabelas, flex direction no mobile, etc.).
   - Propor ou aplicar correções necessárias para garantir excelente experiência de uso em smartphones e tablets.

4. **Verificação de Arquivos Inúteis / Limpeza**:
   - Checar por arquivos temporários ou backups compactados (.zip, .rar, etc.) soltos na raiz que possam ser apagados ou ignorados.

Ao final, consolide todos os resultados em uma tabela informativa e confirme se o projeto está pronto para deploy manual pelo usuário.
