# Auditoria de performance — 11/11/2026

## Escopo e limites

Foi feita análise estática das rotas, serviços de dados e consultas locais, com foco nas telas de vendas, cadastros e financeiro. O inventário local tem 22 arquivos `page.tsx` e 19 diretórios de módulos/infraestrutura no backend. Áreas mapeadas incluem vendas, cadastros de pessoas e produtos, caixa, financeiro, contas a pagar/receber, relatórios, dashboard, imóveis, contratos, agenda, bancos, configurações, suporte e administração.

Não houve acesso a métricas de produção/staging, painel Supabase, `EXPLAIN ANALYZE`, navegador instrumentado ou infraestrutura Oracle. Portanto, este relatório não atribui tempos absolutos nem afirma ganho percentual de latência. A análise de código local não substitui medição por volume real de dados.

## Achado confirmado e correção local

### Abertura do módulo Vendas — prioridade alta

- **Local:** `app/vendas/page.tsx`, `load`; `services/vendas.service.ts`, `initializeSalesModule`.
- **Evidência anterior:** a tela aguardava `POST /vendas/inicializar` e só depois iniciava três consultas `GET` paralelas (`produtos`, `vendedores`, `clientes`). O endpoint de inicialização já devolve a lista de clientes ativos.
- **Correção:** inicialização, catálogo e vendedores agora são solicitados em paralelo na primeira abertura. A lista de clientes vem da resposta de inicialização, removendo o `GET /vendas/clientes` redundante. Se a inicialização falhar, a tela tenta consultar os clientes pelo endpoint existente. Usuários sem permissão de criação continuam usando o `GET` normal.
- **Efeito estrutural verificável:** 4 chamadas iniciais passam a 3 (uma chamada a menos, 25% menos requisições nesse fluxo); a inicialização deixa de ser uma etapa serial anterior às outras consultas. O tempo total antes/depois não foi medido.
- **Risco de regressão:** baixo; preserva as fontes, tipos e regra de permissão existentes. Build e testes locais foram executados.

## Gargalos candidatos encontrados — medir antes de corrigir

| Prioridade | Área | Evidência estática | Próximo passo seguro |
|---|---|---|---|
| Alta | Pessoas | `PessoasService.findAll` retorna todos os registros da empresa, sem paginação nem seleção explícita de campos. | Medir volume e payload; planejar paginação compatível com busca, filtros e histórico antes de alterar o contrato. |
| Alta | Catálogo de produtos | `VendasService.listProducts` carrega o catálogo completo com relações de variações/grades e depois consulta fotos; os filtros da tela operam sobre os dados carregados no cliente. | Medir tamanho do catálogo, payload e tempo de banco/rede; considerar busca paginada no servidor e carregar fotos sob demanda, preservando a busca por código de barras no PDV. |
| Média/alta | Resumo financeiro | `FinanceiroService.getResumo` carrega recebíveis e pagamentos relacionados, além de contratos, para compor o resumo. O custo cresce com o histórico do período. | Medir por período e volume com plano de execução; otimizar mantendo os mesmos cálculos financeiros e comparar totais antes/depois em dados de teste. |
| Média | Relatórios de vendas | O modo completo busca detalhes das vendas em lotes de até 10; para períodos extensos há múltiplas rodadas de requisições. | Instrumentar número de ordens, chamadas e tempo por lote; avaliar agregação/paginação no backend sem alterar o resultado. |

Os candidatos acima não foram alterados porque falta evidência de volume/latência e alguns envolvem contratos de API ou cálculos financeiros.

## Inventário técnico resumido

- **Frontend:** App Router do Next.js 16, React 19; páginas interativas usam componentes cliente. A camada `services/api.ts` já mantém cache GET em memória de 25 segundos e compartilha requisições simultâneas idênticas.
- **Backend:** NestJS e Prisma. Listagens de pedidos já limitam a 100 registros e usam paginação por número; histórico de preços também usa cursor.
- **Banco:** schema Prisma e migrations versionadas inspecionados estaticamente. Há índices multiempresa em entidades de vendas, como produto, cliente, estoque e eventos. Não foram criadas migrations nem índices nesta intervenção.
- **Ambiente externo:** Supabase e Oracle não foram acessados; não houve mudança remota, deploy, push, execução de BAT ou alteração de dados.

## Validação local

- ESLint direcionado aos arquivos alterados: aprovado.
- ESLint frontend completo (`npm run lint` na raiz): sem erros; 237 avisos no projeto, incluindo imports/variáveis não usados e dependências de efeitos React em diferentes módulos.
- ESLint backend completo (`npm run lint` em `contrx-backend`): aprovado.
- `git diff --check`: aprovado (apenas avisos de conversão LF/CRLF do Git nos arquivos já modificados localmente).
- Build backend (`npm run build` em `contrx-backend`): aprovado.
- Testes backend (`npm test -- --runInBand`): 38 suítes e 326 testes aprovados.
- Build frontend (`npm run build` na raiz): aprovado; compilação, verificação de tipos e geração das páginas concluídas.

## Comparativo de desempenho

| Operação | Antes | Depois | Melhoria comprovada |
|---|---|---|---|
| Abrir Vendas — chamadas iniciais | 4 chamadas, com inicialização em série antes de 3 consultas | 3 chamadas em paralelo na primeira carga | 1 chamada a menos; tempo de resposta ainda não medido |
| Abrir pessoas | Não medido | Não medido | Depende de instrumentação com volume real |
| Abrir produtos | Não medido | Não medido | Depende de instrumentação com catálogo real |
| Filtrar vendas/relatórios | Não medido | Não medido | Depende de instrumentação e período selecionado |
| Resumo/caixa | Não medido | Não medido | Depende de instrumentação e comparação de cálculos |

## Pendências para concluir auditoria de performance em produção

1. Reproduzir fluxos em staging com navegador e registrar Web Vitals, duração de requisições, payload e renderização.
2. Coletar métricas e planos de consultas no banco para empresas com volumes representativos.
3. Definir limites-alvo por tela e comparar antes/depois das próximas otimizações.
4. Revisar infraestrutura Oracle e métricas Supabase com acesso autorizado; nenhuma inspeção remota foi feita nesta etapa.
