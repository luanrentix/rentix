# Correções da auditoria de Vendas — 09/11/2026

Implementação autorizada pelo usuário com “REALIZE TODAS AS CORREÇÕES”. Este registro complementa a auditoria original, que permanece como diagnóstico histórico.

## Correções implementadas

| Item | Tratamento |
|---|---|
| F01 | Subtotal calculado em centavos, HALF_UP por linha, equivalente ao servidor. Rateio das devoluções usa valores históricos e aritmética racional, com arredondamento ao final. |
| F02 | Quantidades com três casas e soma em milésimos; entradas rejeitam precisão excedente. |
| F03 | Produtos com preços distintos permanecem em linhas distintas. Alterar preço ou variação consolida somente linhas com a mesma identidade e preço. |
| F04 | Confirmação de descarte, proteção de saída e rascunho por empresa/usuário na sessão, com validade de 24 horas. Dados de cartão não entram no rascunho. |
| F05 | Troca não admite “Em andamento”; o botão é desabilitado e a rotina de gravação também bloqueia esse caminho. |
| F06 | Pagamento com cartão preserva o cliente identificado. Cadastro genérico continua disponível para atendimento sem identificação. |
| F07 | Devoluções aceitam milésimos, de acordo com o DTO e o saldo disponível. |
| F08 | Leitura de barras da variação e inclusão no carrinho aplicam os filtros de produto ativo e disponível para venda. |
| F09 | Nova venda limpa a conta anterior; a seleção automática considera novamente as contas disponíveis. |
| F10 | Campos do atendimento ficam desabilitados durante gravação/exclusão. Gravações possuem limite de espera de 30 segundos e consulta posterior da tentativa. |
| F11 | Identificação da tentativa persiste no rascunho, inclusive em devolução sem carrinho. Atualizações repetidas reconhecem o evento já processado; payload diferente é rejeitado. Consulta por requisição respeita empresa e ramo. |
| F12 | Backend exige administradora, bandeira, NSU e valores compatíveis para concluir pagamentos com cartão. |
| F13 | PDV carrega a primeira página. Histórico, origem de troca e estornos possuem consulta e carregamento de páginas adicionais. Relatórios legados carregam histórico completo somente quando abertos. |
| F14 | Reimpressão consulta os detalhes atuais. Valor entregue fica no evento da venda, é validado no servidor e recuperado para o troco. Documentos antigos sem esse dado continuam disponíveis. |
| F15 | Falhas parciais preservam os recursos carregados. Saldo indisponível recebe mensagem própria; lista de clientes com falha não afirma que não existem cadastros. Erros do PDV não são repetidos nas telas de cadastro. |
| F16 | Navegação interna utiliza a URL para manter a seção coerente com voltar/avançar e atualização da página. |
| F17 | Catálogo e geração de relatórios exigem Varejo. Títulos e pagamentos comerciais são filtrados por vínculo com venda/devolução. Relatórios bancários informam expressamente que usam o livro bancário da empresa. |
| F18 | Roteiro integrado atualizado para variações legadas, cliente completo, confirmação de reembolso e estorno com devolução financeira pendente. Inclui repetição de atualização, consulta de tentativa e recuperação do valor entregue. |
| F19 | Gerenciamento comum de foco, Tab, Escape e devolução do foco nos diálogos do módulo; respeita o modal superior e botões desabilitados. Homologação visual permanece pendente. |
| F20 | Novo documento informa que o número será definido ao gravar. Documento recuperado usa sua data registrada. Datas principais de venda, troca, estorno e comprovante usam America/Manaus. |
| F21 | GET de clientes é somente leitura. Inicialização dos clientes de sistema foi movida para POST explícito, com permissão de criação. |

Percentuais de desconto/acréscimo acompanham o subtotal enquanto os valores gerais permanecem fixos. Entradas editáveis de quantidade/preço preservam a digitação até a confirmação por saída do campo ou Enter.

## Validação

- Backend: **34 suítes e 295 testes aprovados**.
- Build do backend aprovado, sem alteração do schema ou migration.
- Build de produção do frontend aprovado; TypeScript verificado adicionalmente após os últimos ajustes.
- ESLint dos arquivos de implementação alterados: sem erros. O painel de clientes possui um aviso anterior de função `currency` não utilizada.
- Oito roteiros do frontend aprovados: números, pagamentos, recibo, relatório de vendas, relatório de caixa, preços, navegação por ramo e exportação gerencial.
- Fluxo integrado em PostgreSQL local aprovado, dentro de transação com rollback: estoque/reservas, conversão, misto, crédito, devolução, reembolso, estorno, caixa, cartões, idempotência e isolamento entre empresas.
- O driver PostgreSQL emite aviso de depreciação sobre consultas concorrentes dentro da transação de teste; não houve falha no roteiro.
- `/vendas` respondeu HTTP 200 localmente. Isso não substitui homologação visual autenticada.

O `tsc --noEmit` genérico do backend inclui testes antigos de autenticação/contratos com erros de tipos anteriores à intervenção. O build de produção e a suíte Jest são as validações aprovadas do backend; esses erros externos ao módulo não foram ocultados nem alterados nesta correção.

## Limites preservados

Estoque negativo continua permitido conforme a regra existente. Permanecem os bloqueios de desconto/acréscimo por produto, a confirmação manual de Pix/cartão e o processo separado de confirmação da devolução financeira após estorno. Não foram inventados custos históricos, lucro retroativo ou DRE contábil completa.

Alçadas novas de desconto, unidade fracionável por cadastro, adquirente, destinos por modalidade, frete e abertura/fechamento diário de caixa são evoluções de negócio da auditoria, não defeitos implementados sob regras presumidas.

Não foram executados commit, push, deploy ou alteração em produção. O acesso ao navegador automatizado estava indisponível; testes visuais de foco, responsividade e interação com leitor físico devem ser homologados no ambiente local.
