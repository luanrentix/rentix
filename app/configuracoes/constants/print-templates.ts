import JSZip from "jszip";
import { Document as DocxDocument, Packer, Paragraph, TextRun } from "docx";
import { type PrintDocumentKey, type PrintTemplates } from "../types/settings.types";

export const legacyTemporaryContractTemplateContent = 'CONTRATO TEMPORÁRIO\n\nLOCADOR: {companyName}\nLOCATÁRIO: {personName}\nBEM/ATIVO: {propertyName}\nPERÍODO: {startDate} até {endDate}\nHORÁRIO: Entrada {entryTime} / Saída {exitTime}\n\nCLÁUSULAS E CONDIÇÕES:\n1. O presente contrato tem finalidade de locação temporária.\n2. O locatário declara estar ciente das regras de uso do bem/ativo.\n3. As informações financeiras e condições acordadas deverão constar no documento final.\n\n{contractDefaultNotes}\n\n{contractCity}, {currentDate}.\n\n__________________________________\nLOCADOR\n\n__________________________________\nLOCATÁRIO';

export const defaultTemporaryContractTemplateContent = `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO IMOBILIÁRIA TEMPORÁRIA

I - LOCADOR:
{landlordName}, pessoa jurídica de direito privado, inscrita no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, doravante denominada LOCADOR.
E-mail: {companyEmail}
Telefone: {companyPhone}

II - LOCATÁRIO:
{tenantName}, brasileiro(a), estado civil não informado, profissão não informada, inscrito(a) no CPF/CNPJ nº {tenantDocument}, Carteira de Identidade nº __________, residente e domiciliado(a) em {tenantAddress}, doravante denominado(a) LOCATÁRIO.
E-mail: {tenantEmail}

III - OBJETO DA LOCAÇÃO:
{propertyName}, localizado em {propertyAddress}.

IV - PRAZO DE VIGÊNCIA:
O prazo de locação é de {contractDays} dia(s), com entrada (check-in) em {startDate} às {entryTime} e saída (check-out) em {endDate} às {exitTime}, sem prorrogação automática.

V - ATIVIDADE OBRIGATÓRIA:
Durante o período de locação, o locatário compromete-se a utilizar o imóvel exclusivamente para fins recreativos e de lazer, respeitando todas as normas legais e regulamentações aplicáveis. O locatário deverá zelar pela conservação do imóvel e de suas instalações, garantindo sua limpeza e manutenção adequadas. Qualquer dano causado durante o período de locação será de responsabilidade do locatário, que se compromete a ressarcir integralmente o locador pelos prejuízos decorrentes.

VI - ALUGUEL PELO PERÍODO:
Igual a {amount}.

VII - PAGAMENTO DO ALUGUEL:
Pela execução do objeto deste contrato, o LOCATÁRIO pagará ao LOCADOR o valor total de {amount}, conforme forma de pagamento acordada entre as partes.
A liberação das chaves está condicionada à quitação integral de todas as parcelas.
Parágrafo Segundo: O pagamento será efetuado por meio de [PIX/DINHEIRO/TRANSFERÊNCIA], conforme dados a serem informados pelo LOCADOR.

VIII - CONDIÇÕES ESPECIAIS:
Não há.

Pelo presente instrumento, as partes acima identificadas e qualificadas têm entre si justas e acertadas o presente INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO, que se regerá pelas cláusulas e condições abaixo pactuadas.

Cláusula Primeira - Da Vistoria e Conservação
1.1. O imóvel é entregue em perfeitas condições de higiene e conservação.
1.2. O LOCATÁRIO tem o prazo de 2 (duas) horas após a entrada para conferir o local e reportar qualquer dano preexistente por escrito, com fotos ou vídeos.
1.3. Caso não haja manifestação no prazo acima, entende-se que o imóvel e seus utensílios foram recebidos em perfeito estado.
1.4. O LOCATÁRIO deverá restituir o imóvel nas mesmas condições em que o recebeu, sob pena de arcar com os custos de reparo ou reposição de itens danificados.

Cláusula Segunda - Do Objeto e Destinação
2.1. O objeto deste contrato é a locação temporária do imóvel identificado neste instrumento.
2.2. O imóvel destina-se exclusivamente para fins recreativos e de lazer, conforme detalhado no preâmbulo.
2.3. É proibido ao LOCATÁRIO sublocar, ceder, emprestar ou transferir a locação a terceiros, total ou parcialmente, sem autorização prévia e por escrito do LOCADOR.
2.4. Após o recebimento das chaves, o LOCATÁRIO assume a posse temporária e a responsabilidade total pela guarda e conservação do imóvel e seus bens.

Cláusula Terceira - Da Utilização e Finalidade
3.1. O imóvel deve ser utilizado exclusivamente para fins recreativos e de lazer.
3.2. É proibida a realização de eventos com venda de ingressos, atividades comerciais ou festas abertas ao público sem autorização prévia por escrito do LOCADOR.

Cláusula Quarta - Do Prazo e da Desocupação
4.1. A locação é firmada por curto prazo, com início em {startDate} às {entryTime} e término em {endDate} às {exitTime}.
4.2. Findo o prazo estipulado, o contrato se encerra automaticamente, devendo o LOCATÁRIO desocupar o imóvel e entregar as chaves, independente de aviso prévio.
4.3. Caso o LOCATÁRIO deseje prorrogar a estadia, deverá consultar a disponibilidade e valores com o LOCADOR com antecedência, sendo necessária a formalização de novo ajuste por escrito.
4.4. O atraso na desocupação do imóvel após o horário de término sujeitará o LOCATÁRIO à multa por hora excedente, sem prejuízo das demais penalidades.

Cláusula Quinta - Do Valor e Pacote Escolhido
5.1. O valor da locação temporária é de {amount}, referente ao período contratado.

Cláusula Sexta - Das Obrigações e Regras de Convivência
6.1. O LOCADOR deverá entregar o imóvel em bom estado de conservação e limpeza.
6.2. O LOCATÁRIO deverá utilizar o imóvel apenas para os fins contratados, responsabilizando-se por danos ocorridos durante a locação, exceto desgaste natural de uso.
6.3. O LOCATÁRIO deverá respeitar os limites de hóspedes e convidados definidos previamente pelas partes.
6.4. Animais de estimação somente serão permitidos mediante autorização do LOCADOR, respondendo o LOCATÁRIO por higiene e eventuais danos.
6.5. O LOCATÁRIO deve respeitar o sossego dos vizinhos, sendo proibidos ruídos excessivos, especialmente em horário noturno.

Cláusula Sétima - Das Comunicações e Notificações
7.1. As partes concordam que comunicações urgentes poderão ser realizadas por WhatsApp ou e-mail, utilizando os contatos fornecidos neste contrato.
7.2. Para notificações formais, as partes elegem os endereços declarados neste instrumento.

Cláusula Oitava - Da Ausência de Garantia e Condição de Acesso
8.1. Esta locação é celebrada sem as modalidades de garantia previstas na Lei 8.245/91.
8.2. O acesso ao imóvel e a entrega das chaves só ocorrerão mediante a quitação integral do valor total da locação e eventuais taxas acordadas.

Cláusula Nona - Do Inadimplemento, Cancelamento e Multas
9.1. O descumprimento de qualquer cláusula deste contrato sujeitará o infrator à multa de 20% sobre o valor total do contrato, sem prejuízo da responsabilidade por eventuais danos materiais comprovados.
9.2. O atraso no pagamento sujeitará o LOCATÁRIO à multa moratória, juros e eventual cancelamento da reserva.
9.3. Em caso de desistência por iniciativa do LOCATÁRIO após a assinatura, não haverá devolução de valor já pago, salvo acordo escrito entre as partes.

Cláusula Décima - Da Rescisão
10.1. O descumprimento de cláusula contratual autoriza a rescisão imediata do instrumento, sem prejuízo da cobrança de perdas e danos.
10.2. Caso o LOCATÁRIO encerre a locação antes do horário previsto, não haverá reembolso proporcional do valor contratado.

Cláusula Décima Primeira - Da Assinatura Eletrônica e Comunicações Digitais
11.1. As partes reconhecem como válida a assinatura deste contrato em formato eletrônico, conforme legislação vigente.
11.2. Os e-mails e números de WhatsApp informados são considerados canais oficiais de comunicação.

Cláusula Décima Segunda - Foro
12.1. As partes elegem o foro da comarca do local do imóvel para dirimir dúvidas ou litígios oriundos deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________
Email: ______________________________`;

export const defaultStandardContractTemplateContent = `CONTRATO DE LOCAÇÃO RESIDENCIAL

I - LOCADOR:
{landlordName}, inscrito(a) no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, telefone {companyPhone}, e-mail {companyEmail}, a seguir denominado(a) LOCADOR.

II - LOCATÁRIO:
{tenantName}, inscrito(a) no CPF/CNPJ nº {tenantDocument}, residente e domiciliado(a) em {tenantAddress}, telefone {tenantPhone}, e-mail {tenantEmail}, a seguir denominado(a) LOCATÁRIO.

CLÁUSULA PRIMEIRA - DO IMÓVEL E DO PRAZO
O LOCADOR dá em locação ao LOCATÁRIO o imóvel denominado {propertyName}, localizado em {propertyAddress}, pelo prazo de {contractMonths} mês(es), com início em {startDate} e término em {endDate}. Ao receber o imóvel, o LOCATÁRIO declara tê-lo vistoriado e aceito nas condições em que se encontra, obrigando-se a devolvê-lo livre, desocupado e em perfeito estado de conservação, com contas de água, energia e demais encargos quitados.

Parágrafo Primeiro - Antes do vencimento do prazo ajustado, o LOCADOR não poderá retomar o imóvel, salvo por infração contratual. Caso o LOCATÁRIO devolva o imóvel antes do prazo, ficará sujeito à multa contratual prevista neste instrumento.

Parágrafo Segundo - Na devolução das chaves, o LOCATÁRIO deverá apresentar comprovantes de quitação das contas de água, energia e demais despesas relacionadas ao imóvel.

CLÁUSULA SEGUNDA - DO ALUGUEL E FORMA DE PAGAMENTO
O aluguel mensal será de {amount}, com vencimento conforme acordado entre as partes. O pagamento deverá ser realizado por meio de depósito, transferência, dinheiro ou Pix, utilizando a chave {pixKey}, salvo outra forma expressamente acordada.

Parágrafo Primeiro - O atraso no pagamento autoriza a cobrança de multa, juros, correção monetária e demais despesas necessárias à cobrança, sem prejuízo da rescisão contratual.

Parágrafo Segundo - Decorridos 30 (trinta) dias do vencimento sem pagamento, o débito poderá ser encaminhado para cobrança administrativa, extrajudicial ou judicial.

CLÁUSULA TERCEIRA - DO REAJUSTE
O valor do aluguel poderá ser reajustado ao final do prazo contratual ou em eventual renovação, mediante acordo entre as partes e observando a legislação aplicável.

CLÁUSULA QUARTA - DA CONSERVAÇÃO E VISTORIA
O LOCATÁRIO declara haver visitado e examinado o imóvel locado, obrigando-se a zelar por sua conservação, limpeza, instalações, pintura, telhado, portas, janelas, vidros, fechaduras, torneiras, instalações elétricas, hidráulicas e demais acessórios, devolvendo-o ao final da locação no mesmo estado em que recebeu, salvo desgaste natural de uso.

Parágrafo Primeiro - Fica assegurado ao LOCADOR o direito de vistoriar o imóvel sempre que necessário, mediante aviso prévio ao LOCATÁRIO.

Parágrafo Segundo - Qualquer alteração, reforma ou benfeitoria no imóvel dependerá de autorização prévia e por escrito do LOCADOR.

CLÁUSULA QUINTA - DOS ENCARGOS
Além do aluguel, competem ao LOCATÁRIO as despesas ordinárias de consumo de água, energia elétrica, esgoto, saneamento, taxa de lixo, condomínio quando houver e demais encargos relacionados ao uso do imóvel durante a vigência do contrato.

Parágrafo Único - Caso o LOCADOR efetue o pagamento de qualquer despesa de responsabilidade do LOCATÁRIO, este deverá reembolsar integralmente o valor, acrescido de multa, juros e correção quando aplicáveis.

CLÁUSULA SEXTA - DA DESTINAÇÃO DO IMÓVEL
O imóvel objeto deste contrato destina-se exclusivamente para fim residencial, ficando o LOCATÁRIO proibido de alterar sua destinação, ceder, transferir, sublocar ou emprestar o imóvel, no todo ou em parte, sem autorização expressa do LOCADOR.

CLÁUSULA SÉTIMA - DAS PROIBIÇÕES E RESPONSABILIDADES
O LOCATÁRIO obriga-se a não depositar no imóvel materiais inflamáveis, explosivos, corrosivos ou quaisquer objetos que possam comprometer a segurança do imóvel, dos vizinhos ou de terceiros.

CLÁUSULA OITAVA - DA INADIMPLÊNCIA E RESCISÃO
O descumprimento de qualquer cláusula deste contrato poderá acarretar a rescisão da locação, cobrança dos valores devidos, perdas e danos, além das medidas judiciais cabíveis.

CLÁUSULA NONA - DA MULTA CONTRATUAL
Fica estipulada multa equivalente a 03 (três) meses de aluguel vigente na data da infração, na qual incorrerá a parte que infringir quaisquer cláusulas deste contrato, facultando à parte inocente considerar rescindida a locação.

CLÁUSULA DÉCIMA - DO FORO
As partes elegem o foro da comarca de {contractCity} para dirimir quaisquer dúvidas ou questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

E assim, por estarem justas e convencionadas, as partes assinam o presente instrumento particular de CONTRATO DE LOCAÇÃO RESIDENCIAL, em 2 (duas) vias de igual teor, juntamente com as testemunhas abaixo.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________`;

export const defaultAssetContractTemplateContent = `CONTRATO DE LOCAÇÃO DE BEM/ATIVO

I - LOCADOR:
{landlordName}, inscrito(a) no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, telefone {companyPhone}, e-mail {companyEmail}, a seguir denominado(a) LOCADOR.

II - LOCATÁRIO:
{tenantName}, inscrito(a) no CPF/CNPJ nº {tenantDocument}, residente e domiciliado(a) em {tenantAddress}, telefone {tenantPhone}, e-mail {tenantEmail}, a seguir denominado(a) LOCATÁRIO.

CLÁUSULA PRIMEIRA - DO BEM/ATIVO E DO PRAZO
O LOCADOR dá em locação ao LOCATÁRIO o bem/ativo denominado {propertyName}, classificado como {assetCategory}, pelo prazo de {contractMonths} mês(es), com início em {startDate} e término em {endDate}.

Parágrafo Primeiro - O LOCATÁRIO declara ter recebido o bem/ativo em condições adequadas de uso, comprometendo-se a utilizá-lo exclusivamente para a finalidade contratada e a devolvê-lo ao final da locação no mesmo estado de conservação, salvo desgaste natural de uso.

Parágrafo Segundo - Quando houver local de entrega, guarda ou operação informado, considera-se como referência: {propertyAddress}.

CLÁUSULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO
O valor da locação será de {amount}, com vencimento conforme acordado entre as partes. O pagamento poderá ser realizado por depósito, transferência, dinheiro ou Pix, utilizando a chave {pixKey}, salvo outra forma expressamente acordada.

CLÁUSULA TERCEIRA - DA GUARDA, USO E CONSERVAÇÃO
O LOCATÁRIO será responsável pela guarda, conservação, uso adequado e segurança do bem/ativo durante todo o período de locação, respondendo por perdas, danos, mau uso, extravio, furto, roubo ou avarias que não decorram de desgaste natural.

CLÁUSULA QUARTA - DA MANUTENÇÃO E DEVOLUÇÃO
O LOCATÁRIO deverá comunicar imediatamente ao LOCADOR qualquer defeito, dano, acidente, perda de desempenho ou necessidade de manutenção. A devolução deverá ocorrer na data final contratada, acompanhada de acessórios, documentos, peças, componentes ou itens entregues junto com o bem/ativo, quando houver.

CLÁUSULA QUINTA - DAS PROIBIÇÕES
É vedado ao LOCATÁRIO ceder, transferir, sublocar, emprestar, vender, modificar, desmontar ou alterar o bem/ativo sem autorização prévia e por escrito do LOCADOR.

CLÁUSULA SÉTIMA - DA MULTA CONTRATUAL
Fica estipulada multa equivalente a 03 (três) períodos de locação vigentes na data da infração, facultando à parte inocente considerar rescindido o contrato e cobrar eventuais prejuízos adicionais.

CLÁUSULA OITAVA - DO FORO
As partes elegem o foro da comarca de {contractCity} para dirimir dúvidas ou questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

E assim, por estarem justas e contratadas, as partes assinam o presente instrumento particular de CONTRATO DE LOCAÇÃO DE BEM/ATIVO, em 2 (duas) vias de igual teor.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________`;

export const legacyPaymentBookletTemplateContent = `CARNÊ DE PAGAMENTO

EMPRESA: {companyName}
CLIENTE: {personName}
CONTRATO: {contractNumber}
PARCELA: {installmentNumber}
VENCIMENTO: {dueDate}
VALOR: {amount}
PIX: {pixKey}

INSTRUÇÕES:
1. Efetue o pagamento até a data de vencimento.
2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.
3. Guarde este comprovante para controle financeiro.`;

export const defaultPaymentBookletTemplateContent = `1. Efetue o pagamento até a data de vencimento.
2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.
3. Guarde este comprovante para controle financeiro.`;

export const defaultAccountsPayableReportTemplateContent = `RELATÓRIO DE CONTAS A PAGAR

EMPRESA: {companyName}
CATEGORIA: {reportCategory}
STATUS: {reportStatus}
VENCIMENTO: {reportDueFilter}
PERÍODO: {reportStartDate} até {reportEndDate}

RESUMO:
Quantidade: {reportCount}
Total geral: {reportTotal}
Total pago: {reportPaidTotal}
Total pendente: {reportPendingTotal}
Total vencido: {reportOverdueTotal}

GERADO EM: {currentDate}`;

export const defaultPrintTemplates: PrintTemplates = {
  temporaryContract: {
    title: "Contrato temporário",
    description: "Modelo usado na geração do contrato de locação temporária em PDF.",
    moduleName: "Contratos",
    icon: "📄",
    isEditable: true,
    content: defaultTemporaryContractTemplateContent,
  },
  standardContract: {
    title: "Contrato padrão",
    description: "Modelo usado na geração do contrato residencial padrão em PDF.",
    moduleName: "Contratos",
    icon: "🏠",
    isEditable: true,
    content: defaultStandardContractTemplateContent,
  },
  assetContract: {
    title: "Contrato de bem/ativo",
    description: "Modelo usado quando o contrato é de equipamento, máquina, veículo, ferramenta ou outro bem não imobiliário.",
    moduleName: "Contratos",
    icon: "⚙️",
    isEditable: true,
    content: defaultAssetContractTemplateContent,
  },
  paymentBooklet: {
    title: "Carnê",
    description: "Modelo usado na geração de carnês e parcelas de cobrança em PDF.",
    moduleName: "Contas a receber",
    icon: "💳",
    isEditable: true,
    content: legacyPaymentBookletTemplateContent,
  },
  accountsPayableReport: {
    title: "Relatório contas a pagar",
    description: "Cabeçalho e resumo usados no relatório impresso de contas a pagar.",
    moduleName: "Contas a pagar",
    icon: "CP",
    isEditable: true,
    content: defaultAccountsPayableReportTemplateContent,
  },
};

export const printTemplateVariableGroups = [
  {
    title: "Empresa / Locador",
    variables: [
      { label: "Nome do locador", value: "{landlordName}" },
      { label: "Documento do locador", value: "{landlordDocument}" },
      { label: "Endereço do locador", value: "{landlordAddress}" },
      { label: "E-mail da empresa", value: "{companyEmail}" },
      { label: "Telefone da empresa", value: "{companyPhone}" },
      { label: "Chave Pix", value: "{pixKey}" },
    ],
  },
  {
    title: "Locatário / Pessoa",
    variables: [
      { label: "Nome do locatário", value: "{tenantName}" },
      { label: "Nome da pessoa", value: "{personName}" },
      { label: "Documento do locatário", value: "{tenantDocument}" },
      { label: "Endereço do locatário", value: "{tenantAddress}" },
      { label: "Telefone do locatário", value: "{tenantPhone}" },
      { label: "E-mail do locatário", value: "{tenantEmail}" },
    ],
  },
  {
    title: "Bem/Ativo / Contrato",
    variables: [
      { label: "Nome do bem/ativo", value: "{propertyName}" },
      { label: "Categoria do bem/ativo", value: "{assetCategory}" },
      { label: "Endereço do bem/ativo", value: "{propertyAddress}" },
      { label: "Data inicial", value: "{startDate}" },
      { label: "Data final", value: "{endDate}" },
      { label: "Dias do contrato", value: "{contractDays}" },
      { label: "Meses do contrato", value: "{contractMonths}" },
      { label: "Dia do vencimento", value: "{dueDay}" },
      { label: "Valor", value: "{amount}" },
      { label: "Multa", value: "{penaltyAmount}" },
    ],
  },
  {
    title: "Impressão / Assinatura",
    variables: [
      { label: "Cidade de assinatura", value: "{contractCity}" },
      { label: "Data atual", value: "{currentDate}" },
      { label: "Observações padrão", value: "{contractDefaultNotes}" },
      { label: "Horário entrada", value: "{entryTime}" },
      { label: "Horário saída", value: "{exitTime}" },
      { label: "Número do contrato", value: "{contractNumber}" },
      { label: "Parcela", value: "{installmentNumber}" },
      { label: "Vencimento", value: "{dueDate}" },
    ],
  },
  {
    title: "Relatórios financeiros",
    variables: [
      { label: "Categoria", value: "{reportCategory}" },
      { label: "Status", value: "{reportStatus}" },
      { label: "Filtro vencimento", value: "{reportDueFilter}" },
      { label: "Data inicial", value: "{reportStartDate}" },
      { label: "Data final", value: "{reportEndDate}" },
      { label: "Quantidade", value: "{reportCount}" },
      { label: "Total geral", value: "{reportTotal}" },
      { label: "Total pago", value: "{reportPaidTotal}" },
      { label: "Total pendente", value: "{reportPendingTotal}" },
      { label: "Total vencido", value: "{reportOverdueTotal}" },
    ],
  },
];

export const printTemplateAliasMap: Record<string, string> = {
  aluguel: "amount",
  assinante_cidade: "contractCity",
  bem: "propertyName",
  bem_ativo: "propertyName",
  bem_endereco: "propertyAddress",
  bem_nome: "propertyName",
  categoria_bem: "assetCategory",
  cep_locador: "landlordAddress",
  cidade: "contractCity",
  cidade_assinatura: "contractCity",
  cliente: "tenantName",
  cliente_documento: "tenantDocument",
  cliente_email: "tenantEmail",
  cliente_endereco: "tenantAddress",
  cliente_nome: "tenantName",
  cliente_telefone: "tenantPhone",
  cnpj_empresa: "landlordDocument",
  contrato_data_final: "endDate",
  contrato_data_inicio: "startDate",
  contrato_fim: "endDate",
  contrato_inicio: "startDate",
  contrato_meses: "contractMonths",
  contrato_numero: "contractNumber",
  data_atual: "currentDate",
  data_assinatura: "currentDate",
  data_final: "endDate",
  data_inicio: "startDate",
  dia_vencimento: "dueDay",
  documento_empresa: "landlordDocument",
  documento_inquilino: "tenantDocument",
  email_empresa: "companyEmail",
  email_inquilino: "tenantEmail",
  endereco_empresa: "landlordAddress",
  endereco_imovel: "propertyAddress",
  endereco_inquilino: "tenantAddress",
  endereco_locador: "landlordAddress",
  empresa: "landlordName",
  empresa_cnpj: "landlordDocument",
  empresa_documento: "landlordDocument",
  empresa_email: "companyEmail",
  empresa_endereco: "landlordAddress",
  empresa_nome: "landlordName",
  empresa_telefone: "companyPhone",
  fim: "endDate",
  imovel: "propertyName",
  imovel_endereco: "propertyAddress",
  imovel_nome: "propertyName",
  inicio: "startDate",
  inquilino: "tenantName",
  inquilino_documento: "tenantDocument",
  inquilino_email: "tenantEmail",
  inquilino_endereco: "tenantAddress",
  inquilino_nome: "tenantName",
  inquilino_telefone: "tenantPhone",
  locador: "landlordName",
  locador_documento: "landlordDocument",
  locador_email: "companyEmail",
  locador_endereco: "landlordAddress",
  locador_nome: "landlordName",
  locador_telefone: "companyPhone",
  locatario: "tenantName",
  locatario_documento: "tenantDocument",
  locatario_email: "tenantEmail",
  locatario_endereco: "tenantAddress",
  locatario_nome: "tenantName",
  locatario_telefone: "tenantPhone",
  multa: "penaltyAmount",
  nome_empresa: "landlordName",
  nome_imovel: "propertyName",
  nome_inquilino: "tenantName",
  nome_locador: "landlordName",
  nome_locatario: "tenantName",
  observacoes: "contractDefaultNotes",
  pix: "pixKey",
  telefone_empresa: "companyPhone",
  telefone_inquilino: "tenantPhone",
  valor: "amount",
  valor_aluguel: "amount",
  valor_contrato: "amount",
  chave_pix: "pixKey",
  pix_chave: "pixKey",
  chavepix: "pixKey",
  contrato_dias: "contractDays",
  dias: "contractDays",
  dias_contrato: "contractDays",
  meses: "contractMonths",
  meses_contrato: "contractMonths",
  horario_entrada: "entryTime",
  horario_saida: "exitTime",
  entrada_horario: "entryTime",
  saida_horario: "exitTime",
  checkin: "entryTime",
  checkout: "exitTime",
  documento_locador: "landlordDocument",
  documento_locatario: "tenantDocument",
  endereco_locatario: "tenantAddress",
  email_locador: "companyEmail",
  email_locatario: "tenantEmail",
  telefone_locador: "companyPhone",
  telefone_locatario: "tenantPhone",
};

export type FriendlyPrintVariable = {
  tag: string;
  label: string;
  description: string;
  category: "locador" | "locatario" | "imovel" | "valores" | "assinatura";
  example: string;
};

export const friendlyPrintVariables: FriendlyPrintVariable[] = [
  // Locador / Empresa
  { tag: "{{nome_empresa}}", label: "Nome / Razão Social do Locador", description: "Nome da empresa ou proprietário locador", category: "locador", example: "Contrx Gestão de Locações LTDA" },
  { tag: "{{cnpj_empresa}}", label: "CPF ou CNPJ do Locador", description: "Documento oficial do locador", category: "locador", example: "12.345.678/0001-90" },
  { tag: "{{endereco_empresa}}", label: "Endereço Completo do Locador", description: "Logradouro, número, bairro, cidade e CEP", category: "locador", example: "Rua Principal, nº 100, Rolim de Moura/RO" },
  { tag: "{{telefone_empresa}}", label: "Telefone / WhatsApp da Empresa", description: "Telefone de contato do locador", category: "locador", example: "(69) 99999-0000" },
  { tag: "{{email_empresa}}", label: "E-mail da Empresa", description: "E-mail de contato do locador", category: "locador", example: "contato@suaempresa.com.br" },
  { tag: "{{chave_pix}}", label: "Chave Pix para Pagamento", description: "Chave Pix cadastrada nas configurações da empresa", category: "locador", example: "pix@suaempresa.com.br" },

  // Locatário / Inquilino
  { tag: "{{inquilino_nome}}", label: "Nome do Locatário / Inquilino", description: "Nome completo do cliente que está alugando", category: "locatario", example: "João da Silva" },
  { tag: "{{inquilino_documento}}", label: "CPF ou CNPJ do Locatário", description: "Documento oficial informado no cadastro", category: "locatario", example: "123.456.789-00" },
  { tag: "{{inquilino_endereco}}", label: "Endereço do Locatário", description: "Endereço residencial ou comercial do cliente", category: "locatario", example: "Avenida Central, nº 250, Rolim de Moura/RO" },
  { tag: "{{inquilino_telefone}}", label: "Telefone do Locatário", description: "WhatsApp ou celular do inquilino", category: "locatario", example: "(69) 99999-1111" },
  { tag: "{{inquilino_email}}", label: "E-mail do Locatário", description: "E-mail de contato do inquilino", category: "locatario", example: "joao@email.com" },

  // Imóvel / Bem / Ativo
  { tag: "{{imovel_nome}}", label: "Nome do Imóvel ou Bem/Ativo", description: "Identificação do imóvel ou equipamento alugado", category: "imovel", example: "Casa de Campo Temporada" },
  { tag: "{{imovel_endereco}}", label: "Endereço do Imóvel / Bem", description: "Localização física onde se encontra o bem", category: "imovel", example: "Rodovia BR-364, Km 15" },
  { tag: "{{categoria_bem}}", label: "Categoria do Bem/Ativo", description: "Ex: Imóvel, Máquina, Equipamento, Veículo", category: "imovel", example: "Imóvel" },

  // Valores e Prazos
  { tag: "{{valor_aluguel}}", label: "Valor do Aluguel / Período", description: "Valor total ou da locação formatado em reais", category: "valores", example: "R$ 1.500,00" },
  { tag: "{{data_inicio}}", label: "Data de Início do Contrato", description: "Data de início da vigência / check-in", category: "valores", example: "01/10/2026" },
  { tag: "{{data_fim}}", label: "Data de Término do Contrato", description: "Data final da vigência / check-out", category: "valores", example: "10/10/2026" },
  { tag: "{{contrato_dias}}", label: "Duração em Dias", description: "Quantidade total de diárias/dias calculada", category: "valores", example: "9" },
  { tag: "{{contrato_meses}}", label: "Duração em Meses", description: "Quantidade total de meses do contrato", category: "valores", example: "12" },
  { tag: "{{dia_vencimento}}", label: "Dia do Vencimento", description: "Dia do mês em que vence a parcela do aluguel", category: "valores", example: "10" },
  { tag: "{{multa}}", label: "Valor / Cálculo da Multa", description: "Valor estipulado para rescisão ou atraso", category: "valores", example: "R$ 300,00" },
  { tag: "{{horario_entrada}}", label: "Horário de Entrada (Check-in)", description: "Horário previsto para entrada na temporada", category: "valores", example: "14:00" },
  { tag: "{{horario_saida}}", label: "Horário de Saída (Check-out)", description: "Horário previsto para entrega das chaves", category: "valores", example: "10:00" },

  // Assinatura e Local
  { tag: "{{cidade_assinatura}}", label: "Cidade de Assinatura", description: "Cidade informada nas configurações ou do imóvel", category: "assinatura", example: "Rolim de Moura/RO" },
  { tag: "{{data_assinatura}}", label: "Data Atual por Extenso", description: "Data de emissão formatada para contrato", category: "assinatura", example: "29 de setembro de 2026" },
  { tag: "{{observacoes}}", label: "Observações Padrão", description: "Notas e observações cadastradas nas configurações", category: "assinatura", example: "Sem animais domésticos." },
];

export const requiredPrintTemplateVariables: Partial<Record<PrintDocumentKey, string[]>> = {
  temporaryContract: [
    "{landlordName}",
    "{tenantName}",
    "{propertyName}",
    "{startDate}",
    "{endDate}",
    "{amount}",
  ],
  standardContract: [
    "{landlordName}",
    "{tenantName}",
    "{tenantDocument}",
    "{propertyName}",
    "{propertyAddress}",
    "{startDate}",
    "{endDate}",
    "{amount}",
  ],
  assetContract: [
    "{landlordName}",
    "{tenantName}",
    "{propertyName}",
    "{assetCategory}",
    "{startDate}",
    "{endDate}",
    "{amount}",
  ],
};

export const knownPrintTemplateVariables = new Set(
  printTemplateVariableGroups.flatMap((group) => group.variables.map((variable) => variable.value)),
);

export function normalizeTemplateVariableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[{}]/g, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function convertImportedTemplateVariables(content: string) {
  const replaceVariable = (rawVariable: string) => {
    const cleanVariable = rawVariable.trim();
    const normalizedVariable = normalizeTemplateVariableName(cleanVariable);
    const mappedVariable = printTemplateAliasMap[normalizedVariable];

    if (mappedVariable) {
      return `{${mappedVariable}}`;
    }

    const directVariable = `{${cleanVariable.replace(/[{}\s]/g, "")}}`;

    return knownPrintTemplateVariables.has(directVariable) ? directVariable : `{${cleanVariable}}`;
  };

  return content
    .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, variableName: string) =>
      replaceVariable(variableName),
    )
    .replace(/\[\[\s*([^[\]]+?)\s*\]\]/g, (_match, variableName: string) =>
      replaceVariable(variableName),
    )
    .replace(/\{\s*([a-zA-ZÀ-ÿ0-9_ -]+?)\s*\}/g, (_match, variableName: string) =>
      replaceVariable(variableName),
    );
}

export function normalizeImportedTemplateText(content: string) {
  return convertImportedTemplateVariables(content)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getRequiredPrintTemplateVariables(documentKey: PrintDocumentKey | null) {
  return documentKey ? requiredPrintTemplateVariables[documentKey] || [] : [];
}

export function getPrintTemplateStats(content: string) {
  const text = String(content || "");
  const variables = Array.from(new Set(text.match(/\{[a-zA-Z0-9_]+\}/g) || []));
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split("\n").length : 0;

  return {
    characters,
    words,
    lines,
    variables,
  };
}

export function getMissingPrintTemplateVariables(content: string, documentKey: PrintDocumentKey | null) {
  const variables = getPrintTemplateStats(content).variables;
  const variableSet = new Set(variables);

  return getRequiredPrintTemplateVariables(documentKey).filter(
    (variable) => !variableSet.has(variable),
  );
}

function getXmlElementsByLocalName(element: any, localName: string): Element[] {
  if (!element || typeof element.getElementsByTagName !== "function") return [];
  return Array.from(element.getElementsByTagName("*") as HTMLCollectionOf<Element>).filter(
    (childElement) => childElement.localName === localName,
  );
}

function getDocxParagraphText(paragraphElement: Element) {
  const textParts: string[] = [];

  getXmlElementsByLocalName(paragraphElement, "r").forEach((runElement) => {
    getXmlElementsByLocalName(runElement, "t").forEach((textElement) => {
      textParts.push(textElement.textContent || "");
    });

    if (getXmlElementsByLocalName(runElement, "tab").length > 0) {
      textParts.push("\t");
    }

    if (getXmlElementsByLocalName(runElement, "br").length > 0) {
      textParts.push("\n");
    }
  });

  return textParts.join("").trim();
}

function getDocxTableText(tableElement: Element) {
  return getXmlElementsByLocalName(tableElement, "tr")
    .map((rowElement) =>
      getXmlElementsByLocalName(rowElement, "tc")
        .map((cellElement) =>
          getXmlElementsByLocalName(cellElement, "p")
            .map(getDocxParagraphText)
            .filter(Boolean)
            .join(" "),
        )
        .filter(Boolean)
        .join(" | "),
    )
    .filter(Boolean)
    .join("\n");
}

export async function extractTextFromDocx(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const documentXml = await zip.file("word/document.xml")?.async("string");

  if (!documentXml) {
    throw new Error("Não foi possível localizar o conteúdo principal do DOCX.");
  }

  const xmlDocument = new DOMParser().parseFromString(documentXml, "application/xml");
  const parseError = xmlDocument.querySelector("parsererror");

  if (parseError) {
    throw new Error("Não foi possível ler o conteúdo XML do DOCX.");
  }

  const bodyElement = getXmlElementsByLocalName(xmlDocument, "body")[0];

  if (!bodyElement) {
    throw new Error("O arquivo DOCX não possui corpo de documento válido.");
  }

  const textBlocks: string[] = [];
  const children = Array.from((bodyElement as any).children || []) as Element[];

  children.forEach((childElement) => {
    if (childElement.localName === "p") {
      textBlocks.push(getDocxParagraphText(childElement));
    } else if (childElement.localName === "tbl") {
      textBlocks.push(getDocxTableText(childElement));
    }
  });

  const textContent = textBlocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!textContent) {
    throw new Error("Não encontrei texto editável no DOCX. Verifique se o arquivo não é apenas imagem ou PDF convertido.");
  }

  return textContent;
}

export async function buildDocxBlobFromTemplateText(content: string): Promise<Blob> {
  const normalized = (content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized.split("\n");

  const paragraphs: Paragraph[] = lines.map((line) => {
    const trimmed = line.trimEnd();
    if (!trimmed) {
      return new Paragraph({
        children: [],
        spacing: { after: 120 },
      });
    }

    const isHeading =
      /^(INSTRUMENTO|CONTRATO|CLÁUSULA|CLAUSULA|[IVXLCDM]+\s*[-–]|TERMO|RELATÓRIO)/i.test(trimmed.trim()) &&
      trimmed.trim().length < 80;

    return new Paragraph({
      children: [
        new TextRun({
          text: trimmed,
          bold: isHeading,
          font: "Arial",
          size: isHeading ? 24 : 22,
          color: "1A1A1A",
        }),
      ],
      spacing: {
        after: isHeading ? 160 : 100,
        line: 276,
      },
    });
  });

  const doc = new DocxDocument({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function extractPaymentBookletInstructions(content: string) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    return defaultPaymentBookletTemplateContent;
  }

  if (!cleanContent.includes("INSTRUÇÕES:")) {
    return cleanContent;
  }

  const instructionsSection = cleanContent.split("INSTRUÇÕES:")[1] || "";
  const instructionsOnly = instructionsSection
    .split("GERADO EM:")[0]
    .trim();

  return instructionsOnly || defaultPaymentBookletTemplateContent;
}

export function normalizeStoredPrintTemplates(storedTemplates: Partial<PrintTemplates>): PrintTemplates {
  const temporaryContract = {
    ...defaultPrintTemplates.temporaryContract,
    ...(storedTemplates.temporaryContract || {}),
  };
  const standardContract = {
    ...defaultPrintTemplates.standardContract,
    ...(storedTemplates.standardContract || {}),
  };
  const assetContract = {
    ...defaultPrintTemplates.assetContract,
    ...(storedTemplates.assetContract || {}),
  };
  const paymentBooklet = {
    ...defaultPrintTemplates.paymentBooklet,
    ...(storedTemplates.paymentBooklet || {}),
  };
  const accountsPayableReport = {
    ...defaultPrintTemplates.accountsPayableReport,
    ...(storedTemplates.accountsPayableReport || {}),
  };

  if (temporaryContract.content.trim() === legacyTemporaryContractTemplateContent.trim()) {
    temporaryContract.content = defaultTemporaryContractTemplateContent;
  }

  if (!standardContract.content.trim()) {
    standardContract.content = defaultStandardContractTemplateContent;
  }

  if (!assetContract.content.trim()) {
    assetContract.content = defaultAssetContractTemplateContent;
  }

  if (!paymentBooklet.content.trim()) {
    paymentBooklet.content = legacyPaymentBookletTemplateContent;
  }

  return {
    temporaryContract,
    standardContract,
    assetContract,
    paymentBooklet,
    accountsPayableReport,
  };
}
