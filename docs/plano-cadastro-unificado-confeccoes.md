# Proposta: cadastro unificado de pessoas em Confecções

Status: análise concluída; aguardando aprovação da modelagem antes de alterar código ou preparar migração. Nenhum dado foi alterado nesta análise.

## Situação encontrada

- `SalesCustomer` (`vendas_clientes`) contém identificação PF/PJ, contatos, endereço estruturado e regras de crediário.
- `SalesSeller` (`vendas_vendedores`) contém nome, CPF, telefone, e-mail e comissão. A validação atual aceita somente CPF; o campo físico `cpf` é texto e não precisa ser renomeado para comportar CNPJ.
- `SalesSupplier` (`vendas_fornecedores`) contém nome, CPF/CNPJ, contato, telefone, e-mail, endereço textual e observações.
- A unicidade de documento é independente em cada cadastro e por empresa. Não há vínculo entre os três modelos.
- `Person` (`pessoas`) pertence também aos fluxos de imóveis, contratos e financeiro. Não será reutilizado nem modificado sem uma análise e autorização específicas desse alcance.
- Vendas referenciam os IDs de cliente e vendedor; produtos referenciam fornecedor. Há nomes históricos nas vendas e movimentos de crédito associados a clientes.

Arquivos examinados: `contrx-backend/prisma/schema.prisma`, `src/vendas/vendas.service.ts`, DTOs de cliente/vendedor/fornecedor, `app/vendas/clientes-panel.tsx`, `vendedores-panel.tsx` e `services/vendas.service.ts`.

## Resultado proposto

Uma identidade PF/PJ por empresa e CPF/CNPJ normalizado, com os papéis Cliente, Vendedor e Fornecedor. A mesma pessoa poderá ter os três papéis; papéis não selecionados não serão criados automaticamente.

O cadastro de vendedor terá o mesmo padrão visual do cliente: cabeçalho, abas, campos, mensagens e rodapé. Abas propostas: Dados gerais, Endereço, Comissão e Papéis. Fotos / Anexos seguirá como EM BREVE. Credito e crediário continuam exclusivos do papel Cliente; comissão continua no papel Vendedor.

Ao informar um documento existente, mostrar a identificação encontrada e os papéis já vinculados. O operador poderá adicionar Vendedor à pessoa existente, em vez de digitar outro cadastro independente. Essa consulta considera também papéis inativos, sem reativação silenciosa.

## Modelagem proposta — estruturas novas, ainda inexistentes

1. `vendas_pessoas`: identidade canônica com empresa, CPF/CNPJ normalizado, PF/PJ, nome/razão social, apelido/fantasia, contatos e endereço estruturado. Chave única por empresa e documento; versão para concorrência. Demais campos de identificação poderão aproveitar o conjunto já suportado em clientes.
2. `vendas_pessoas_papeis`: liga a identidade aos IDs atuais de cliente, vendedor e fornecedor. Chaves e constraints impedem ligar dois cadastros do mesmo papel à mesma identidade, reutilizar um registro em identidades diferentes ou cruzar empresas. As referências devem ter integridade referencial; não usar somente um ID polimórfico sem chave estrangeira.

Os nomes acima são sugestões, não tabelas existentes. Serão detalhadas chaves, referências, índices e RLS na migração para revisão. A proposta não exige excluir tabelas antigas ou modificar os IDs atuais. Relações inversas no Prisma poderão ser adicionadas sem novas colunas nas tabelas existentes.

Sem documento: preservar os cadastros permitidos hoje e não unificar por nome, telefone ou e-mail. Cadastros especiais do sistema, como Consumidor Final e Cliente Cartão, ficam fora da unificação.

## Dados compartilhados e regras de atualização

- A identidade será a origem dos dados pessoais compartilhados. Os campos legados usados pelas APIs atuais serão mantidos compatíveis por sincronização transacional no serviço de Confecções.
- A tela deve informar que uma alteração em nome, contato ou endereço será refletida nos outros papéis vinculados antes de confirmar a gravação.
- Divergências entre registros atuais não serão sobrescritas automaticamente: apresentar valores por origem e permitir escolher o valor canônico. A escolha será auditada.
- Documentos serão normalizados e validados no servidor. Para vendedores, ampliar a validação e a interface para CPF e CNPJ, reutilizando as regras existentes do projeto.
- Alterar um documento já vinculado exige verificar conflitos e confirmar a identidade resultante. Não mover vínculos históricos silenciosamente.
- Ativar/inativar um papel não deve inativar os outros. Excluir um papel com histórico continua proibido; remover uma função não exclui a identidade ou os demais vínculos.
- Manter limite, prazo e bloqueio de crediário, créditos, comissão e dependências específicas em seus respectivos papéis.
- Preservar os nomes e valores históricos gravados em vendas e movimentos financeiros. Atualizar dados cadastrais atuais não reescreve esses snapshots.
- Registrar operações relevantes no histórico comercial existente, incluindo usuário, data, papéis e campos alterados.

## Implantação em etapas

1. Após aprovação, detalhar e preparar as duas tabelas complementares e relações, sem aplicar migração automaticamente.
2. Criar serviço específico para identidade, consulta por documento e vínculo de papéis; integração com os três fluxos existentes, sempre sob `ensureConfectionery` e `companyId` autenticado.
3. Padronizar o formulário do vendedor e incluir PF/PJ, endereço e identificação de papéis, sem exibir campos que não possam ser persistidos.
4. Incorporar a reutilização da identidade nos cadastros de cliente e fornecedor. Compatibilizar consulta, edição, inativação e exclusão para que não deixem a identidade divergente.
5. Preparar relatório de conciliação dos registros existentes por empresa/documento. Esta etapa deve ser somente leitura e informar divergências e documentos inválidos.
6. Vincular registros existentes somente após conferência dos conflitos e autorização específica. Não executar fusão destrutiva, exclusão de registros ou substituição de IDs.

## Arquivos previstos

- Alterar: schema Prisma; serviço/controller/módulo de Vendas; DTOs de criação/atualização de vendedor, cliente e fornecedor conforme os campos/vínculos aprovados; tipos e chamadas em `services/vendas.service.ts`; formulários e painéis dos três papéis; validações de exclusão afetadas pelos novos vínculos.
- Criar: migração aditiva, serviço e DTOs de identidade/papéis, componentes específicos para os dados comuns de Confecções, testes de vínculo/concorrência e consulta de conciliação somente leitura.
- Preservar os módulos de Pessoas, locação, contratos, as regras financeiras gerais e os segmentos diferentes de Confecções.

## Critérios de aceite

- Mesmo CPF ou CNPJ pode ser Cliente, Vendedor e Fornecedor na mesma empresa, com uma identidade comum e sem duplicar cada papel.
- Mesmo documento em outra empresa permanece independente; não revelar existência nem dados de outra empresa.
- PF e PJ funcionam para vendedor, com validação de documento no servidor e tratamento dos registros inativos.
- Criações concorrentes do mesmo documento não geram identidades duplicadas; versões desatualizadas são recusadas. Gravação de identidade, papel, sincronização e auditoria ocorre na mesma transação.
- Cadastros sem documento e registros especiais não são mesclados por aproximação.
- Divergências precisam de decisão explícita e auditada; histórico de vendas, contas, créditos e comissão permanece íntegro.
- Testar edição dos dados comuns pelos três papéis, inclusão/remoção de papel, exclusão protegida, falha transacional e regressão em outra empresa e outro segmento.
- Executar builds e validações locais depois da implementação. Publicação, migrações em ambientes ativos, commits e pushes permanecem manuais.

## Aprovação necessária

Autorizar a preparação dessa modelagem complementar e a implementação do cadastro de vendedores padronizado com integração dos papéis Cliente/Vendedor/Fornecedor, exclusivamente em Confecções. A execução de migração e a vinculação de registros existentes continuarão pendentes de autorização própria.

A aprovação é solicitada em cumprimento à instrução do usuário: “Qualquer mudança em tabela compartilhada deverá ser apresentada previamente para aprovação” e à regra de apresentar o plano antes de alterar código. Embora as novas tabelas sejam isoladas, a sincronização muda o comportamento compartilhado pelos três cadastros existentes.
