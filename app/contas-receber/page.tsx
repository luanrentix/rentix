"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import AppShell from "@/components/layout/app-shell";
import { useAuth } from "@/context/AuthContext";
import {
  createReceivableAccount,
  deleteReceivableAccount,
  getReceivableAccounts,
  receiveAccount,
  reverseReceivedAccount,
  updateReceivableAccount,
  type PaymentMethod as ApiPaymentMethod,
  type ReceivableAccount,
} from "@/services/financial.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import { getPeople, createPerson, type Person } from "@/services/people.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import {
  getCachedCompanySettings,
  getCachedPrintTemplates,
} from "@/services/settings-cache";

const LEGACY_SETTINGS_TEMPORARY_CONTRACT_CONTENT = `CONTRATO TEMPORÁRIO

LOCADOR: {companyName}
LOCATÁRIO: {personName}
IMÓVEL: {propertyName}
PERÍODO: {startDate} até {endDate}
HORÁRIO: Entrada {entryTime} / Saída {exitTime}

CLÁUSULAS E CONDIÇÕES:
1. O presente contrato tem finalidade de locação temporária.
2. O locatário declara estar ciente das regras de uso do imóvel.
3. As informações financeiras e condições acordadas deverão constar no documento final.

{contractDefaultNotes}

{contractCity}, {currentDate}.

__________________________________
LOCADOR

__________________________________
LOCATÁRIO`;

const DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT = `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO IMOBILIÁRIA TEMPORÁRIA

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


const LEGACY_SETTINGS_STANDARD_CONTRACT_CONTENT = `CONTRATO DE LOCAÇÃO RESIDENCIAL

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

const ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO RESIDENCIAL

{landlordName}, inscrito(a) no CPF/CNPJ nº {landlordDocument}, telefone {companyPhone}, residente e domiciliado(a) em {landlordAddress}, a seguir denominado(a) LOCADOR, e de outro lado, {tenantName}, inscrito(a) no CPF/CNPJ nº {tenantDocument}, telefone {tenantPhone}, residente e domiciliado(a) em {tenantAddress}, denominado(a) LOCATÁRIO.

CLÁUSULA PRIMEIRA - O LOCADOR dá em locação o imóvel situado em {propertyAddress}, denominado {propertyName}, pelo prazo de {contractMonths} mês(es), ao iniciar em {startDate} e para terminar em {endDate}, data em que o LOCATÁRIO, após vistoria do mesmo, o aceita nas condições em que se encontra, e se obriga a restituir o imóvel locado em perfeito estado de conservação, inteiramente livre e desocupado, com conta de luz, água e demais encargos pagos e desligados quando aplicável, sob pena de acrescentar-se a obrigação de fazer e a multa contratual prevista na CLÁUSULA DÉCIMA SEXTA.

Parágrafo Primeiro - Antes do vencimento do prazo ajustado nesta cláusula, não poderá o LOCADOR retomar o imóvel, salvo se motivado por infração contratual do LOCATÁRIO. No caso de devolução do imóvel ao LOCADOR antes do prazo, deverá o LOCATÁRIO pagar a multa prevista na CLÁUSULA DÉCIMA SEXTA.

Parágrafo Segundo - Quando da devolução das chaves ao final do contrato, o LOCATÁRIO deverá apresentar contas de água e luz pagas durante o tempo em que estiver no imóvel e, quando cabível, comprovar seu desligamento ou transferência.

Parágrafo Terceiro - Na hipótese do LOCATÁRIO abandonar o imóvel, fica o LOCADOR autorizado a tomar as medidas necessárias para resguardar a posse, conservação e segurança do imóvel, evitando depredação ou invasão.

Parágrafo Quarto - No caso de falecimento do LOCATÁRIO, ficarão sub-rogados nos seus direitos e obrigações o cônjuge ou companheiro e, sucessivamente, os herdeiros, nos termos da legislação aplicável.

CLÁUSULA SEGUNDA - O valor mensal do aluguel será de {amount}, a ser pago pelo LOCATÁRIO ao LOCADOR até o dia {dueDay} de cada mês, por depósito bancário, transferência, dinheiro ou Pix, utilizando a chave {pixKey}, ou por outro meio formalmente acordado entre as partes.

Parágrafo Primeiro - Decorrido o prazo de 30 (trinta) dias do vencimento, o débito poderá ser encaminhado para cobrança amigável ou judicial, ficando o LOCATÁRIO responsável pelos encargos, honorários, custas e demais despesas decorrentes da cobrança.

Parágrafo Segundo - Os encargos constantes da CLÁUSULA SEXTA, incluindo taxa de lixo quando houver, deverão ser pagos juntamente com o aluguel ou diretamente aos órgãos responsáveis, conforme a natureza da cobrança.

Parágrafo Terceiro - O não cumprimento das obrigações pecuniárias expressas neste contrato pelo LOCATÁRIO faculta ao LOCADOR adotar medidas de cobrança, inclusive protesto ou inclusão em cadastros de proteção ao crédito, quando legalmente permitido.

CLÁUSULA TERCEIRA - O aluguel mensal pactuado na CLÁUSULA SEGUNDA poderá ser reajustado ao final do prazo contratual ou em eventual renovação, mediante acordo entre as partes e observada a legislação vigente.

CLÁUSULA QUARTA - Se necessária a propositura de ação de despejo, consignação em pagamento de aluguéis ou acessórios da locação, cobranças, citações, intimações e notificações poderão ser realizadas pelas formas previstas em lei, inclusive correspondência com aviso de recebimento, quando admitido.

CLÁUSULA QUINTA - O LOCATÁRIO declara haver visitado e examinado o imóvel locado, aceitando-o nas condições em que se encontra, obrigando-se a zelar por tudo o que nele houver e realizar, por sua conta, os reparos decorrentes do uso normal durante a locação, especialmente os relativos a limpeza, conservação, instalações elétricas, hidráulicas, pintura, telhado, vidraçaria, fechaduras, torneiras, pias, banheiros, ralos e demais acessórios.

Parágrafo Primeiro - É assegurado ao LOCADOR o direito de vistoriar o imóvel sempre que julgar conveniente, mediante prévia comunicação ao LOCATÁRIO, respeitada a legislação aplicável.

Parágrafo Segundo - O LOCATÁRIO deverá entregar imediatamente ao LOCADOR toda e qualquer correspondência, intimação, documento de cobrança, carnê ou comunicação relativa ao imóvel, ainda que dirigida ao LOCATÁRIO.

Parágrafo Terceiro - Rescindida a contratação, amigável ou judicialmente, deverá o LOCATÁRIO entregar o imóvel em perfeito estado de conservação e limpeza, respondendo por danos comprovados mediante recibos, orçamentos ou documentos hábeis.

Parágrafo Quarto - Fica expressamente proibida toda e qualquer alteração no imóvel sem prévia autorização por escrito do LOCADOR.

CLÁUSULA SEXTA - Além do aluguel, compete ao LOCATÁRIO o pagamento das despesas ordinárias de consumo de água, energia elétrica, taxas de esgoto, saneamento, taxa de lixo, condomínio quando houver e demais encargos relacionados ao uso do imóvel. Cabe ao LOCATÁRIO solicitar contratação, transferência ou regularização dos serviços em seu nome quando aplicável, respondendo civil e criminalmente por uso irregular.

Parágrafo Primeiro - As taxas e despesas ordinárias de condomínio que incidam ou venham a incidir sobre o imóvel serão pagas pelo LOCATÁRIO aos responsáveis pela cobrança, devendo apresentar comprovantes quando solicitado.

Parágrafo Segundo - Na hipótese de os encargos serem pagos pelo LOCADOR por inadimplência do LOCATÁRIO, os respectivos valores serão reembolsados pelo LOCATÁRIO com multa, juros e correção monetária quando aplicáveis.

Parágrafo Terceiro - O não pagamento dos encargos sob responsabilidade do LOCATÁRIO poderá dar ensejo à rescisão contratual, despejo e aplicação da multa prevista na CLÁUSULA DÉCIMA SEXTA.

CLÁUSULA SÉTIMA - No ato da devolução do imóvel, o LOCATÁRIO deverá apresentar os comprovantes dos últimos pagamentos de água, energia elétrica e demais encargos, bem como comprovar o encerramento, transferência ou regularização dos serviços quando necessário.

CLÁUSULA OITAVA - O LOCATÁRIO obriga-se a não depositar no imóvel materiais inflamáveis, explosivos, corrosivos ou quaisquer bens que possam causar risco ao imóvel, aos vizinhos ou a terceiros. Benfeitorias somente poderão ser realizadas com autorização prévia do LOCADOR, ficando incorporadas ao imóvel sem direito a retenção ou abatimento, salvo acordo escrito em sentido contrário.

CLÁUSULA NONA - No caso de desapropriação do imóvel locado, ficará o LOCADOR desobrigado das cláusulas deste contrato, reservando-se ao LOCATÁRIO apenas os direitos que eventualmente lhe sejam assegurados pela autoridade competente.

CLÁUSULA DÉCIMA - Nenhuma intimação ou exigência da Saúde Pública ou órgão público será motivo para o LOCATÁRIO abandonar o imóvel ou pedir rescisão contratual, salvo decisão ou vistoria oficial que comprove risco estrutural ou impossibilidade de uso do imóvel.

CLÁUSULA DÉCIMA PRIMEIRA - Quaisquer tolerâncias ou concessões do LOCADOR para com o LOCATÁRIO, quando não manifestadas por escrito, não constituirão precedente invocável e não alterarão as obrigações contratuais.

CLÁUSULA DÉCIMA SEGUNDA - O LOCADOR não responderá por danos sofridos pelo LOCATÁRIO em razão de vazamentos, chuvas, rompimento de canos, defeitos em esgoto ou fossa, incêndios, arrombamentos, roubos, furtos, caso fortuito ou força maior, salvo quando comprovada responsabilidade legal do LOCADOR.

CLÁUSULA DÉCIMA TERCEIRA - O LOCATÁRIO não terá direito de reter o pagamento do aluguel ou de qualquer quantia devida ao LOCADOR sob alegação de não terem sido atendidas exigências ou solicitações, devendo eventuais controvérsias ser resolvidas pelos meios legais cabíveis.

CLÁUSULA DÉCIMA QUARTA - O imóvel objeto do presente contrato destina-se exclusivamente para fim residencial, ficando o LOCATÁRIO proibido de mudar a destinação, ceder, transferir, sublocar ou emprestar o imóvel, no todo ou em parte, a qualquer título, sem autorização expressa do LOCADOR.

Parágrafo Único - A ocupação do imóvel por pessoa não autorizada ou a permanência de terceiros após a saída do LOCATÁRIO caracterizará infração contratual grave, sujeitando o LOCATÁRIO à rescisão e à multa prevista na CLÁUSULA DÉCIMA SEXTA.

CLÁUSULA DÉCIMA QUINTA - Em caso de venda do imóvel, o LOCATÁRIO será notificado acerca do direito de preferência previsto na Lei do Inquilinato. Não se manifestando no prazo legal, será considerado não interessado. Não efetuando a compra, o LOCATÁRIO autoriza o LOCADOR a mostrar o imóvel a interessados, mediante agendamento prévio.

CLÁUSULA DÉCIMA SEXTA - Fica estipulada a multa equivalente a 03 (três) meses de aluguel vigente na data da ocorrência, na qual incorrerá a parte que infringir quaisquer cláusulas deste contrato, facultando à parte inocente considerar rescindida a locação, promover a cobrança dos valores devidos e tomar as medidas judiciais cabíveis.

CLÁUSULA DÉCIMA SÉTIMA - Elegem as partes contratantes o foro da comarca de {contractCity}, para dirimir as questões oriundas da interpretação ou aplicação deste contrato, com exclusão de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

E assim, por estarem justas e convencionadas, as partes assinam o presente instrumento particular de CONTRATO DE LOCAÇÃO RESIDENCIAL, em 2 (duas) vias de igual teor, juntamente com as testemunhas abaixo.

{contractCity}, {currentDate}.

____________________________________
LOCADOR: {landlordName}

____________________________________
LOCATÁRIO: {tenantName}

____________________________________
Testemunha:
Nome: ______________________________
CPF: ______________________________

____________________________________
Testemunha:
Nome: ______________________________
CPF: ______________________________`;


type Contract = {
  id: string;
  propertyId: string;
  propertyName?: string;
  tenantId: string;
  tenantName?: string;
  startDate: string;
  endDate?: string;
  value?: number | string;
  amount?: number | string;
  rentValue?: number | string;
  monthlyValue?: number | string;
  status: "Active" | "Finished" | "Inactive" | "Canceled" | "Deleted" | string;
  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
};

type Property = {
  id: string;
  name: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  district?: string;
  neighborhood?: string;
  complement?: string;
};

type PersonType = "Individual" | "Company";

type Tenant = {
  id: string;
  name: string;
  personType?: PersonType;
  cpf?: string;
  phone?: string;
  isTenant?: boolean;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  district?: string;
  complement?: string;
  document?: string;
  email?: string;
  neighborhood?: string;
};

type Charge = {
  id: string;
  contractId?: string | number | null;
  property: string;
  tenant: string;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
  isDownPayment?: boolean;
};

type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
type ReportDueFilter = "All" | "Overdue" | "DueToday" | "Upcoming" | "DateRange";
type ChargeLaunchType = "single" | "installment";

type InstallmentPreview = {
  id: string;
  installmentNumber: number;
  amount: string;
  dueDate: string;
  isDownPayment?: boolean;
};

type ReceivableFromContractPayload = {
  contractId?: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  monthlyAmount?: number;
  totalAmount?: number;
  issueDate: string;
  dueDate: string;
  endDate?: string;
  installmentQuantity?: number;
};

type PaymentMethod =
  | "Cash"
  | "Pix"
  | "CreditCard"
  | "DebitCard"
  | "BankSlip"
  | "BankTransfer"
  | "Other";

type PaymentAdjustmentMode = "amount" | "percentage";

type PaymentAllocation = {
  id: string;
  method: PaymentMethod;
  amount: number;
};

type PaymentEntry = {
  id: string;
  method: PaymentMethod;
  amount: string;
};

type ChargePayment = {
  chargeId: string;
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: PaymentAllocation[];
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string;
};

type PaymentMethodOption = {
  value: PaymentMethod;
  label: string;
};

const paymentMethodOptions: PaymentMethodOption[] = [
  { value: "Cash", label: "Dinheiro" },
  { value: "Pix", label: "Pix" },
  { value: "CreditCard", label: "Cartão de crédito" },
  { value: "DebitCard", label: "Cartão de débito" },
  { value: "BankSlip", label: "Boleto bancário" },
  { value: "BankTransfer", label: "Transferência bancária" },
  { value: "Other", label: "Outros" },
];

type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  ddd_telefone_1?: string;
};

type TenantFormData = {
  personType: PersonType;
  name: string;
  cpf: string;
  phone: string;
  isTenant: boolean;
  zipCode: string;
  state: string;
  city: string;
  street: string;
  number: string;
  district: string;
  complement: string;
};

const initialTenantFormData: TenantFormData = {
  personType: "Individual",
  name: "",
  cpf: "",
  phone: "",
  isTenant: true,
  zipCode: "",
  state: "",
  city: "",
  street: "",
  number: "",
  district: "",
  complement: "",
};

export default function AccountsReceivablePage() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paid, setPaid] = useState<string[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<ChargePayment[]>([]);
  const [manualCharges, setManualCharges] = useState<Charge[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [autoOpenSearch, setAutoOpenSearch] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTenantCreateOpen, setIsTenantCreateOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [openActionMenuChargeId, setOpenActionMenuChargeId] = useState<string | null>(null);

  const [formTenant, setFormTenant] = useState("");
  const [formContractId, setFormContractId] = useState("");
  const [formProperty, setFormProperty] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formIssueDate, setFormIssueDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formPaymentDate, setFormPaymentDate] = useState("");
  const [formLaunchType, setFormLaunchType] =
    useState<ChargeLaunchType>("single");
  const [formFirstInstallmentAsDownPayment, setFormFirstInstallmentAsDownPayment] =
    useState(false);
  const [formInstallmentQuantity, setFormInstallmentQuantity] = useState("2");
  const [installmentPreview, setInstallmentPreview] = useState<
    InstallmentPreview[]
  >([]);

  const [tenantFormData, setTenantFormData] = useState<TenantFormData>(
    initialTenantFormData,
  );
  const [isZipCodeLoading, setIsZipCodeLoading] = useState(false);
  const [zipCodeError, setZipCodeError] = useState("");
  const [isCnpjLoading, setIsCnpjLoading] = useState(false);
  const [cnpjSearchError, setCnpjSearchError] = useState("");
  const [chargeFormError, setChargeFormError] = useState("");
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargePendingDeletion, setChargePendingDeletion] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReversal, setChargePendingPaymentReversal] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReceipt, setChargePendingPaymentReceipt] =
    useState<Charge | null>(null);
  const [isPaymentConfirmationOpen, setIsPaymentConfirmationOpen] =
    useState(false);
  const [paymentInterest, setPaymentInterest] = useState("");
  const [paymentDiscount, setPaymentDiscount] = useState("");
  const [paymentInterestInput, setPaymentInterestInput] = useState("");
  const [paymentDiscountInput, setPaymentDiscountInput] = useState("");
  const [paymentInterestMode, setPaymentInterestMode] =
    useState<PaymentAdjustmentMode>("amount");
  const [paymentDiscountMode, setPaymentDiscountMode] =
    useState<PaymentAdjustmentMode>("amount");
  const [paymentFinalAmount, setPaymentFinalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([]);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentFormError, setPaymentFormError] = useState("");

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportTenantId, setReportTenantId] = useState("");
  const [reportStatusFilter, setReportStatusFilter] =
    useState<StatusFilter>("All");
  const [reportDueFilter, setReportDueFilter] =
    useState<ReportDueFilter>("All");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportFormError, setReportFormError] = useState("");
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [pendingContractPrintRequest, setPendingContractPrintRequest] =
    useState<Contract | null>(null);

  useEffect(() => {
    if (!companyId) return;

    loadReceivablesFromBackend(companyId);
  }, [companyId]);

  async function loadReceivablesFromBackend(currentCompanyId: string) {
    try {
      const [apiCharges, apiContracts, apiProperties, apiPeople] = await Promise.all([
        getReceivableAccounts(currentCompanyId),
        getContracts(currentCompanyId),
        getProperties(currentCompanyId),
        getPeople(currentCompanyId),
      ]);
      const nextManualCharges = apiCharges.map(mapApiReceivableToCharge);
      const nextPaid = nextManualCharges
        .filter((charge) => charge.status === "Paid")
        .map((charge) => charge.id);
      const nextPaymentRecords = apiCharges.flatMap(mapApiReceivableToPayments);

      setManualCharges(nextManualCharges);
      setPaid(nextPaid);
      setPaymentRecords(nextPaymentRecords);
      setContracts(apiContracts.map(mapApiContractToReceivableContract));
      setProperties(apiProperties.map(mapApiPropertyToReceivableProperty));
      setTenants(apiPeople.map(mapApiPersonToReceivableTenant));
    } catch (error) {
      console.error("NÃ£o foi possÃ­vel carregar contas a receber.", error);
    }
  }

  useEffect(() => {
    function applyStoredTheme() {
      const storedThemeSettings = localStorage.getItem("rentix_theme_settings");
      const legacyTheme = localStorage.getItem("rentix_theme");

      try {
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;

        const isBlackThemeSelected =
          parsedThemeSettings?.mode === "black" ||
          parsedThemeSettings?.mode === "dark" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isBlackThemeSelected);
        document.body.classList.toggle("dark", isBlackThemeSelected);
        setIsBlackTheme(isBlackThemeSelected);
      } catch {
        const isLegacyBlackTheme =
          legacyTheme === "black" || legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isLegacyBlackTheme);
        document.body.classList.toggle("dark", isLegacyBlackTheme);
        setIsBlackTheme(isLegacyBlackTheme);
      }
    }

    applyStoredTheme();

    window.addEventListener("storage", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
    };
  }, []);

  function openChargeFromContractPayload(payload: ReceivableFromContractPayload) {
    const normalizedInstallmentQuantity = Math.max(
      Number(payload.installmentQuantity || 1),
      1,
    );
    const monthlyAmount = normalizeAmount(payload.monthlyAmount ?? payload.amount);
    const totalAmount = normalizeAmount(
      payload.totalAmount ?? monthlyAmount * normalizedInstallmentQuantity,
    );
    const receivableAmount =
      normalizedInstallmentQuantity > 1 ? totalAmount : monthlyAmount;

    setFormTenant(String(payload.tenantId || ""));
    setFormContractId(String(payload.contractId || ""));
    setFormProperty(String(payload.propertyId || ""));
    setFormAmount(formatAmountInput(receivableAmount));
    setFormIssueDate(payload.issueDate || getLocalDateValue(new Date()));
    setFormDueDate(payload.dueDate || getLocalDateValue(new Date()));
    setFormPaymentDate("");
    setFormLaunchType(normalizedInstallmentQuantity > 1 ? "installment" : "single");
    setFormFirstInstallmentAsDownPayment(false);
    setFormInstallmentQuantity(String(Math.max(normalizedInstallmentQuantity, 2)));
    setEditingChargeId(null);
    setChargeFormError("");
    setInstallmentPreview([]);
    setIsTenantCreateOpen(false);
    setSelectedTenant(null);
    setSearch("");
    setIsSearchOpen(false);
    setIsCreateOpen(true);
  }

  useEffect(() => {
    const c = null;
    const p = null;
    const t = null;
    const paidData = null;
    const manualData = null;
    const paymentData = null;
    const savedStatusFilter = localStorage.getItem(
      "rentix_receivable_status_filter",
    );
    const savedAutoOpenSearch = localStorage.getItem(
      "rentix_auto_open_search",
    );

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
    if (manualData) setManualCharges(JSON.parse(manualData));
    if (paymentData) setPaymentRecords(JSON.parse(paymentData));

    if (
      savedStatusFilter === "All" ||
      savedStatusFilter === "Pending" ||
      savedStatusFilter === "Paid" ||
      savedStatusFilter === "Overdue"
    ) {
      setStatusFilter(savedStatusFilter);
    }

    if (savedAutoOpenSearch !== null) {
      const parsedAutoOpenSearch = JSON.parse(savedAutoOpenSearch) as boolean;

      setAutoOpenSearch(parsedAutoOpenSearch);
      setIsSearchOpen(parsedAutoOpenSearch);
    } else {
      setAutoOpenSearch(true);
      setIsSearchOpen(true);
    }

    const contractChargeData = null;

    if (contractChargeData) {
      try {
        const parsedContractChargeData = JSON.parse(
          contractChargeData,
        ) as ReceivableFromContractPayload;

        openChargeFromContractPayload(parsedContractChargeData);
        return;
      } catch {
        return;
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("rentix_receivable_status_filter", statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (formLaunchType !== "installment") {
      setInstallmentPreview([]);
      return;
    }

    generateInstallmentPreview();
  }, [
    formLaunchType,
    formAmount,
    formDueDate,
    formIssueDate,
    formInstallmentQuantity,
    formFirstInstallmentAsDownPayment,
  ]);

  function onlyNumbers(value: string) {
    return value.replace(/\D/g, "");
  }

  function formatCpf(value: string) {
    return onlyNumbers(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatCnpj(value: string) {
    return onlyNumbers(value)
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
      .replace(
        /^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/,
        "$1.$2.$3/$4-$5",
      );
  }

  function formatDocument(value: string, personType: PersonType) {
    if (personType === "Company") return formatCnpj(value);

    return formatCpf(value);
  }

  function formatPhone(value: string) {
    const numbers = onlyNumbers(value).slice(0, 11);

    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function formatZipCode(value: string) {
    return onlyNumbers(value)
      .slice(0, 8)
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  async function verifyZipCode() {
    const zipCode = onlyNumbers(tenantFormData.zipCode);

    if (zipCode.length === 0) {
      setZipCodeError("");
      return;
    }

    if (zipCode.length !== 8) {
      setZipCodeError("CEP inválido. Digite 8 números.");
      return;
    }

    try {
      setIsZipCodeLoading(true);
      setZipCodeError("");

      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const data = await response.json();

      if (data.erro) {
        setZipCodeError("CEP não encontrado.");
        return;
      }

      setTenantFormData((currentData) => ({
        ...currentData,
        zipCode: formatZipCode(zipCode),
        state: data.uf || currentData.state,
        city: data.localidade || currentData.city,
        street: data.logradouro || currentData.street,
        district: data.bairro || currentData.district,
        complement: currentData.complement,
      }));
    } catch {
      setZipCodeError("Não foi possível consultar o CEP agora.");
    } finally {
      setIsZipCodeLoading(false);
    }
  }

  function normalizeAmount(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
      const normalizedValue = value
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim();

      const parsedValue = Number(normalizedValue);

      return Number.isFinite(parsedValue) ? parsedValue : 0;
    }

    return 0;
  }

  function getContractAmount(contract: Contract) {
    return normalizeAmount(
      contract.value ??
        contract.amount ??
        contract.rentValue ??
        contract.monthlyValue ??
        0,
    );
  }

  const automaticCharges = useMemo<Charge[]>(() => {
    const today = new Date();
    const manualContractIds = new Set(
      manualCharges
        .map((charge) => String(charge.contractId || ""))
        .filter(Boolean),
    );

    return contracts
      .filter((contract) => contract.status === "Active")
      .filter((contract) => !manualContractIds.has(String(contract.id)))
      .map((contract) => {
        const property = properties.find(
          (item) => item.id === contract.propertyId,
        );

        const tenant = tenants.find((item) => item.id === contract.tenantId);

        const dueDate = new Date();
        dueDate.setDate(new Date(contract.startDate).getDate());

        const id = `${contract.id}-${dueDate.toISOString()}`;
        const isPaid = paid.includes(id);

        let status: Charge["status"] = "Pending";

        if (isPaid) {
          status = "Paid";
        } else if (dueDate < today) {
          status = "Overdue";
        }

        return {
          id,
          property: property?.name || "Imóvel",
          tenant: tenant?.name || "Inquilino",
          dueDate: dueDate.toISOString(),
          amount: getContractAmount(contract),
          status,
        };
      });
  }, [contracts, properties, tenants, paid, manualCharges]);

  const manualChargesWithStatus = useMemo<Charge[]>(() => {
    const today = new Date();

    return manualCharges.map((charge) => {
      let status: Charge["status"] = "Pending";

      if (paid.includes(charge.id)) {
        status = "Paid";
      } else if (new Date(charge.dueDate) < today) {
        status = "Overdue";
      }

      return {
        ...charge,
        status,
      };
    });
  }, [manualCharges, paid]);

  const charges = useMemo<Charge[]>(() => {
    const manualChargeIds = new Set(
      manualChargesWithStatus.map((charge) => String(charge.id)),
    );

    const automaticChargesWithoutManualAdjustments = automaticCharges.filter(
      (charge) => !manualChargeIds.has(String(charge.id)),
    );

    return [
      ...automaticChargesWithoutManualAdjustments,
      ...manualChargesWithStatus,
    ];
  }, [automaticCharges, manualChargesWithStatus]);

  function convertChargeToReceivableStorage(charge: Charge) {
    const tenant = tenants.find(
      (item) => item.name.toLowerCase() === charge.tenant.toLowerCase(),
    );
    const property = properties.find(
      (item) => item.name.toLowerCase() === charge.property.toLowerCase(),
    );
    const paymentRecord = getChargePayment(charge.id);

    return {
      id: charge.id,
      contractId: charge.contractId ? String(charge.contractId) : "",
      installmentNumber: charge.installmentNumber || 1,
      propertyId: property ? String(property.id) : "",
      propertyName: charge.property,
      tenantId: tenant ? String(tenant.id) : "",
      tenantName: charge.tenant,
      dueDate: getDateInputValue(charge.dueDate),
      amount: charge.amount,
      status: charge.status,
      paymentDate: paymentRecord?.paidAt ? getDateInputValue(paymentRecord.paidAt) : null,
      createdAt: charge.issueDate || new Date().toISOString(),
      canceledAt: null,
      source: charge.isDownPayment ? "AccountsReceivableDownPayment" : "AccountsReceivable",
      isDownPayment: Boolean(charge.isDownPayment),
    };
  }

  useEffect(() => {
    window.dispatchEvent(new Event("rentix-receivables-updated"));
    window.dispatchEvent(new Event("rentix-accounts-receivable-updated"));
    window.dispatchEvent(new Event("rentix-financial-updated"));
  }, [charges, paymentRecords]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (selectedTenant) {
      result = result.filter(
        (charge) =>
          charge.tenant.toLowerCase() === selectedTenant.name.toLowerCase(),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((charge) => charge.status === statusFilter);
    }

    return result;
  }, [charges, selectedTenant, statusFilter]);

  const totalReceivable = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status !== "Paid")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const totalPaid = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
  }, [filteredCharges, paymentRecords]);

  const totalOverdue = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + charge.amount, 0);
  }, [filteredCharges]);

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tenants, search]);

  const isEditingPaidCharge = editingChargeId
    ? paid.includes(editingChargeId)
    : false;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number.isFinite(value) ? value : 0);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR");
  }

  function getStatusLabel(status: Charge["status"]) {
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Pendente";
  }

  function getStatusClassName(status: Charge["status"]) {
    if (status === "Paid") {
      return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-900/60";
    }

    if (status === "Overdue") {
      return "bg-red-50 dark:bg-red-950/30 text-red-700 ring-1 ring-red-200";
    }

    return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 ring-1 ring-amber-200";
  }

  function getStatusFilterLabel(status: StatusFilter) {
    if (status === "Pending") return "Pendente";
    if (status === "Paid") return "Pago";
    if (status === "Overdue") return "Vencido";

    return "Todos";
  }

  function getReportDueFilterLabel(filter: ReportDueFilter) {
    if (filter === "Overdue") return "Vencidas";
    if (filter === "DueToday") return "Vencendo hoje";
    if (filter === "Upcoming") return "A vencer";
    if (filter === "DateRange") return "Por período";

    return "Todos os vencimentos";
  }

  function getLocalDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addDaysToDate(dateValue: string, days: number) {
    const date = new Date(`${dateValue}T00:00:00`);
    date.setDate(date.getDate() + days);

    return getLocalDateValue(date);
  }

  function formatAmountInput(value: number) {
    return value.toFixed(2).replace(".", ",");
  }

  function getAmountInCents(value: unknown) {
    return Math.round(normalizeAmount(value) * 100);
  }

  function formatCentsAsAmountInput(valueInCents: number) {
    return formatAmountInput(valueInCents / 100);
  }

  function distributeAmountInCents(totalInCents: number, quantity: number) {
    if (quantity <= 0) return [];

    const normalizedTotalInCents = Math.max(Math.round(totalInCents), 0);
    const baseAmountInCents = Math.floor(normalizedTotalInCents / quantity);
    let centsRemainder = normalizedTotalInCents - baseAmountInCents * quantity;

    return Array.from({ length: quantity }, () => {
      const extraCent = centsRemainder > 0 ? 1 : 0;

      if (centsRemainder > 0) {
        centsRemainder -= 1;
      }

      return baseAmountInCents + extraCent;
    });
  }

  function getInstallmentsTotalInCents(installments: InstallmentPreview[]) {
    return installments.reduce(
      (total, installment) => total + getAmountInCents(installment.amount),
      0,
    );
  }

  function getPaymentMethodLabel(method: PaymentMethod) {
    return (
      paymentMethodOptions.find((option) => option.value === method)?.label ||
      "Outros"
    );
  }

  function calculatePaymentAmount(
    charge: Charge,
    interest: number,
    discount: number,
  ) {
    return Math.max(charge.amount + interest - discount, 0);
  }

  function getPaymentAdjustmentAmountInput(
    charge: Charge,
    value: string,
    mode: PaymentAdjustmentMode,
  ) {
    const normalizedValue = normalizeAmount(value);

    if (normalizedValue <= 0) return "";

    if (mode === "percentage") {
      return formatAmountInput(charge.amount * (normalizedValue / 100));
    }

    return value;
  }

  function updatePaymentInterestInput(
    charge: Charge,
    value: string,
    mode = paymentInterestMode,
  ) {
    const hasInterestValue = normalizeAmount(value) > 0;
    const calculatedInterest = getPaymentAdjustmentAmountInput(charge, value, mode);
    const calculatedDiscount = hasInterestValue
      ? ""
      : getPaymentAdjustmentAmountInput(
          charge,
          paymentDiscountInput,
          paymentDiscountMode,
        );

    setPaymentFormError("");
    setPaymentInterestInput(value);
    setPaymentInterestMode(mode);
    setPaymentInterest(calculatedInterest);

    if (hasInterestValue) {
      setPaymentDiscountInput("");
      setPaymentDiscount("");
    }

    updatePaymentFinalAmountFromAdjustments(
      charge,
      calculatedInterest,
      calculatedDiscount,
    );
  }

  function updatePaymentDiscountInput(
    charge: Charge,
    value: string,
    mode = paymentDiscountMode,
  ) {
    const hasDiscountValue = normalizeAmount(value) > 0;
    const calculatedInterest = hasDiscountValue
      ? ""
      : getPaymentAdjustmentAmountInput(
          charge,
          paymentInterestInput,
          paymentInterestMode,
        );
    const calculatedDiscount = getPaymentAdjustmentAmountInput(charge, value, mode);

    setPaymentFormError("");
    setPaymentDiscountInput(value);
    setPaymentDiscountMode(mode);
    setPaymentDiscount(calculatedDiscount);

    if (hasDiscountValue) {
      setPaymentInterestInput("");
      setPaymentInterest("");
    }

    updatePaymentFinalAmountFromAdjustments(
      charge,
      calculatedInterest,
      calculatedDiscount,
    );
  }

  function changePaymentInterestMode(charge: Charge, mode: PaymentAdjustmentMode) {
    updatePaymentInterestInput(charge, paymentInterestInput, mode);
  }

  function changePaymentDiscountMode(charge: Charge, mode: PaymentAdjustmentMode) {
    updatePaymentDiscountInput(charge, paymentDiscountInput, mode);
  }

  function updatePaymentFinalAmountFromAdjustments(
    charge: Charge,
    interestValue: string,
    discountValue: string,
  ) {
    const interest = normalizeAmount(interestValue);
    const discount = normalizeAmount(discountValue);
    const finalAmount = calculatePaymentAmount(charge, interest, discount);

    const formattedFinalAmount = formatAmountInput(finalAmount);

    setPaymentFinalAmount(formattedFinalAmount);
    updatePaymentEntriesFromFinalAmount(formattedFinalAmount);
  }

  function updatePaymentAdjustmentsFromFinalAmount(
    charge: Charge,
    finalAmountValue: string,
  ) {
    const finalAmount = normalizeAmount(finalAmountValue);
    const difference = finalAmount - charge.amount;

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      setPaymentInterest("");
      setPaymentDiscount("");
      return;
    }

    if (difference > 0) {
      const formattedDifference = formatAmountInput(difference);

      setPaymentInterestMode("amount");
      setPaymentDiscountMode("amount");
      setPaymentInterestInput(formattedDifference);
      setPaymentDiscountInput("");
      setPaymentInterest(formattedDifference);
      setPaymentDiscount("");
      return;
    }

    if (difference < 0) {
      const formattedDifference = formatAmountInput(Math.abs(difference));

      setPaymentInterestMode("amount");
      setPaymentDiscountMode("amount");
      setPaymentInterestInput("");
      setPaymentDiscountInput(formattedDifference);
      setPaymentInterest("");
      setPaymentDiscount(formattedDifference);
      return;
    }

    setPaymentInterestInput("");
    setPaymentDiscountInput("");
    setPaymentInterest("");
    setPaymentDiscount("");
  }


  function applyPaymentInterestPercentage(charge: Charge, percentage: number) {
    updatePaymentInterestInput(charge, formatAmountInput(percentage), "percentage");
  }

  function applyPaymentDiscountPercentage(charge: Charge, percentage: number) {
    updatePaymentDiscountInput(charge, formatAmountInput(percentage), "percentage");
  }

  function clearPaymentInterest(charge: Charge) {
    updatePaymentInterestInput(charge, "", paymentInterestMode);
  }

  function clearPaymentDiscount(charge: Charge) {
    updatePaymentDiscountInput(charge, "", paymentDiscountMode);
  }

  function updatePaymentEntriesFromFinalAmount(finalAmount: string) {
    setPaymentEntries((currentEntries) => {
      if (currentEntries.length !== 1) return currentEntries;

      return currentEntries.map((entry) => ({
        ...entry,
        amount: finalAmount,
      }));
    });
  }

  function addPaymentEntry() {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) => [
      ...currentEntries,
      {
        id: `payment-entry-${Date.now()}`,
        method: "Pix",
        amount: "",
      },
    ]);
  }

  function removePaymentEntry(entryId: string) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.length > 1
        ? currentEntries.filter((entry) => entry.id !== entryId)
        : currentEntries,
    );
  }

  function updatePaymentEntryMethod(entryId: string, method: PaymentMethod) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, method } : entry,
      ),
    );
  }

  function updatePaymentEntryAmount(entryId: string, amount: string) {
    setPaymentFormError("");
    setPaymentEntries((currentEntries) =>
      currentEntries.map((entry) =>
        entry.id === entryId ? { ...entry, amount } : entry,
      ),
    );
  }

  function getPaymentEntriesTotal() {
    return paymentEntries.reduce(
      (total, entry) => total + normalizeAmount(entry.amount),
      0,
    );
  }

  function getPaymentEntriesDifference() {
    return getPaymentEntriesTotal() - normalizeAmount(paymentFinalAmount);
  }

  function getPaymentEntriesBalanceLabel() {
    const difference = getPaymentEntriesDifference();

    if (difference > 0.01) {
      return `Troco: ${formatCurrency(difference)}`;
    }

    if (difference < -0.01) {
      return `Falta informar: ${formatCurrency(Math.abs(difference))}`;
    }

    return "Valores conferidos";
  }

  function getPaymentEntriesBalanceClassName() {
    const difference = getPaymentEntriesDifference();

    if (difference > 0.01) {
      return isBlackTheme
        ? "border-sky-900/60 bg-sky-950/30 text-sky-300"
        : "border-sky-200 bg-sky-50 text-sky-700";
    }

    if (difference < -0.01) {
      return isBlackTheme
        ? "border-amber-900/60 bg-amber-950/30 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";
    }

    return isBlackTheme
      ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  function getReceiptStatusLabel(charge: Charge) {
    const dueDate = getStartOfDay(new Date(charge.dueDate));
    const today = getStartOfDay(new Date());

    if (charge.status === "Overdue" || dueDate < today) return "Vencida";
    if (dueDate.getTime() === today.getTime()) return "Vence hoje";
    if (charge.isDownPayment) return "Entrada";

    return "Em aberto";
  }

  function getReceiptStatusClassName(charge: Charge) {
    const statusLabel = getReceiptStatusLabel(charge);

    if (statusLabel === "Vencida") {
      return isBlackTheme
        ? "border-red-900/60 bg-red-950/40 text-red-300"
        : "border-red-200 bg-red-50 text-red-700";
    }

    if (statusLabel === "Vence hoje") {
      return isBlackTheme
        ? "border-amber-900/60 bg-amber-950/40 text-amber-300"
        : "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (statusLabel === "Entrada") {
      return isBlackTheme
        ? "border-sky-900/60 bg-sky-950/40 text-sky-300"
        : "border-sky-200 bg-sky-50 text-sky-700";
    }

    return isBlackTheme
      ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  function getChargePayment(chargeId: string) {
    return paymentRecords.find(
      (paymentRecord) => String(paymentRecord.chargeId) === String(chargeId),
    );
  }

  function getChargePaidAmount(charge: Charge) {
    return getChargePayment(charge.id)?.amountPaid ?? charge.amount;
  }

  function dispatchFinancialIntegrationEvents() {
    window.dispatchEvent(new Event("rentix-receivables-updated"));
    window.dispatchEvent(new Event("rentix-accounts-receivable-updated"));
    window.dispatchEvent(new Event("rentix-financial-updated"));
  }

  function getDateInputValue(dateValue?: string) {
    if (!dateValue) return "";

    return getLocalDateValue(new Date(dateValue));
  }

  function getStartOfDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    return normalizedDate;
  }

  function getEndOfDay(date: Date) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(23, 59, 59, 999);

    return normalizedDate;
  }

  function openReportModal() {
    setReportTenantId(selectedTenant ? String(selectedTenant.id) : "");
    setReportStatusFilter(statusFilter);
    setReportDueFilter("All");
    setReportStartDate("");
    setReportEndDate("");
    setReportFormError("");
    setIsReportOpen(true);
  }

  function closeReportModal() {
    setIsReportOpen(false);
    setReportFormError("");
  }

  function getReportFilteredCharges() {
    const today = getStartOfDay(new Date());
    const startDate = reportStartDate
      ? getStartOfDay(new Date(`${reportStartDate}T00:00:00`))
      : null;
    const endDate = reportEndDate
      ? getEndOfDay(new Date(`${reportEndDate}T00:00:00`))
      : null;
    const selectedReportTenant = tenants.find(
      (tenant) => String(tenant.id) === String(reportTenantId),
    );

    return charges.filter((charge) => {
      const dueDate = getStartOfDay(new Date(charge.dueDate));

      if (
        selectedReportTenant &&
        charge.tenant.toLowerCase() !== selectedReportTenant.name.toLowerCase()
      ) {
        return false;
      }

      if (reportStatusFilter !== "All" && charge.status !== reportStatusFilter) {
        return false;
      }

      if (reportDueFilter === "Overdue" && charge.status !== "Overdue") {
        return false;
      }

      if (reportDueFilter === "DueToday" && dueDate.getTime() !== today.getTime()) {
        return false;
      }

      if (
        reportDueFilter === "Upcoming" &&
        (dueDate < today || charge.status === "Paid")
      ) {
        return false;
      }

      if (reportDueFilter === "DateRange") {
        if (startDate && dueDate < startDate) return false;
        if (endDate && dueDate > endDate) return false;
      }

      return true;
    });
  }

  function getReportTotalAmount(reportCharges: Charge[]) {
    return reportCharges.reduce(
      (total, charge) =>
        total +
        (charge.status === "Paid" ? getChargePaidAmount(charge) : charge.amount),
      0,
    );
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function getCompanySettingsForCarnet() {
    const defaultCompanySettings = {
      companyName: "Rentix",
      tradeName: "Rentix",
      document: "",
      phone: "",
      email: "",
      city: "",
      pixKeyType: "",
      pixKey: "",
    };

    try {
      const cachedCompanySettings = getCachedCompanySettings();

      if (!cachedCompanySettings) {
        return defaultCompanySettings;
      }

      return {
        ...defaultCompanySettings,
        ...cachedCompanySettings,
      };
    } catch {
      return defaultCompanySettings;
    }
  }

  function getPaymentBookletInstructions() {
    const defaultInstructions = [
      "1. Efetue o pagamento até a data de vencimento.",
      "2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.",
      "3. Guarde este comprovante para controle financeiro.",
    ].join("\n");

    try {
      const parsedPrintTemplates = getCachedPrintTemplates() as {
        paymentBooklet?: { content?: string };
      } | null;

      if (!parsedPrintTemplates) {
        return defaultInstructions;
      }

      const templateContent = parsedPrintTemplates.paymentBooklet?.content || "";

      return normalizePaymentBookletInstructions(templateContent) || defaultInstructions;
    } catch {
      return defaultInstructions;
    }
  }

  function normalizePaymentBookletInstructions(content: string) {
    const cleanContent = String(content || "").trim();

    if (!cleanContent) {
      return "";
    }

    if (!cleanContent.includes("INSTRUÇÕES:")) {
      return cleanContent;
    }

    const instructionsSection = cleanContent.split("INSTRUÇÕES:")[1] || "";

    return instructionsSection
      .split("GERADO EM:")[0]
      .trim();
  }

  function renderPaymentBookletInstructions(instructions: string) {
    const instructionRows = instructions
      .split("\n")
      .map((instruction) => instruction.trim())
      .filter(Boolean)
      .map((instruction) => `<p>${escapeHtml(instruction)}</p>`)
      .join("");

    if (!instructionRows) {
      return "";
    }

    return `<div class="instructions"><span>Instruções</span>${instructionRows}</div>`;
  }

  function removeTextAccents(value: string) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function sanitizePixText(value: string, maxLength: number) {
    return removeTextAccents(value)
      .replace(/[^a-zA-Z0-9 $%*+\-.\/]/g, "")
      .trim()
      .slice(0, maxLength);
  }

  function formatEmvField(id: string, value: string) {
    const length = String(value.length).padStart(2, "0");

    return `${id}${length}${value}`;
  }

  function calculatePixCrc16(payload: string) {
    let crc = 0xffff;

    for (let index = 0; index < payload.length; index += 1) {
      crc ^= payload.charCodeAt(index) << 8;

      for (let bit = 0; bit < 8; bit += 1) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }

        crc &= 0xffff;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function generatePixPayload(params: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    txId: string;
    description: string;
  }) {
    const pixKey = params.pixKey.trim();

    if (!pixKey) {
      return "";
    }

    const merchantAccountInfo =
      formatEmvField("00", "br.gov.bcb.pix") +
      formatEmvField("01", pixKey) +
      formatEmvField("02", sanitizePixText(params.description, 72));

    const additionalDataField = formatEmvField(
      "05",
      sanitizePixText(params.txId || "RENTIX", 25),
    );

    const amount = Number(params.amount || 0).toFixed(2);
    const payloadWithoutCrc =
      formatEmvField("00", "01") +
      formatEmvField("26", merchantAccountInfo) +
      formatEmvField("52", "0000") +
      formatEmvField("53", "986") +
      formatEmvField("54", amount) +
      formatEmvField("58", "BR") +
      formatEmvField("59", sanitizePixText(params.merchantName || "RENTIX", 25)) +
      formatEmvField("60", sanitizePixText(params.merchantCity || "BRASIL", 15)) +
      formatEmvField("62", additionalDataField) +
      "6304";

    return `${payloadWithoutCrc}${calculatePixCrc16(payloadWithoutCrc)}`;
  }

  function getPixQrCodeUrl(pixPayload: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(
      pixPayload,
    )}`;
  }

  function generatePaymentCarnet(carnetCharges: Charge[]) {
    if (carnetCharges.length === 0) return;

    const printWindow = window.open(
      "",
      "_blank",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
    );

    if (!printWindow) {
      setChargeFormError(
        "As parcelas foram salvas, mas não foi possível abrir o carnê. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    const companySettings = getCompanySettingsForCarnet();
    const companyName =
      companySettings.tradeName || companySettings.companyName || "Rentix";
    const companyDocument = companySettings.document || "Não informado";
    const companyPhone = companySettings.phone || "Não informado";
    const companyEmail = companySettings.email || "Não informado";
    const pixKeyType = companySettings.pixKeyType || "Pix";
    const pixKey = companySettings.pixKey || "Não cadastrada";
    const firstCharge = carnetCharges[0];
    const paymentBookletInstructions = getPaymentBookletInstructions();
    const totalAmount = carnetCharges.reduce(
      (total, charge) => total + charge.amount,
      0,
    );

    const rows = carnetCharges
      .map(
        (charge) => `
          <tr>
            <td>${charge.installmentNumber || 1}/${charge.installmentTotal || carnetCharges.length}</td>
            <td>${escapeHtml(charge.tenant)}</td>
            <td>${escapeHtml(charge.property)}</td>
            <td>${formatDate(charge.dueDate)}</td>
            <td>${formatCurrency(charge.amount)}</td>
          </tr>
        `,
      )
      .join("");

    const vouchers = carnetCharges
      .map((charge) => {
        const installmentLabel = `${charge.installmentNumber || 1}/${
          charge.installmentTotal || carnetCharges.length
        }`;
        const pixPayload = generatePixPayload({
          pixKey: companySettings.pixKey || "",
          merchantName: companyName,
          merchantCity: companySettings.city || "Brasil",
          amount: charge.amount,
          txId: `RX${String(charge.installmentGroupId || charge.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-18)}${String(charge.installmentNumber || 1).padStart(2, "0")}`,
          description: `Aluguel ${installmentLabel} ${charge.tenant}`,
        });
        const pixQrCodeUrl = pixPayload ? getPixQrCodeUrl(pixPayload) : "";

        return `
          <section class="voucher">
            <div class="voucher-header">
              <div>
                <div class="brand">${escapeHtml(companyName)}</div>
                <h2>Carnê de pagamento</h2>
              </div>
              <div class="installment-badge">
                Parcela ${installmentLabel}
              </div>
            </div>

            <div class="voucher-grid">
              <div class="field full">
                <span>Inquilino/Pessoa</span>
                <strong>${escapeHtml(charge.tenant)}</strong>
              </div>

              <div class="field full">
                <span>Imóvel</span>
                <strong>${escapeHtml(charge.property)}</strong>
              </div>

              <div class="field">
                <span>Vencimento</span>
                <strong>${formatDate(charge.dueDate)}</strong>
              </div>

              <div class="field">
                <span>Valor</span>
                <strong>${formatCurrency(charge.amount)}</strong>
              </div>
            </div>

            <div class="pix-area">
              <div class="pix-info">
                <span>Pagamento via Pix</span>
                <strong>${escapeHtml(pixKey)}</strong>
                <small>Tipo da chave: ${escapeHtml(pixKeyType || "Não informado")}</small>
                ${
                  pixPayload
                    ? `<div class="pix-copy"><span>Pix copia e cola</span><p>${escapeHtml(pixPayload)}</p></div>`
                    : `<div class="pix-warning">Cadastre a chave Pix da empresa para gerar o QR Code automático.</div>`
                }
              </div>
              ${
                pixQrCodeUrl
                  ? `<div class="pix-qr"><img src="${pixQrCodeUrl}" alt="QR Code Pix" /><span>QR Code Pix</span></div>`
                  : ""
              }
            </div>

            ${renderPaymentBookletInstructions(paymentBookletInstructions)}

            <div class="voucher-footer">
              <span>${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)}</span>
              <span>Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}</span>
            </div>
          </section>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Carnê de Pagamento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #f1f5f9; color: #0f172a; font-family: Arial, sans-serif; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px); }
            .toolbar button { border: 0; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 800; cursor: pointer; }
            .print-button { background: #059669; color: #ffffff; }
            .close-button { background: #e2e8f0; color: #0f172a; }
            @page { size: A4; margin: 10mm; }
            .page { width: min(1240px, calc(100% - 40px)); margin: 24px auto; }
            .voucher-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
            .summary { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 18px; background: #ffffff; padding: 24px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.10); }
            .summary-header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; }
            .brand { color: #ea580c; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
            h1, h2 { margin: 6px 0 0; }
            .summary-meta { color: #64748b; font-size: 12px; line-height: 1.7; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #fff7ed; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
            th, td { border: 1px solid #e2e8f0; padding: 9px; font-size: 12px; text-align: left; }
            .voucher { break-inside: avoid; page-break-inside: avoid; border: 1px dashed #94a3b8; border-radius: 18px; background: #ffffff; padding: 18px; min-height: 318px; }
            .voucher-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
            .installment-badge { border-radius: 999px; background: #ecfdf5; color: #047857; padding: 8px 12px; font-size: 12px; font-weight: 900; white-space: nowrap; }
            .voucher-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 14px; }
            .field { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; background: #f8fafc; }
            .field.full { grid-column: 1 / -1; }
            .field span { display: block; color: #64748b; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .field strong { display: block; margin-top: 5px; font-size: 14px; }
            .field small { display: block; margin-top: 5px; color: #64748b; font-size: 11px; font-weight: 700; }
            .pix-area { display: grid; grid-template-columns: minmax(0, 1fr) 132px; gap: 12px; margin-top: 12px; border: 1px solid #a7f3d0; border-radius: 14px; background: #ecfdf5; padding: 12px; }
            .pix-info span, .pix-copy span { display: block; color: #047857; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .pix-info strong { display: block; margin-top: 5px; color: #0f172a; font-size: 14px; }
            .pix-info small { display: block; margin-top: 4px; color: #475569; font-size: 11px; font-weight: 700; }
            .pix-copy { margin-top: 8px; border-radius: 10px; background: #ffffff; padding: 8px; border: 1px dashed #6ee7b7; }
            .pix-copy p { margin: 5px 0 0; color: #0f172a; font-size: 8px; line-height: 1.35; word-break: break-all; }
            .pix-warning { margin-top: 8px; border-radius: 10px; background: #fff7ed; color: #c2410c; padding: 8px; font-size: 11px; font-weight: 800; }
            .pix-qr { display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 12px; background: #ffffff; padding: 8px; border: 1px solid #d1fae5; }
            .pix-qr img { width: 112px; height: 112px; object-fit: contain; }
            .pix-qr span { margin-top: 5px; color: #047857; font-size: 10px; font-weight: 900; }
            .instructions { margin-top: 12px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff7ed; padding: 10px 12px; }
            .instructions span { display: block; margin-bottom: 6px; color: #c2410c; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
            .instructions p { margin: 3px 0; color: #334155; font-size: 10px; line-height: 1.35; font-weight: 700; }
            .voucher-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 12px; color: #64748b; font-size: 10px; font-weight: 700; }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none !important; }
              .page { width: 100%; margin: 0; padding: 0; }
              .summary { box-shadow: none; border-radius: 0; }
              .voucher { margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" onclick="window.print()">Imprimir carnê</button>
            <button class="close-button" type="button" onclick="window.close()">Fechar</button>
          </div>

          <main class="page">
            <section class="summary">
              <div class="summary-header">
                <div>
                  <div class="brand">${escapeHtml(companyName)} · Financeiro</div>
                  <h1>Carnê de Pagamento</h1>
                  <p>Inquilino: <strong>${escapeHtml(firstCharge.tenant)}</strong></p>
                  <p>Imóvel: <strong>${escapeHtml(firstCharge.property)}</strong></p>
                </div>
                <div class="summary-meta">
                  Parcelas: <strong>${carnetCharges.length}</strong><br />
                  Total: <strong>${formatCurrency(totalAmount)}</strong><br />
                  Gerado em: <strong>${new Date().toLocaleString("pt-BR")}</strong>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Inquilino</th>
                    <th>Imóvel</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>

            <div class="voucher-list">
              ${vouchers}
            </div>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              try {
                window.moveTo(0, 0);
                window.resizeTo(screen.availWidth, screen.availHeight);
              } catch (error) {}
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    try {
      printWindow.moveTo(0, 0);
      printWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
    } catch {}
  }

  function openAccountsReceivableReport(shouldPrint: boolean) {
    setReportFormError("");

    if (reportDueFilter === "DateRange" && !reportStartDate && !reportEndDate) {
      setReportFormError(
        "Informe ao menos uma data inicial ou final para gerar relatório por período.",
      );
      return;
    }

    if (reportStartDate && reportEndDate && reportStartDate > reportEndDate) {
      setReportFormError("A data inicial não pode ser maior que a data final.");
      return;
    }

    const reportCharges = getReportFilteredCharges();

    if (reportCharges.length === 0) {
      setReportFormError("Nenhuma conta encontrada para os filtros informados.");
      return;
    }

    const selectedReportTenant = tenants.find(
      (tenant) => String(tenant.id) === String(reportTenantId),
    );
    const pendingTotal = reportCharges
      .filter((charge) => charge.status === "Pending")
      .reduce((total, charge) => total + charge.amount, 0);
    const paidTotal = reportCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
    const overdueTotal = reportCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + charge.amount, 0);
    const grandTotal = getReportTotalAmount(reportCharges);

    const filterSummary = [
      `Pessoa: ${selectedReportTenant?.name || "Todas"}`,
      `Status: ${getStatusFilterLabel(reportStatusFilter)}`,
      `Vencimento: ${getReportDueFilterLabel(reportDueFilter)}`,
      reportDueFilter === "DateRange" && reportStartDate
        ? `De: ${formatDate(`${reportStartDate}T00:00:00`)}`
        : "",
      reportDueFilter === "DateRange" && reportEndDate
        ? `Até: ${formatDate(`${reportEndDate}T00:00:00`)}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const rows = reportCharges
      .map((charge) => {
        const payment = getChargePayment(charge.id);
        const amount =
          charge.status === "Paid" ? getChargePaidAmount(charge) : charge.amount;
        const paymentMethods = payment?.paymentItems?.length
          ? payment.paymentItems
              .map(
                (item) =>
                  `${getPaymentMethodLabel(item.method)} (${formatCurrency(item.amount)})`,
              )
              .join(", ")
          : payment
            ? getPaymentMethodLabel(payment.method)
            : "-";

        return `
          <tr>
            <td>${escapeHtml(charge.property)}</td>
            <td>${escapeHtml(charge.tenant)}</td>
            <td>${formatDate(charge.dueDate)}</td>
            <td>${formatCurrency(amount)}</td>
            <td>${getStatusLabel(charge.status)}</td>
            <td>${payment?.paidAt ? formatDate(payment.paidAt) : "-"}</td>
            <td>${escapeHtml(paymentMethods)}</td>
          </tr>
        `;
      })
      .join("");

    const reportWindow = window.open("", "_blank", "width=1200,height=800");

    if (!reportWindow) {
      setReportFormError(
        "Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    reportWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Contas a Receber</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #f1f5f9; }
            .report-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px); }
            .toolbar-button { border: 0; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 800; cursor: pointer; transition: 0.2s ease; }
            .toolbar-button.print { background: #059669; color: #ffffff; box-shadow: 0 8px 18px rgba(5, 150, 105, 0.2); }
            .toolbar-button.print:hover { background: #047857; }
            .toolbar-button.close { background: #e2e8f0; color: #0f172a; }
            .toolbar-button.close:hover { background: #cbd5e1; }
            .report-page { width: min(1180px, calc(100% - 48px)); margin: 28px auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12); }
            .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; }
            .brand { font-size: 13px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.08em; }
            h1 { margin: 6px 0 0; font-size: 26px; }
            .meta { margin-top: 8px; font-size: 12px; color: #64748b; line-height: 1.6; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #f8fafc; }
            .card span { display: block; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .card strong { display: block; margin-top: 6px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #fff7ed; color: #0f172a; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
            th, td { border: 1px solid #e2e8f0; padding: 9px; font-size: 12px; vertical-align: top; }
            tr:nth-child(even) td { background: #f8fafc; }
            .footer { margin-top: 24px; font-size: 11px; color: #64748b; text-align: center; }
            @media print {
              body { margin: 0; background: #ffffff; }
              .no-print { display: none !important; }
              .report-page { width: 100%; margin: 0; padding: 18px; border: 0; border-radius: 0; box-shadow: none; }
              .summary { grid-template-columns: repeat(4, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="report-toolbar no-print">
            <button class="toolbar-button print" type="button" onclick="window.print()">Imprimir</button>
            <button class="toolbar-button close" type="button" onclick="window.close()">Fechar relatório</button>
          </div>

          <main class="report-page">
          <div class="header">
            <div>
              <div class="brand">Rentix · Financeiro</div>
              <h1>Relatório de Contas a Receber</h1>
              <div class="meta">${escapeHtml(filterSummary)}</div>
            </div>
            <div class="meta">
              Gerado em:<br />
              <strong>${new Date().toLocaleString("pt-BR")}</strong>
            </div>
          </div>

          <div class="summary">
            <div class="card"><span>Quantidade</span><strong>${reportCharges.length}</strong></div>
            <div class="card"><span>Total geral</span><strong>${formatCurrency(grandTotal)}</strong></div>
            <div class="card"><span>Total pago</span><strong>${formatCurrency(paidTotal)}</strong></div>
            <div class="card"><span>Total vencido</span><strong>${formatCurrency(overdueTotal)}</strong></div>
          </div>

          <div class="summary">
            <div class="card"><span>Total pendente</span><strong>${formatCurrency(pendingTotal)}</strong></div>
            <div class="card"><span>Status</span><strong>${getStatusFilterLabel(reportStatusFilter)}</strong></div>
            <div class="card"><span>Vencimento</span><strong>${getReportDueFilterLabel(reportDueFilter)}</strong></div>
            <div class="card"><span>Pessoa</span><strong>${escapeHtml(selectedReportTenant?.name || "Todas")}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Imóvel</th>
                <th>Inquilino/Pessoa</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Forma de pagamento</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="footer">Relatório gerado pelo módulo Contas a Receber do Rentix.</div>
          </main>
          ${
            shouldPrint
              ? `<script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>`
              : ""
          }
        </body>
      </html>
    `);
    reportWindow.document.close();
  }

  function viewAccountsReceivableReport() {
    openAccountsReceivableReport(false);
  }

  function generateAccountsReceivablePdf() {
    openAccountsReceivableReport(true);
  }

  function openCreateModal() {
    const today = new Date();
    const dueDate = new Date();

    dueDate.setDate(today.getDate() + 30);

    setFormIssueDate(getLocalDateValue(today));
    setFormDueDate(getLocalDateValue(dueDate));
    setFormPaymentDate("");
    setFormContractId("");
    setFormLaunchType("single");
    setFormFirstInstallmentAsDownPayment(false);
    setEditingChargeId(null);
    setChargeFormError("");
    setIsCreateOpen(true);
  }

  function openEditCharge(charge: Charge) {
    const tenant = tenants.find(
      (item) => item.name.toLowerCase() === charge.tenant.toLowerCase(),
    );
    const property = properties.find(
      (item) => item.name.toLowerCase() === charge.property.toLowerCase(),
    );

    const paymentRecord = getChargePayment(charge.id);

    setEditingChargeId(charge.id);
    setFormContractId(String(charge.contractId || ""));
    setFormTenant(tenant ? String(tenant.id) : "");
    setFormProperty(property ? String(property.id) : "");
    setFormAmount(formatAmountInput(charge.amount));
    setFormIssueDate(
      getDateInputValue(charge.issueDate) || getLocalDateValue(new Date()),
    );
    setFormDueDate(getDateInputValue(charge.dueDate));
    setFormPaymentDate(
      paymentRecord?.paidAt
        ? getDateInputValue(paymentRecord.paidAt)
        : getLocalDateValue(new Date()),
    );
    setFormLaunchType("single");
    setFormFirstInstallmentAsDownPayment(false);
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setChargeFormError("");
    setIsCreateOpen(true);
  }

  function openReceivePaymentModal(charge: Charge) {
    setChargePendingPaymentReceipt(charge);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentInterestInput("");
    setPaymentDiscountInput("");
    setPaymentInterestMode("amount");
    setPaymentDiscountMode("amount");
    setPaymentFinalAmount(formatAmountInput(charge.amount));
    setPaymentMethod("Cash");
    setPaymentEntries([
      {
        id: `payment-entry-${Date.now()}`,
        method: "Cash",
        amount: formatAmountInput(charge.amount),
      },
    ]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function closeReceivePaymentModal() {
    setChargePendingPaymentReceipt(null);
    setIsPaymentConfirmationOpen(false);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentInterestInput("");
    setPaymentDiscountInput("");
    setPaymentInterestMode("amount");
    setPaymentDiscountMode("amount");
    setPaymentFinalAmount("");
    setPaymentMethod("Cash");
    setPaymentEntries([]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function confirmReceivePayment() {
    if (!chargePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);
    const paymentEntriesTotal = getPaymentEntriesTotal();

    if (interest < 0 || discount < 0) {
      setPaymentFormError(
        "Informe juros e desconto com valores válidos para receber a cobrança.",
      );
      return;
    }

    if (amountPaid <= 0) {
      setPaymentFormError("O valor final recebido precisa ser maior que zero.");
      return;
    }

    if (paymentEntries.length === 0) {
      setPaymentFormError("Informe ao menos uma forma de pagamento.");
      return;
    }

    const hasInvalidPaymentEntry = paymentEntries.some(
      (entry) => normalizeAmount(entry.amount) <= 0,
    );

    if (hasInvalidPaymentEntry) {
      setPaymentFormError(
        "Informe valores válidos em todas as formas de pagamento.",
      );
      return;
    }

    if (paymentEntriesTotal + 0.01 < amountPaid) {
      setPaymentFormError(
        `Falta informar ${formatCurrency(amountPaid - paymentEntriesTotal)} nas formas de pagamento.`,
      );
      return;
    }

    setPaymentFormError("");
    setIsPaymentConfirmationOpen(true);
  }

  function closePaymentConfirmation() {
    setIsPaymentConfirmationOpen(false);
  }

  async function finishReceivePayment() {
    if (!chargePendingPaymentReceipt) return;

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);

    const updatedPaid = paid.includes(chargePendingPaymentReceipt.id)
      ? paid
      : [...paid, chargePendingPaymentReceipt.id];

    const paymentRecord: ChargePayment = {
      chargeId: chargePendingPaymentReceipt.id,
      paidAt: new Date().toISOString(),
      method: paymentEntries[0]?.method || paymentMethod,
      paymentItems: paymentEntries.map((entry) => ({
        id: entry.id,
        method: entry.method,
        amount: normalizeAmount(entry.amount),
      })),
      interest,
      discount,
      amountPaid,
      note: paymentNote.trim(),
    };

    const updatedPaymentRecords = [
      ...paymentRecords.filter(
        (currentPaymentRecord) =>
          String(currentPaymentRecord.chargeId) !==
          String(chargePendingPaymentReceipt.id),
      ),
      paymentRecord,
    ];

    if (companyId) {
      try {
        await receiveAccount(chargePendingPaymentReceipt.id, {
          paidAt: paymentRecord.paidAt,
          method: mapUiPaymentMethodToApi(paymentRecord.method),
          paymentItems: mapUiPaymentItemsToApi(paymentRecord.paymentItems || []),
          interest,
          discount,
          amountPaid,
          note: paymentRecord.note,
        });
      } catch (error) {
        setPaymentFormError(
          error instanceof Error
            ? error.message
            : "NÃ£o foi possÃ­vel registrar o recebimento no backend.",
        );
        return;
      }
    }

    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    generatePaymentReceipt(chargePendingPaymentReceipt, paymentRecord);
    closeReceivePaymentModal();
  }

  function clearTenantFilter() {
    setSelectedTenant(null);
    setSearch("");
    setIsSearchOpen(false);
  }

  function clearAllFilters() {
    setSelectedTenant(null);
    setSearch("");
    setStatusFilter("All");
  }

  function resetCreateForm() {
    setFormTenant("");
    setFormContractId("");
    setFormProperty("");
    setFormAmount("");
    setFormIssueDate("");
    setFormDueDate("");
    setFormPaymentDate("");
    setFormLaunchType("single");
    setFormFirstInstallmentAsDownPayment(false);
    setFormInstallmentQuantity("2");
    setInstallmentPreview([]);
    setChargeFormError("");
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsZipCodeLoading(false);
    setIsTenantCreateOpen(false);
  }

  function closeCreateModal() {
    resetCreateForm();
    setEditingChargeId(null);
    setIsCreateOpen(false);
  }

  function openDeleteChargeConfirmation() {
    if (!editingChargeId) return;

    const charge = manualCharges.find(
      (item) => String(item.id) === String(editingChargeId),
    );

    if (!charge) {
      setChargeFormError(
        "Esta cobrança não pode ser excluída porque foi gerada automaticamente por contrato.",
      );
      return;
    }

    if (charge.contractId) {
      setChargeFormError(
        "Esta parcela pertence a um contrato e não pode ser excluída individualmente. Exclua ou cancele o contrato para remover as parcelas vinculadas.",
      );
      return;
    }

    setChargePendingDeletion(charge);
  }

  function closeDeleteChargeConfirmation() {
    setChargePendingDeletion(null);
  }

  function openPaymentReversalConfirmation() {
    if (!editingChargeId) return;

    const charge = charges.find(
      (item) => String(item.id) === String(editingChargeId),
    );

    if (!charge || !paid.includes(charge.id)) {
      setChargeFormError(
        "Esta cobrança não está marcada como paga para voltar para pagamento.",
      );
      return;
    }

    setChargePendingPaymentReversal(charge);
  }

  function closePaymentReversalConfirmation() {
    setChargePendingPaymentReversal(null);
  }

  async function confirmPaymentReversal() {
    if (!chargePendingPaymentReversal) return;

    if (companyId) {
      try {
        await reverseReceivedAccount(chargePendingPaymentReversal.id);
      } catch (error) {
        setChargeFormError(
          error instanceof Error
            ? error.message
            : "NÃ£o foi possÃ­vel estornar o recebimento no backend.",
        );
        setChargePendingPaymentReversal(null);
        return;
      }
    }

    const updatedPaid = paid.filter(
      (paidChargeId) =>
        String(paidChargeId) !== String(chargePendingPaymentReversal.id),
    );

    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.chargeId) !==
        String(chargePendingPaymentReversal.id),
    );

    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    setChargePendingPaymentReversal(null);
    closeCreateModal();
  }

  async function confirmDeleteCharge() {
    if (!chargePendingDeletion) return;

    if (companyId) {
      try {
        await deleteReceivableAccount(chargePendingDeletion.id);
      } catch (error) {
        setChargeFormError(
          error instanceof Error
            ? error.message
            : "NÃ£o foi possÃ­vel excluir a cobranÃ§a no backend.",
        );
        setChargePendingDeletion(null);
        return;
      }
    }

    const updatedManualCharges = manualCharges.filter(
      (charge) => String(charge.id) !== String(chargePendingDeletion.id),
    );
    const updatedPaid = paid.filter(
      (paidChargeId) =>
        String(paidChargeId) !== String(chargePendingDeletion.id),
    );
    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) =>
        String(paymentRecord.chargeId) !== String(chargePendingDeletion.id),
    );

    setManualCharges(updatedManualCharges);
    setPaid(updatedPaid);
    setPaymentRecords(updatedPaymentRecords);
    setChargePendingDeletion(null);
    closeCreateModal();
  }

  function openTenantCreateModal() {
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsTenantCreateOpen(true);
  }

  function closeTenantCreateModal() {
    setTenantFormData(initialTenantFormData);
    setZipCodeError("");
    setCnpjSearchError("");
    setIsCnpjLoading(false);
    setIsTenantCreateOpen(false);
  }

  function updateTenantFormData<K extends keyof TenantFormData>(
    field: K,
    value: TenantFormData[K],
  ) {
    setTenantFormData((currentData) => ({
      ...currentData,
      [field]: value,
    }));
  }

  function updateTenantPersonType(personType: PersonType) {
    setTenantFormData((currentData) => ({
      ...currentData,
      personType,
      cpf: "",
    }));
    setZipCodeError("");
    setCnpjSearchError("");
  }

  async function searchCompanyByCnpj() {
    const cleanCnpj = onlyNumbers(tenantFormData.cpf);

    if (tenantFormData.personType !== "Company") return;

    if (cleanCnpj.length !== 14) {
      setCnpjSearchError("Informe um CNPJ com 14 números para buscar os dados.");
      return;
    }

    if (!isValidCnpj(cleanCnpj)) {
      setCnpjSearchError("CNPJ inválido. Verifique o número informado.");
      return;
    }

    try {
      setIsCnpjLoading(true);
      setCnpjSearchError("");

      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
      );

      if (!response.ok) {
        setCnpjSearchError("Empresa não encontrada para o CNPJ informado.");
        return;
      }

      const data = (await response.json()) as BrasilApiCnpjResponse;

      setTenantFormData((currentData) => ({
        ...currentData,
        name:
          data.razao_social?.trim() ||
          data.nome_fantasia?.trim() ||
          currentData.name,
        cpf: formatCnpj(data.cnpj || cleanCnpj),
        phone: data.ddd_telefone_1
          ? formatPhone(data.ddd_telefone_1)
          : currentData.phone,
        zipCode: data.cep ? formatZipCode(data.cep) : currentData.zipCode,
        state: data.uf || currentData.state,
        city: data.municipio || currentData.city,
        street: data.logradouro || currentData.street,
        number: data.numero || currentData.number,
        district: data.bairro || currentData.district,
        complement: data.complemento || currentData.complement,
      }));
    } catch {
      setCnpjSearchError("Não foi possível consultar o CNPJ no momento.");
    } finally {
      setIsCnpjLoading(false);
    }
  }

  async function createTenantFromModal() {
    const trimmedTenantName = tenantFormData.name.trim();

    if (!trimmedTenantName) return;

    if (!companyId) {
      setZipCodeError("Empresa do usuario nao encontrada. Faca login novamente.");
      return;
    }

    try {
      const apiPerson = await createPerson({
        companyId,
        type: tenantFormData.personType === "Company" ? "COMPANY" : "INDIVIDUAL",
        name: trimmedTenantName,
        document: onlyNumbers(tenantFormData.cpf) || tenantFormData.cpf.trim(),
        phone: tenantFormData.phone.trim(),
        city: tenantFormData.city.trim(),
        state: tenantFormData.state.trim(),
        address: buildPersonAddressFromTenantForm(tenantFormData),
        status: "ACTIVE",
      });

      const newTenant = mapApiPersonToReceivableTenant(apiPerson);
      const updatedTenants = [...tenants, newTenant];

      setTenants(updatedTenants);
      setFormTenant(newTenant.id);
      setTenantFormData(initialTenantFormData);
      setZipCodeError("");
      setIsTenantCreateOpen(false);
    } catch (error) {
      setZipCodeError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar a pessoa no backend.",
      );
    }
  }

  function generateInstallmentPreview() {
    const totalAmountInCents = getAmountInCents(formAmount);
    const quantity = Number(formInstallmentQuantity);

    if (!formDueDate || totalAmountInCents <= 0 || !Number.isFinite(quantity)) {
      setInstallmentPreview([]);
      return;
    }

    const normalizedQuantity = Math.max(2, Math.trunc(quantity));
    const installmentAmountsInCents = distributeAmountInCents(
      totalAmountInCents,
      normalizedQuantity,
    );
    const downPaymentDate = formIssueDate || getLocalDateValue(new Date());

    const generatedInstallments = Array.from(
      { length: normalizedQuantity },
      (_, index) => {
        const isDownPayment =
          formFirstInstallmentAsDownPayment && index === 0;

        return {
          id: `preview-${index + 1}`,
          installmentNumber: index + 1,
          amount: formatCentsAsAmountInput(installmentAmountsInCents[index] || 0),
          dueDate: isDownPayment
            ? downPaymentDate
            : addDaysToDate(
                formDueDate,
                formFirstInstallmentAsDownPayment
                  ? Math.max(index - 1, 0) * 30
                  : index * 30,
              ),
          isDownPayment,
        };
      },
    );

    setInstallmentPreview(generatedInstallments);
  }

  function updateInstallmentAmount(id: string, amount: string) {
    setChargeFormError("");

    setInstallmentPreview((currentInstallments) => {
      const totalAmountInCents = getAmountInCents(formAmount);
      const changedInstallment = currentInstallments.find(
        (installment) => installment.id === id,
      );

      if (!changedInstallment || totalAmountInCents <= 0) {
        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      const changedAmountInCents = getAmountInCents(amount);
      const otherInstallments = currentInstallments.filter(
        (installment) => installment.id !== id,
      );
      const remainingAmountInCents = totalAmountInCents - changedAmountInCents;

      if (remainingAmountInCents < 0) {
        setChargeFormError(
          "O valor informado ultrapassa o valor total da cobrança.",
        );

        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      if (otherInstallments.length === 0) {
        return currentInstallments.map((installment) =>
          installment.id === id ? { ...installment, amount } : installment,
        );
      }

      const redistributedAmountsInCents = distributeAmountInCents(
        remainingAmountInCents,
        otherInstallments.length,
      );
      let redistributedIndex = 0;

      return currentInstallments.map((installment) => {
        if (installment.id === id) {
          return {
            ...installment,
            amount,
          };
        }

        const redistributedAmountInCents =
          redistributedAmountsInCents[redistributedIndex] || 0;
        redistributedIndex += 1;

        return {
          ...installment,
          amount: formatCentsAsAmountInput(redistributedAmountInCents),
        };
      });
    });
  }

  function updateInstallmentDueDate(id: string, dueDate: string) {
    setInstallmentPreview((currentInstallments) =>
      currentInstallments.map((installment) =>
        installment.id === id ? { ...installment, dueDate } : installment,
      ),
    );
  }

  function getCarnetChargesFromCharge(charge: Charge) {
    if (charge.installmentGroupId) {
      const groupedCharges = charges
        .filter(
          (currentCharge) =>
            String(currentCharge.installmentGroupId || "") ===
            String(charge.installmentGroupId),
        )
        .sort(
          (firstCharge, secondCharge) =>
            Number(firstCharge.installmentNumber || 0) -
            Number(secondCharge.installmentNumber || 0),
        );

      if (groupedCharges.length > 0) {
        return groupedCharges;
      }
    }

    return [
      {
        ...charge,
        installmentNumber: charge.installmentNumber || 1,
        installmentTotal: charge.installmentTotal || 1,
        installmentGroupId: charge.installmentGroupId || charge.id,
      },
    ];
  }

  function getContractById(contractId: string | number | null | undefined) {
    if (!contractId) return null;

    return (
      contracts.find((contract) => String(contract.id) === String(contractId)) || null
    );
  }

  function handleAfterContractCarnetGenerated(contractId: string | number | null | undefined) {
    const linkedContract = getContractById(contractId);

    if (!linkedContract) return;

    setPendingContractPrintRequest(linkedContract);
  }

  function redirectToContractsPage() {
    window.location.href = "/contratos";
  }

  function closeContractPrintQuestion() {
    setPendingContractPrintRequest(null);
    redirectToContractsPage();
  }

  function confirmContractPrintQuestion() {
    if (!pendingContractPrintRequest) return;

    const wasContractPrintOpened = openContractPrintWindow(pendingContractPrintRequest);

    if (!wasContractPrintOpened) return;

    setPendingContractPrintRequest(null);
    redirectToContractsPage();
  }

  function getContractPrintCompanySettings() {
    const defaultCompanySettings = {
      companyName: "Rentix",
      tradeName: "Rentix",
      legalName: "",
      document: "",
      phone: "",
      email: "",
      city: "",
      state: "",
      street: "",
      number: "",
      neighborhood: "",
      complement: "",
      zipCode: "",
      pixKey: "",
      contractCity: "",
      contractDefaultNotes: "",
    };

    const cachedCompanySettings = getCachedCompanySettings();

    if (cachedCompanySettings) {
      try {
        const source =
          typeof cachedCompanySettings.company === "object" && cachedCompanySettings.company !== null
            ? (cachedCompanySettings.company as Record<string, unknown>)
            : cachedCompanySettings;

        return {
          ...defaultCompanySettings,
          companyName: String(
            source.companyName ||
              source.tradeName ||
              source.name ||
              source.nomeFantasia ||
              defaultCompanySettings.companyName,
          ),
          tradeName: String(
            source.tradeName ||
              source.companyName ||
              source.name ||
              source.nomeFantasia ||
              defaultCompanySettings.tradeName,
          ),
          legalName: String(source.legalName || source.razaoSocial || source.businessName || ""),
          document: String(source.document || source.cnpj || source.cpfCnpj || ""),
          phone: String(source.phone || source.companyPhone || source.whatsapp || ""),
          email: String(source.email || source.companyEmail || ""),
          city: String(source.city || source.cidade || ""),
          state: String(source.state || source.uf || ""),
          street: String(source.street || source.logradouro || source.address || ""),
          number: String(source.number || source.numero || ""),
          neighborhood: String(source.neighborhood || source.bairro || ""),
          complement: String(source.complement || source.complemento || ""),
          zipCode: String(source.zipCode || source.cep || ""),
          pixKey: String(source.pixKey || source.pix || ""),
          contractCity: String(source.contractCity || source.cityForContract || ""),
          contractDefaultNotes: String(source.contractDefaultNotes || source.defaultContractNotes || ""),
        };
      } catch {
        return defaultCompanySettings;
      }
    }

    return defaultCompanySettings;
  }

  function formatContractPrintAddress(address: {
    street?: string;
    number?: string;
    district?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    complement?: string;
  }) {
    return [
      address.street,
      address.number ? `nº ${address.number}` : "",
      address.complement,
      address.neighborhood || address.district
        ? `Bairro: ${address.neighborhood || address.district}`
        : "",
      address.city && address.state ? `${address.city}/${address.state}` : address.city || address.state,
      address.zipCode ? `CEP ${address.zipCode}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getContractDurationInMonthsForPrint(startDateValue: string, endDateValue?: string) {
    if (!startDateValue || !endDateValue) return 1;

    const start = new Date(`${startDateValue}T00:00:00`);
    const end = new Date(`${endDateValue}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 1;
    }

    const monthDifference =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    return Math.max(monthDifference, 1);
  }

  function getConfiguredTemporaryContractTemplateContentForReceivable() {
    try {
      const parsedTemplates = getCachedPrintTemplates();

      if (!parsedTemplates) return null;
      const temporaryContractTemplate = parsedTemplates.temporaryContract;
      const legacyContractTemplate = parsedTemplates.contract;
      let templateContent = "";

      if (
        temporaryContractTemplate &&
        typeof temporaryContractTemplate === "object" &&
        !Array.isArray(temporaryContractTemplate) &&
        typeof (temporaryContractTemplate as { content?: unknown }).content === "string"
      ) {
        templateContent = (temporaryContractTemplate as { content: string }).content;
      }

      if (!templateContent && typeof legacyContractTemplate === "string") {
        templateContent = legacyContractTemplate;
      }

      const cleanTemplateContent = templateContent.trim();

      if (!cleanTemplateContent) return null;

      if (
        cleanTemplateContent === DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT.trim() ||
        cleanTemplateContent === LEGACY_SETTINGS_TEMPORARY_CONTRACT_CONTENT.trim()
      ) {
        return null;
      }

      return templateContent;
    } catch {
      return null;
    }
  }

  function normalizeContractTemplateContent(value: string) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function getConfiguredStandardContractTemplateContentForReceivable() {
    try {
      const parsedTemplates = getCachedPrintTemplates();

      if (!parsedTemplates) return null;
      const standardContractTemplate = parsedTemplates.standardContract;
      let templateContent = "";

      if (
        standardContractTemplate &&
        typeof standardContractTemplate === "object" &&
        !Array.isArray(standardContractTemplate) &&
        typeof (standardContractTemplate as { content?: unknown }).content === "string"
      ) {
        templateContent = (standardContractTemplate as { content: string }).content;
      }

      const cleanTemplateContent = templateContent.trim();

      if (!cleanTemplateContent) return null;

      const normalizedTemplateContent = normalizeContractTemplateContent(cleanTemplateContent);
      const normalizedLegacyTemplateContent = normalizeContractTemplateContent(LEGACY_SETTINGS_STANDARD_CONTRACT_CONTENT);
      const normalizedOriginalTemplateContent = normalizeContractTemplateContent(ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE);

      if (
        normalizedTemplateContent === normalizedLegacyTemplateContent ||
        normalizedTemplateContent === normalizedOriginalTemplateContent
      ) {
        return null;
      }

      return templateContent;
    } catch {
      return null;
    }
  }

  function renderContractPrintTemplate(templateContent: string, templateData: Record<string, string>) {
    return Object.entries(templateData).reduce((renderedContent, [key, value]) => {
      return renderedContent.replace(new RegExp(`{${key}}`, "g"), value);
    }, templateContent);
  }

  function buildConfiguredContractPrintHtml(templateContent: string, templateData: Record<string, string>) {
    const renderedTemplateContent = renderContractPrintTemplate(templateContent, templateData);

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 18px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    .toolbar button { border: 0; border-radius: 12px; padding: 12px 18px; font-weight: 800; cursor: pointer; }
    .print-button { background: #f97316; color: #ffffff; }
    .close-button { background: #f1f5f9; color: #334155; }
    .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #ffffff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
    .page-inner { padding: 18mm; }
    .content { white-space: pre-wrap; font-size: 12.5px; line-height: 1.65; font-weight: 600; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .page-inner { padding: 18mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="close-button" type="button" onclick="window.close()">Fechar</button>
    <button class="print-button" type="button" onclick="window.print()">Imprimir contrato</button>
  </div>

  <main class="page">
    <div class="page-inner">
      <div class="content">${escapeHtml(renderedTemplateContent)}</div>
    </div>
  </main>
</body>
</html>`;
  }

  function formatDocumentForContractPrint(value: string) {
    const digits = String(value || "").replace(/\D/g, "");

    if (digits.length > 11) {
      return digits
        .slice(0, 14)
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
    }

    return digits
      .slice(0, 11)
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  function getContractDurationInDaysForPrint(startDateValue: string, endDateValue?: string) {
    if (!startDateValue || !endDateValue) return 1;

    const start = new Date(`${startDateValue}T00:00:00`);
    const end = new Date(`${endDateValue}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.max(Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
  }

  function getContractRentDueDayForPrint(startDateValue: string) {
    if (!startDateValue) return "____";

    const [, , day] = startDateValue.split("-");

    return day || "____";
  }

  function formatContractDateForTemplate(value?: string) {
    if (!value) return "-";

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) return formatDate(value);

    return `${day}/${month}/${year}`;
  }

  function getContractPrintHtml(contract: Contract) {
    const property = properties.find((item) => String(item.id) === String(contract.propertyId));
    const tenant = tenants.find((item) => String(item.id) === String(contract.tenantId)) as
      | (Tenant & { document?: string; email?: string; neighborhood?: string })
      | undefined;
    const companySettings = getContractPrintCompanySettings();
    const landlordName =
      companySettings.legalName ||
      companySettings.companyName ||
      companySettings.tradeName ||
      "LOCADOR NÃO INFORMADO";
    const landlordDocument = formatDocumentForContractPrint(companySettings.document || "");
    const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
    const tenantDocument = formatDocumentForContractPrint(tenant?.cpf || tenant?.document || "");
    const propertyName = contract.propertyName || property?.name || "IMÓVEL NÃO INFORMADO";
    const propertyAddress = formatContractPrintAddress(property || {});
    const locationText =
      companySettings.contractCity ||
      (property?.city && property?.state
        ? `${property.city}/${property.state}`
        : companySettings.city && companySettings.state
          ? `${companySettings.city}/${companySettings.state}`
          : "______/__");
    const monthlyAmount = formatCurrency(getContractAmount(contract));
    const templateData: Record<string, string> = {
      companyName: landlordName,
      tradeName: companySettings.tradeName || companySettings.companyName || landlordName,
      landlordName,
      landlordDocument: landlordDocument || "não informado",
      landlordAddress: formatContractPrintAddress(companySettings) || "endereço não informado",
      companyEmail: companySettings.email || "não informado",
      companyPhone: companySettings.phone || "não informado",
      personName: tenantName,
      tenantName,
      tenantDocument: tenantDocument || "não informado",
      tenantAddress: formatContractPrintAddress(tenant || {}) || "endereço não informado",
      tenantPhone: tenant?.phone || "não informado",
      tenantEmail: tenant?.email || "não informado",
      propertyName,
      propertyAddress: propertyAddress || "endereço não informado",
      startDate: formatContractDateForTemplate(contract.startDate),
      endDate: formatContractDateForTemplate(contract.endDate),
      entryTime: contract.checkInTime || "____:____",
      exitTime: contract.checkOutTime || "____:____",
      checkInTime: contract.checkInTime || "____:____",
      checkOutTime: contract.checkOutTime || "____:____",
      contractDays: String(getContractDurationInDaysForPrint(contract.startDate, contract.endDate)),
      contractMonths: String(getContractDurationInMonthsForPrint(contract.startDate, contract.endDate)),
      amount: monthlyAmount,
      rentValue: monthlyAmount,
      monthlyAmount,
      penaltyAmount: formatCurrency(getContractAmount(contract) * 3),
      dueDay: String(getContractRentDueDayForPrint(contract.startDate)),
      pixKey: companySettings.pixKey || "não informado",
      contractCity: locationText,
      currentDate: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      contractDefaultNotes: companySettings.contractDefaultNotes || "",
    };

    const templateContent = contract.isTemporaryRental
      ? getConfiguredTemporaryContractTemplateContentForReceivable() || DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT
      : getConfiguredStandardContractTemplateContentForReceivable() || ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE;

    return buildConfiguredContractPrintHtml(templateContent, templateData);
  }

  function openContractPrintWindow(contract: Contract) {
    const printWindow = window.open(
      "",
      "_blank",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
    );

    if (!printWindow) {
      setChargeFormError(
        "Não foi possível abrir o contrato. Verifique se o navegador bloqueou pop-ups.",
      );
      return false;
    }

    printWindow.document.write(getContractPrintHtml(contract));
    printWindow.document.close();
    printWindow.focus();

    try {
      printWindow.moveTo(0, 0);
      printWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
    } catch {}

    return true;
  }


  function reprintPaymentCarnet(charge: Charge) {
    const carnetCharges = getCarnetChargesFromCharge(charge).filter(
      (currentCharge) => !currentCharge.isDownPayment,
    );

    generatePaymentCarnet(carnetCharges);
  }

  function reprintPaymentReceipt(charge: Charge) {
    const paymentRecord = getChargePayment(charge.id);

    if (!paymentRecord) {
      setPaymentFormError(
        "Não existe recibo salvo para esta cobrança. Confirme o recebimento antes de reimprimir.",
      );
      return;
    }

    generatePaymentReceipt(charge, paymentRecord);
  }

  function generatePaymentReceipt(charge: Charge, paymentRecord: ChargePayment) {
    const receiptWindow = window.open(
      "",
      "_blank",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
    );

    if (!receiptWindow) {
      setPaymentFormError(
        "O recebimento foi salvo, mas não foi possível abrir o recibo. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    const companySettings = getCompanySettingsForCarnet();
    const companyName =
      companySettings.tradeName || companySettings.companyName || "Rentix";
    const companyDocument = companySettings.document || "Não informado";
    const companyPhone = companySettings.phone || "Não informado";
    const companyEmail = companySettings.email || "Não informado";
    const receiptNumber = String(paymentRecord.chargeId)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-8)
      .toUpperCase();
    const paymentMethods = paymentRecord.paymentItems?.length
      ? paymentRecord.paymentItems
          .map(
            (paymentItem) =>
              `${getPaymentMethodLabel(paymentItem.method)} - ${formatCurrency(paymentItem.amount)}`,
          )
          .join(", ")
      : getPaymentMethodLabel(paymentRecord.method);
    const chargeLabel = charge.isDownPayment
      ? "Entrada"
      : charge.installmentNumber && charge.installmentTotal
        ? `Parcela ${charge.installmentNumber}/${charge.installmentTotal}`
        : "Cobrança";
    const receiptDateTime = new Date(paymentRecord.paidAt).toLocaleString("pt-BR");
    const receiptDate = formatDate(paymentRecord.paidAt);
    const receiptObservation = paymentRecord.note?.trim() || "-";
    const hasObservation = receiptObservation !== "-";

    receiptWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Recibo de Recebimento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; background: #ffffff; border-bottom: 1px solid #d1d5db; }
            .toolbar button { border: 0; border-radius: 10px; padding: 10px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
            .print-button { background: #111827; color: #ffffff; }
            .close-button { background: #f3f4f6; color: #111827; border: 1px solid #d1d5db !important; }
            .page { width: 185mm; margin: 18px auto; }
            .receipt { min-height: 112mm; background: #ffffff; border: 1px solid #111827; padding: 12mm 14mm 10mm; }
            .top { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; border-bottom: 2px solid #111827; padding-bottom: 10px; }
            .title { margin: 0; font-size: 30px; line-height: 1; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; }
            .subtitle { margin-top: 5px; color: #374151; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
            .number { text-align: right; font-size: 12px; line-height: 1.55; }
            .number strong { font-size: 15px; }
            .reference { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; border-bottom: 1px dashed #cbd5e1; padding: 14px 0; }
            .reference span { display: block; color: #4b5563; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .reference strong { display: block; margin-top: 6px; font-size: 14px; line-height: 1.3; }
            .amount-grid { display: grid; grid-template-columns: 1.3fr 1fr 1fr; margin-top: 16px; overflow: hidden; border: 1px solid #111827; }
            .amount-card { min-height: 68px; padding: 11px 12px; border-right: 1px solid #111827; }
            .amount-card:last-child { border-right: 0; }
            .amount-card span { display: block; color: #374151; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .amount-card strong { display: block; margin-top: 7px; font-size: 18px; line-height: 1.2; }
            .amount-card.highlight strong { font-size: 24px; }
            .amount-card.discount strong { color: #b91c1c; }
            .total-box { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: center; margin-top: 14px; border: 1px solid #111827; background: #f9fafb; padding: 13px 14px; }
            .total-box span { display: block; color: #374151; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .total-box strong { display: block; margin-top: 4px; font-size: 30px; line-height: 1; font-weight: 900; }
            .confirmed { border: 1px solid #bbf7d0; background: #ecfdf5; color: #047857; border-radius: 999px; padding: 9px 14px; font-size: 12px; font-weight: 900; white-space: nowrap; }
            .payment-box { margin-top: 14px; border: 1px solid #111827; }
            .payment-row { display: grid; grid-template-columns: 190px 1fr; border-bottom: 1px solid #d1d5db; }
            .payment-row:last-child { border-bottom: 0; }
            .payment-row span, .payment-row strong { padding: 8px 10px; font-size: 12px; }
            .payment-row span { background: #f9fafb; font-weight: 900; border-right: 1px solid #d1d5db; }
            .payment-row strong { text-align: right; font-weight: 800; }
            .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 28px; }
            .signature { border-top: 1px solid #111827; padding-top: 6px; text-align: center; font-size: 11px; font-weight: 800; }
            .signature small { display: block; margin-top: 3px; color: #4b5563; font-weight: 700; }
            .footer { margin-top: 13px; border-top: 1px solid #d1d5db; padding-top: 8px; color: #374151; font-size: 10px; line-height: 1.45; text-align: center; }
            @page { size: A5 landscape; margin: 7mm; }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none !important; }
              .page { width: 100%; margin: 0; }
              .receipt { width: 100%; min-height: auto; border: 1px solid #111827; padding: 9mm 10mm 8mm; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" onclick="window.print()">Imprimir recibo</button>
            <button class="close-button" type="button" onclick="window.close()">Fechar</button>
          </div>

          <main class="page">
            <section class="receipt">
              <header class="top">
                <div>
                  <h1 class="title">Recibo</h1>
                  <div class="subtitle">Comprovante de recebimento</div>
                </div>
                <div class="number">
                  Nº <strong>${escapeHtml(receiptNumber || "RENTIX")}</strong><br />
                  Emitido em: <strong>${escapeHtml(receiptDateTime)}</strong>
                </div>
              </header>

              <div class="reference">
                <div>
                  <span>Recebimento</span>
                  <strong>${escapeHtml(receiptDate)}</strong>
                </div>
                <div>
                  <span>Referência</span>
                  <strong>${escapeHtml(chargeLabel)}</strong>
                </div>
                <div>
                  <span>Vencimento</span>
                  <strong>${formatDate(charge.dueDate)}</strong>
                </div>
              </div>

              <div class="amount-grid">
                <div class="amount-card highlight">
                  <span>Valor original</span>
                  <strong>${formatCurrency(charge.amount)}</strong>
                </div>
                <div class="amount-card">
                  <span>Juros</span>
                  <strong>${formatCurrency(paymentRecord.interest)}</strong>
                </div>
                <div class="amount-card discount">
                  <span>Desconto</span>
                  <strong>${formatCurrency(paymentRecord.discount)}</strong>
                </div>
              </div>

              <div class="total-box">
                <div>
                  <span>Total recebido</span>
                  <strong>${formatCurrency(paymentRecord.amountPaid)}</strong>
                </div>
                <div class="confirmed">Pagamento confirmado</div>
              </div>

              <div class="payment-box">
                <div class="payment-row"><span>Forma(s) de pagamento</span><strong>${escapeHtml(paymentMethods)}</strong></div>
                ${hasObservation ? `<div class="payment-row"><span>Observação</span><strong>${escapeHtml(receiptObservation)}</strong></div>` : ""}
              </div>

              <div class="signature-area">
                <div class="signature">
                  ${escapeHtml(companyName)}
                  <small>Recebedor</small>
                </div>
                <div class="signature">
                  Assinatura / Conferência
                  <small>Pagador</small>
                </div>
              </div>

              <div class="footer">
                ${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)} · Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}
              </div>
            </section>
          </main>

          <script>
            window.onload = function () {
              window.focus();
              try {
                window.moveTo(0, 0);
                window.resizeTo(screen.availWidth, screen.availHeight);
              } catch (error) {}
              setTimeout(function () {
                window.print();
              }, 350);
            };
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.focus();

    try {
      receiptWindow.moveTo(0, 0);
      receiptWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
    } catch {}
  }

  async function saveManualCharge() {
    setChargeFormError("");

    const normalizedAmount = normalizeAmount(formAmount);

    if (isEditingPaidCharge) {
      if (!editingChargeId) return;

      if (!formPaymentDate) {
        setChargeFormError(
          "Informe a data de pagamento para salvar os ajustes.",
        );
        return;
      }

      const currentPaymentRecord = getChargePayment(editingChargeId);
      const currentCharge = charges.find(
        (charge) => String(charge.id) === String(editingChargeId),
      );

      const updatedPaymentRecord: ChargePayment = {
        chargeId: editingChargeId,
        paidAt: new Date(`${formPaymentDate}T00:00:00`).toISOString(),
        method: currentPaymentRecord?.method || "Cash",
        interest: currentPaymentRecord?.interest || 0,
        discount: currentPaymentRecord?.discount || 0,
        amountPaid:
          currentPaymentRecord?.amountPaid || currentCharge?.amount || 0,
        note: currentPaymentRecord?.note || "",
      };

      const updatedPaymentRecords = [
        ...paymentRecords.filter(
          (paymentRecord) =>
            String(paymentRecord.chargeId) !== String(editingChargeId),
        ),
        updatedPaymentRecord,
      ];

      if (companyId) {
        try {
          await reverseReceivedAccount(editingChargeId);
          await receiveAccount(editingChargeId, {
            paidAt: updatedPaymentRecord.paidAt,
            method: mapUiPaymentMethodToApi(updatedPaymentRecord.method),
            paymentItems: updatedPaymentRecord.paymentItems
              ? mapUiPaymentItemsToApi(updatedPaymentRecord.paymentItems)
              : undefined,
            interest: updatedPaymentRecord.interest,
            discount: updatedPaymentRecord.discount,
            amountPaid: updatedPaymentRecord.amountPaid,
            note: updatedPaymentRecord.note,
          });
        } catch (error) {
          setChargeFormError(
            error instanceof Error
              ? error.message
              : "NÃ£o foi possÃ­vel atualizar o recebimento no backend.",
          );
          return;
        }
      }

      setPaymentRecords(updatedPaymentRecords);

      closeCreateModal();
      return;
    }

    if (!formTenant) {
      setChargeFormError(
        "Selecione um inquilino/pessoa para salvar a cobrança.",
      );
      return;
    }

    if (normalizedAmount <= 0) {
      setChargeFormError(
        "Informe um valor total válido para salvar a cobrança.",
      );
      return;
    }

    if (!formIssueDate) {
      setChargeFormError(
        "Informe a data de lançamento para salvar a cobrança.",
      );
      return;
    }

    if (!formDueDate) {
      setChargeFormError(
        "Informe o primeiro vencimento para salvar a cobrança.",
      );
      return;
    }

    const tenant = tenants.find((item) => String(item.id) === formTenant);
    const property = properties.find(
      (item) => String(item.id) === formProperty,
    );

    if (!tenant) {
      setChargeFormError(
        "Inquilino/pessoa não encontrado. Selecione novamente.",
      );
      return;
    }

    const chargeProperty = property?.name || "Sem imóvel vinculado";
    const issueDate = new Date(`${formIssueDate}T00:00:00`).toISOString();

    if (formLaunchType === "single") {
      const savedCharge: Charge = {
        id: editingChargeId || `manual-${Date.now()}`,
        contractId: formContractId || null,
        property: chargeProperty,
        tenant: tenant.name,
        dueDate: new Date(`${formDueDate}T00:00:00`).toISOString(),
        issueDate,
        amount: normalizedAmount,
        status: "Pending",
        manual: true,
      };

      const alreadyExists = manualCharges.some(
        (charge) => String(charge.id) === String(savedCharge.id),
      );

      if (companyId) {
        try {
          const apiCharge = alreadyExists
            ? await updateReceivableAccount(savedCharge.id, {
                contractId: formContractId || null,
                tenantId: tenant.id,
                property: chargeProperty,
                tenant: tenant.name,
                dueDate: formDueDate,
                issueDate: formIssueDate,
                amount: normalizedAmount,
                manual: true,
              })
            : await createReceivableAccount({
                companyId,
                contractId: formContractId || null,
                tenantId: tenant.id,
                property: chargeProperty,
                tenant: tenant.name,
                dueDate: formDueDate,
                issueDate: formIssueDate,
                amount: normalizedAmount,
                manual: true,
              });

          savedCharge.id = apiCharge.id;
        } catch (error) {
          setChargeFormError(
            error instanceof Error
              ? error.message
              : "NÃ£o foi possÃ­vel salvar a cobranÃ§a no backend.",
          );
          return;
        }
      }

      const updatedManualCharges = alreadyExists
        ? manualCharges.map((charge) =>
            String(charge.id) === String(savedCharge.id) ? savedCharge : charge,
          )
        : [...manualCharges, savedCharge];

      setManualCharges(updatedManualCharges);

      generatePaymentCarnet([
        {
          ...savedCharge,
          installmentNumber: 1,
          installmentTotal: 1,
          installmentGroupId: savedCharge.id,
        },
      ]);
      closeCreateModal();
      handleAfterContractCarnetGenerated(savedCharge.contractId);
      return;
    }

    if (installmentPreview.length === 0) {
      setChargeFormError(
        "Gere ao menos uma parcela válida para salvar a cobrança.",
      );
      return;
    }

    const hasInvalidInstallment = installmentPreview.some(
      (installment) =>
        normalizeAmount(installment.amount) <= 0 || !installment.dueDate,
    );

    if (hasInvalidInstallment) {
      setChargeFormError(
        "Revise os valores e vencimentos das parcelas antes de salvar.",
      );
      return;
    }

    const installmentTotalInCents = getInstallmentsTotalInCents(installmentPreview);
    const chargeTotalInCents = getAmountInCents(formAmount);

    if (installmentTotalInCents !== chargeTotalInCents) {
      setChargeFormError(
        `A soma das parcelas precisa fechar exatamente o valor total da cobrança. Diferença: ${formatCurrency(
          Math.abs(installmentTotalInCents - chargeTotalInCents) / 100,
        )}.`,
      );
      return;
    }

    const installmentGroupId = `installment-${Date.now()}`;

    const newCharges: Charge[] = installmentPreview.map((installment) => ({
      id: `${installmentGroupId}-${installment.installmentNumber}`,
      contractId: formContractId || null,
      property: chargeProperty,
      tenant: tenant.name,
      dueDate: new Date(`${installment.dueDate}T00:00:00`).toISOString(),
      issueDate,
      amount: normalizeAmount(installment.amount),
      status: "Pending",
      manual: true,
      installmentNumber: installment.installmentNumber,
      installmentTotal: installmentPreview.length,
      installmentGroupId,
      isDownPayment: Boolean(installment.isDownPayment),
    }));

    if (companyId) {
      try {
        const apiCharges = await Promise.all(
          newCharges.map((charge) =>
            createReceivableAccount({
              companyId,
              contractId: formContractId || null,
              tenantId: tenant.id,
              property: charge.property,
              tenant: charge.tenant,
              dueDate: getDateInputValue(charge.dueDate),
              issueDate: formIssueDate,
              amount: charge.amount,
              manual: true,
              installmentNumber: charge.installmentNumber,
              installmentTotal: charge.installmentTotal,
              installmentGroupId: charge.installmentGroupId,
              isDownPayment: charge.isDownPayment,
            }),
          ),
        );

        apiCharges.forEach((apiCharge, index) => {
          newCharges[index].id = apiCharge.id;
        });
      } catch (error) {
        setChargeFormError(
          error instanceof Error
            ? error.message
            : "NÃ£o foi possÃ­vel salvar as parcelas no backend.",
        );
        return;
      }
    }

    const updatedManualCharges = [...manualCharges, ...newCharges];

    setManualCharges(updatedManualCharges);

    const downPaymentCharge = newCharges.find((charge) => charge.isDownPayment);

    const carnetCharges = newCharges.filter((charge) => !charge.isDownPayment);

    if (carnetCharges.length > 0) {
      generatePaymentCarnet(carnetCharges);
    }

    closeCreateModal();

    if (downPaymentCharge) {
      window.setTimeout(() => {
        openReceivePaymentModal(downPaymentCharge);
      }, 0);
    }

    handleAfterContractCarnetGenerated(formContractId);
  }

  return (
    <AppShell>
      <style jsx global>{`
        .rentix-accounts-receivable-page-light {
          color: #0f172a;
        }

        .rentix-accounts-receivable-page-light .bg-white,
        .rentix-accounts-receivable-page-light [class*="dark:bg-slate"],
        .rentix-accounts-receivable-page-light [class*="dark:from-slate"],
        .rentix-accounts-receivable-page-light [class*="dark:to-slate"] {
          background-color: #ffffff !important;
          background-image: none !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-50,
        .rentix-accounts-receivable-page-light .bg-slate-100 {
          background-color: #f8fafc !important;
        }

        .rentix-accounts-receivable-page-light .bg-orange-50,
        .rentix-accounts-receivable-page-light .bg-orange-100 {
          background-color: #fff7ed !important;
        }

        .rentix-accounts-receivable-page-light .bg-red-50,
        .rentix-accounts-receivable-page-light .bg-red-100 {
          background-color: #fef2f2 !important;
        }

        .rentix-accounts-receivable-page-light .bg-emerald-50,
        .rentix-accounts-receivable-page-light .bg-emerald-100 {
          background-color: #ecfdf5 !important;
        }

        .rentix-accounts-receivable-page-light .bg-amber-50,
        .rentix-accounts-receivable-page-light .bg-amber-100 {
          background-color: #fffbeb !important;
        }

        .rentix-accounts-receivable-page-light .text-slate-950,
        .rentix-accounts-receivable-page-light .text-slate-900,
        .rentix-accounts-receivable-page-light .text-slate-800,
        .rentix-accounts-receivable-page-light .text-slate-700,
        .rentix-accounts-receivable-page-light [class*="dark:text-slate-100"],
        .rentix-accounts-receivable-page-light [class*="dark:text-white"] {
          color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-light .text-slate-600,
        .rentix-accounts-receivable-page-light .text-slate-500,
        .rentix-accounts-receivable-page-light .text-slate-400,
        .rentix-accounts-receivable-page-light [class*="dark:text-slate-300"],
        .rentix-accounts-receivable-page-light [class*="dark:text-slate-400"],
        .rentix-accounts-receivable-page-light [class*="dark:text-slate-500"] {
          color: #475569 !important;
        }

        .rentix-accounts-receivable-page-light .text-orange-600,
        .rentix-accounts-receivable-page-light .text-orange-700 {
          color: #ea580c !important;
        }

        .rentix-accounts-receivable-page-light .text-red-600,
        .rentix-accounts-receivable-page-light .text-red-700 {
          color: #dc2626 !important;
        }

        .rentix-accounts-receivable-page-light .text-emerald-600,
        .rentix-accounts-receivable-page-light .text-emerald-700 {
          color: #047857 !important;
        }

        .rentix-accounts-receivable-page-light .border-slate-100,
        .rentix-accounts-receivable-page-light .border-slate-200,
        .rentix-accounts-receivable-page-light .border-slate-300,
        .rentix-accounts-receivable-page-light [class*="dark:border-slate"] {
          border-color: #e2e8f0 !important;
        }

        .rentix-accounts-receivable-page-light .border-orange-100,
        .rentix-accounts-receivable-page-light .border-orange-200,
        .rentix-accounts-receivable-page-light [class*="dark:border-orange"] {
          border-color: #fed7aa !important;
        }

        .rentix-accounts-receivable-page-light input,
        .rentix-accounts-receivable-page-light select,
        .rentix-accounts-receivable-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .rentix-accounts-receivable-page-light input::placeholder,
        .rentix-accounts-receivable-page-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .rentix-accounts-receivable-page-light table,
        .rentix-accounts-receivable-page-light tbody,
        .rentix-accounts-receivable-page-light tbody tr {
          background-color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light thead {
          background-color: #fff7ed !important;
        }

        .rentix-accounts-receivable-page-light tbody tr:hover {
          background-color: #f8fafc !important;
        }

        .rentix-accounts-receivable-page-light .shadow-sm,
        .rentix-accounts-receivable-page-light .shadow-md,
        .rentix-accounts-receivable-page-light .shadow-2xl {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10) !important;
        }

        .dark .rentix-accounts-receivable-page-black {
          color: #f8fafc;
        }

        .dark .rentix-accounts-receivable-page-black .bg-white {
          background-color: #0f172a !important;
        }

        .dark .rentix-accounts-receivable-page-black .bg-slate-50,
        .dark .rentix-accounts-receivable-page-black .bg-slate-100 {
          background-color: #111827 !important;
        }

        .dark .rentix-accounts-receivable-page-black .bg-orange-50,
        .dark .rentix-accounts-receivable-page-black .bg-orange-100 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .dark .rentix-accounts-receivable-page-black .bg-red-50,
        .dark .rentix-accounts-receivable-page-black .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.12) !important;
        }

        .dark .rentix-accounts-receivable-page-black .bg-emerald-50,
        .dark .rentix-accounts-receivable-page-black .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }

        .dark .rentix-accounts-receivable-page-black .bg-amber-50,
        .dark .rentix-accounts-receivable-page-black .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.14) !important;
        }

        .dark .rentix-accounts-receivable-page-black .text-slate-950,
        .dark .rentix-accounts-receivable-page-black .text-slate-900,
        .dark .rentix-accounts-receivable-page-black .text-slate-800,
        .dark .rentix-accounts-receivable-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .dark .rentix-accounts-receivable-page-black .text-slate-600,
        .dark .rentix-accounts-receivable-page-black .text-slate-500,
        .dark .rentix-accounts-receivable-page-black .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .dark .rentix-accounts-receivable-page-black .border-orange-100,
        .dark .rentix-accounts-receivable-page-black .border-orange-200,
        .dark .rentix-accounts-receivable-page-black .border-red-100,
        .dark .rentix-accounts-receivable-page-black .border-red-200,
        .dark .rentix-accounts-receivable-page-black .border-emerald-200,
        .dark .rentix-accounts-receivable-page-black .border-slate-100,
        .dark .rentix-accounts-receivable-page-black .border-slate-200,
        .dark .rentix-accounts-receivable-page-black .border-slate-300 {
          border-color: #334155 !important;
        }

        .dark .rentix-accounts-receivable-page-black input,
        .dark .rentix-accounts-receivable-page-black select,
        .dark .rentix-accounts-receivable-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }

        .dark .rentix-accounts-receivable-page-black input::placeholder,
        .dark .rentix-accounts-receivable-page-black textarea::placeholder {
          color: #64748b !important;
        }

        .dark .rentix-accounts-receivable-page-black table,
        .dark .rentix-accounts-receivable-page-black tbody,
        .dark .rentix-accounts-receivable-page-black tbody tr {
          background-color: #0f172a !important;
        }

        .dark .rentix-accounts-receivable-page-black thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .dark .rentix-accounts-receivable-page-black tbody tr:hover {
          background-color: #1e293b !important;
        }


        /* Rentix explicit theme override - Accounts Receivable
           Keeps this screen independent from a stale global .dark class. */
        .rentix-accounts-receivable-page-light,
        .rentix-accounts-receivable-page-light * {
          color-scheme: light !important;
        }

        .rentix-accounts-receivable-page-light .bg-white,
        .rentix-accounts-receivable-page-light .dark\:bg-white {
          background-color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-50,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-50 {
          background-color: #f8fafc !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-100,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-100 {
          background-color: #f1f5f9 !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-800,
        .rentix-accounts-receivable-page-light .bg-slate-900,
        .rentix-accounts-receivable-page-light .bg-slate-950,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-700,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-800,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-900,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-950 {
          background-color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light .bg-gradient-to-r {
          background-image: linear-gradient(to right, #ecfdf5, #ffffff) !important;
        }

        .rentix-accounts-receivable-page-light .bg-orange-50,
        .rentix-accounts-receivable-page-light .dark\:bg-orange-950\/30,
        .rentix-accounts-receivable-page-light .dark\:bg-orange-900\/40 {
          background-color: #fff7ed !important;
        }

        .rentix-accounts-receivable-page-light .bg-emerald-50,
        .rentix-accounts-receivable-page-light .dark\:bg-emerald-950\/30 {
          background-color: #ecfdf5 !important;
        }

        .rentix-accounts-receivable-page-light .bg-red-50,
        .rentix-accounts-receivable-page-light .dark\:bg-red-950\/30 {
          background-color: #fef2f2 !important;
        }

        .rentix-accounts-receivable-page-light .bg-amber-50,
        .rentix-accounts-receivable-page-light .dark\:bg-amber-950\/30 {
          background-color: #fffbeb !important;
        }

        .rentix-accounts-receivable-page-light .text-white,
        .rentix-accounts-receivable-page-light .text-slate-100,
        .rentix-accounts-receivable-page-light .dark\:text-white,
        .rentix-accounts-receivable-page-light .dark\:text-slate-100 {
          color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-light .text-slate-950,
        .rentix-accounts-receivable-page-light .text-slate-900,
        .rentix-accounts-receivable-page-light .text-slate-800,
        .rentix-accounts-receivable-page-light .text-slate-700,
        .rentix-accounts-receivable-page-light .dark\:text-slate-100,
        .rentix-accounts-receivable-page-light .dark\:text-slate-200 {
          color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-light .text-slate-600,
        .rentix-accounts-receivable-page-light .text-slate-500,
        .rentix-accounts-receivable-page-light .text-slate-400,
        .rentix-accounts-receivable-page-light .dark\:text-slate-300,
        .rentix-accounts-receivable-page-light .dark\:text-slate-400,
        .rentix-accounts-receivable-page-light .dark\:text-slate-500 {
          color: #64748b !important;
        }

        .rentix-accounts-receivable-page-light .text-orange-600,
        .rentix-accounts-receivable-page-light .text-orange-700,
        .rentix-accounts-receivable-page-light .dark\:text-orange-300,
        .rentix-accounts-receivable-page-light .dark\:text-orange-400 {
          color: #ea580c !important;
        }

        .rentix-accounts-receivable-page-light .text-emerald-700,
        .rentix-accounts-receivable-page-light .dark\:text-emerald-300 {
          color: #047857 !important;
        }

        .rentix-accounts-receivable-page-light .text-red-600,
        .rentix-accounts-receivable-page-light .text-red-700,
        .rentix-accounts-receivable-page-light .dark\:text-red-300 {
          color: #dc2626 !important;
        }

        .rentix-accounts-receivable-page-light .border-slate-100,
        .rentix-accounts-receivable-page-light .border-slate-200,
        .rentix-accounts-receivable-page-light .border-slate-300,
        .rentix-accounts-receivable-page-light .border-slate-700,
        .rentix-accounts-receivable-page-light .dark\:border-slate-700 {
          border-color: #e2e8f0 !important;
        }

        .rentix-accounts-receivable-page-light .ring-slate-100,
        .rentix-accounts-receivable-page-light .ring-slate-200,
        .rentix-accounts-receivable-page-light .ring-slate-700,
        .rentix-accounts-receivable-page-light .dark\:ring-slate-700 {
          --tw-ring-color: #e2e8f0 !important;
        }

        .rentix-accounts-receivable-page-light input,
        .rentix-accounts-receivable-page-light select,
        .rentix-accounts-receivable-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .rentix-accounts-receivable-page-light input::placeholder,
        .rentix-accounts-receivable-page-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .rentix-accounts-receivable-page-light table,
        .rentix-accounts-receivable-page-light tbody,
        .rentix-accounts-receivable-page-light tbody tr,
        .rentix-accounts-receivable-page-light .dark\:bg-slate-800 {
          background-color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light thead,
        .rentix-accounts-receivable-page-light .bg-orange-50 {
          background-color: #fff7ed !important;
        }

        .rentix-accounts-receivable-page-light tbody tr:hover,
        .rentix-accounts-receivable-page-light .hover\:bg-slate-50:hover,
        .rentix-accounts-receivable-page-light .dark\:hover\:bg-slate-800:hover,
        .rentix-accounts-receivable-page-light .dark\:hover\:bg-slate-700:hover {
          background-color: #f8fafc !important;
        }

        .rentix-accounts-receivable-page-light .divide-slate-100 > :not([hidden]) ~ :not([hidden]),
        .rentix-accounts-receivable-page-light .dark\:divide-slate-700 > :not([hidden]) ~ :not([hidden]) {
          border-color: #e2e8f0 !important;
        }

        .rentix-accounts-receivable-page-light .shadow-sm,
        .rentix-accounts-receivable-page-light .shadow-md,
        .rentix-accounts-receivable-page-light .shadow-lg,
        .rentix-accounts-receivable-page-light .shadow-xl,
        .rentix-accounts-receivable-page-light .shadow-2xl {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10) !important;
        }

        .rentix-accounts-receivable-page-light .bg-emerald-600,
        .rentix-accounts-receivable-page-light .bg-orange-500,
        .rentix-accounts-receivable-page-light .bg-red-500 {
          color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-black,
        .rentix-accounts-receivable-page-black * {
          color-scheme: dark !important;
        }

        .rentix-accounts-receivable-page-black .bg-white,
        .rentix-accounts-receivable-page-black .bg-slate-50,
        .rentix-accounts-receivable-page-black .bg-slate-100 {
          background-color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-black .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0f172a, #111827) !important;
        }

        .rentix-accounts-receivable-page-black .text-slate-950,
        .rentix-accounts-receivable-page-black .text-slate-900,
        .rentix-accounts-receivable-page-black .text-slate-800,
        .rentix-accounts-receivable-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .rentix-accounts-receivable-page-black .text-slate-600,
        .rentix-accounts-receivable-page-black .text-slate-500,
        .rentix-accounts-receivable-page-black .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .rentix-accounts-receivable-page-black input,
        .rentix-accounts-receivable-page-black select,
        .rentix-accounts-receivable-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }


        .rentix-accounts-receivable-page-light .bg-slate-900,
        .rentix-accounts-receivable-page-light .bg-emerald-600,
        .rentix-accounts-receivable-page-light .bg-orange-500,
        .rentix-accounts-receivable-page-light .bg-red-600,
        .rentix-accounts-receivable-page-light .bg-red-500,
        .rentix-accounts-receivable-page-light .bg-amber-600 {
          color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-900.text-white,
        .rentix-accounts-receivable-page-light button.bg-slate-900,
        .rentix-accounts-receivable-page-light button.bg-emerald-600,
        .rentix-accounts-receivable-page-light button.bg-orange-500,
        .rentix-accounts-receivable-page-light button.bg-red-600 {
          color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light .bg-slate-900:not(button):not(.text-white) {
          background-color: #ffffff !important;
        }

        .rentix-accounts-receivable-page-light .bg-gradient-to-r.from-slate-50,
        .rentix-accounts-receivable-page-light .bg-gradient-to-r.from-emerald-50,
        .rentix-accounts-receivable-page-light .bg-gradient-to-r.from-orange-50 {
          background-image: linear-gradient(to right, #f8fafc, #ffffff) !important;
        }

        .rentix-accounts-receivable-page-black .bg-slate-900,
        .rentix-accounts-receivable-page-black .dark\:bg-slate-900,
        .rentix-accounts-receivable-page-black .dark\:bg-slate-800 {
          background-color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-black .bg-slate-50,
        .rentix-accounts-receivable-page-black .bg-slate-100,
        .rentix-accounts-receivable-page-black .bg-white {
          background-color: #0f172a !important;
        }

        .rentix-accounts-receivable-page-black .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0f172a, #111827) !important;
        }

      `}</style>

      <div
        data-rentix-theme={isBlackTheme ? "black" : "light"}
        className={
          isBlackTheme
            ? "rentix-accounts-receivable-page-black space-y-8"
            : "rentix-accounts-receivable-page-light space-y-8"
        }
      >
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-slate-100">
            Contas a Receber
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Acompanhe cobranças geradas automaticamente pelos contratos ativos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card
            title="Total a Receber"
            value={formatCurrency(totalReceivable)}
          />
          <Card
            title="Total Recebido"
            value={formatCurrency(totalPaid)}
            green
          />
          <Card
            title="Total Vencido"
            value={formatCurrency(totalOverdue)}
            red
          />
          <Card title="Cobranças" value={filteredCharges.length} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Filtros Financeiros
              </h2>

              <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                Refine a visualização sem alterar os dados originais.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["All", "Pending", "Paid", "Overdue"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                      statusFilter === status
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {getStatusFilterLabel(status)}
                  </button>
                ),
              )}

              <button
                onClick={clearAllFilters}
                className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        {(selectedTenant || statusFilter !== "All") && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/30 p-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-orange-700">
                Filtro aplicado
              </p>

              <p className="text-sm text-slate-700 dark:text-slate-300">
                {selectedTenant ? (
                  <>
                    Inquilino: <strong>{selectedTenant.name}</strong>
                  </>
                ) : (
                  "Todos os inquilinos"
                )}{" "}
                · Status: <strong>{getStatusFilterLabel(statusFilter)}</strong>.
              </p>
            </div>

            <button
              onClick={clearAllFilters}
              className="rounded-xl bg-white dark:bg-slate-900 px-4 py-2 text-sm font-bold text-orange-600 shadow-sm ring-1 ring-orange-200 dark:ring-orange-900/60 transition hover:bg-orange-100 dark:hover:bg-orange-900/50 dark:bg-orange-900/40"
            >
              Remover filtros
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
          <div className="border-b border-slate-200 dark:border-slate-700 p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  Lista de Contas a Receber
                </h2>

                <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                  Visualize os recebimentos pendentes, pagos e vencidos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openCreateModal}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  Nova cobrança
                </button>

                <button
                  onClick={openReportModal}
                  className="rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-bold text-[#ffffff] shadow-sm transition hover:bg-[#1e293b]"
                >
                  Relatório PDF
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Buscar inquilino
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-orange-50 dark:bg-orange-950/30">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Imóvel
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Inquilino
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Vencimento
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Valor
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Status
                  </th>

                  <th className="px-5 py-4 text-center text-sm font-black text-slate-900 dark:text-slate-100">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredCharges.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500"
                    >
                      Nenhuma conta a receber encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((charge) => (
                    <tr
                      key={charge.id}
                      className="border-t border-slate-100 dark:border-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {charge.property}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
                        {charge.tenant}
                        {charge.installmentNumber &&
                          charge.installmentTotal && (
                            <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500">
                              {charge.installmentNumber}/
                              {charge.installmentTotal}
                            </span>
                          )}
                      </td>

                      <td className="px-5 py-4 text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
                        {formatDate(charge.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-center text-sm font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(charge.amount)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClassName(
                            charge.status,
                          )}`}
                        >
                          {getStatusLabel(charge.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="relative inline-flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionMenuChargeId((currentChargeId) =>
                                currentChargeId === charge.id ? null : charge.id,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Ações
                            <span className="text-xs">▼</span>
                          </button>

                          {openActionMenuChargeId === charge.id && (
                            <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl ring-1 ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuChargeId(null);
                                  openEditCharge(charge);
                                }}
                                className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Editar
                              </button>

                              {charge.status !== "Paid" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuChargeId(null);
                                    openReceivePaymentModal(charge);
                                  }}
                                  className="block w-full px-4 py-3 text-left text-sm font-bold text-orange-700 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
                                >
                                  Receber
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuChargeId(null);
                                  reprintPaymentCarnet(charge);
                                }}
                                className="block w-full px-4 py-3 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                              >
                                Reimprimir carnê
                              </button>

                              {charge.status === "Paid" && getChargePayment(charge.id) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuChargeId(null);
                                    reprintPaymentReceipt(charge);
                                  }}
                                  className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  Reimprimir recibo
                                </button>
                              )}

                              {charge.status === "Paid" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuChargeId(null);
                                    openEditCharge(charge);
                                  }}
                                  className="block w-full px-4 py-3 text-left text-sm font-bold text-amber-700 transition hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
                                >
                                  Ajustar pagamento
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isReportOpen && (
        <div className={`fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div
            className={`flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl shadow-2xl ring-1 ${
              isBlackTheme
                ? "bg-[#0f172a] ring-[#334155]"
                : "bg-[#ffffff] ring-[#dbe4ef]"
            }`}
          >
            <div
              className={`border-b p-6 ${
                isBlackTheme
                  ? "border-[#334155] bg-[#111827]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-lg ${
                      isBlackTheme
                        ? "bg-[#020617] shadow-black/30"
                        : "bg-[#f8fafc] shadow-slate-200/70 ring-1 ring-[#e2e8f0]"
                    }`}
                  >
                    📄
                  </div>

                  <div>
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Relatório de contas a receber
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      Visualize o relatório na tela ou gere um PDF com filtros por pessoa,
                      status, vencidas, a vencer ou período.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReportModal}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155] hover:text-[#ffffff]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                  aria-label="Fechar relatório"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-6 ${isBlackTheme ? "bg-[#0f172a]" : "bg-[#ffffff]"}`}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Pessoa/Inquilino
                  </label>

                  <select
                    value={reportTenantId}
                    onChange={(event) => {
                      setReportFormError("");
                      setReportTenantId(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
                      isBlackTheme
                        ? "border-[#334155] bg-[#020617] text-[#f8fafc] focus:border-[#64748b] focus:ring-[#334155]/40"
                        : "border-[#dbe4ef] bg-[#ffffff] text-[#0f172a] focus:border-[#0f172a] focus:ring-[#e2e8f0]"
                    }`}
                  >
                    <option value="">Todas as pessoas</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Status
                  </label>

                  <select
                    value={reportStatusFilter}
                    onChange={(event) => {
                      setReportFormError("");
                      setReportStatusFilter(event.target.value as StatusFilter);
                    }}
                    className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
                      isBlackTheme
                        ? "border-[#334155] bg-[#020617] text-[#f8fafc] focus:border-[#64748b] focus:ring-[#334155]/40"
                        : "border-[#dbe4ef] bg-[#ffffff] text-[#0f172a] focus:border-[#0f172a] focus:ring-[#e2e8f0]"
                    }`}
                  >
                    <option value="All">Todos</option>
                    <option value="Pending">Pendente</option>
                    <option value="Paid">Pago</option>
                    <option value="Overdue">Vencido</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Filtro de vencimento
                </label>

                <div className="grid gap-3 md:grid-cols-5">
                  {([
                    "All",
                    "Overdue",
                    "DueToday",
                    "Upcoming",
                    "DateRange",
                  ] as ReportDueFilter[]).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        setReportFormError("");
                        setReportDueFilter(filter);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        reportDueFilter === filter
                          ? "border-[#0f172a] bg-[#0f172a] text-[#ffffff] shadow-sm"
                          : isBlackTheme
                            ? "border-[#334155] bg-[#020617] text-[#cbd5e1] hover:bg-[#1e293b]"
                            : "border-[#dbe4ef] bg-[#ffffff] text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                      }`}
                    >
                      {getReportDueFilterLabel(filter)}
                    </button>
                  ))}
                </div>
              </div>

              {reportDueFilter === "DateRange" && (
                <div
                  className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-2 ${
                    isBlackTheme
                      ? "border-[#334155] bg-[#111827]"
                      : "border-[#dbe4ef] bg-[#f8fafc]"
                  }`}
                >
                  <div>
                    <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                      Data inicial
                    </label>

                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(event) => {
                        setReportFormError("");
                        setReportStartDate(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
                      isBlackTheme
                        ? "border-[#334155] bg-[#020617] text-[#f8fafc] focus:border-[#64748b] focus:ring-[#334155]/40"
                        : "border-[#dbe4ef] bg-[#ffffff] text-[#0f172a] focus:border-[#0f172a] focus:ring-[#e2e8f0]"
                    }`}
                    />
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                      Data final
                    </label>

                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(event) => {
                        setReportFormError("");
                        setReportEndDate(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border px-4 text-sm outline-none transition focus:ring-4 ${
                      isBlackTheme
                        ? "border-[#334155] bg-[#020617] text-[#f8fafc] focus:border-[#64748b] focus:ring-[#334155]/40"
                        : "border-[#dbe4ef] bg-[#ffffff] text-[#0f172a] focus:border-[#0f172a] focus:ring-[#e2e8f0]"
                    }`}
                    />
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#111827]"
                    : "border-[#dbe4ef] bg-[#f8fafc]"
                }`}
              >
                <p className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                  Prévia do relatório
                </p>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div
                    className={`rounded-xl p-4 ring-1 ${
                      isBlackTheme ? "bg-[#020617] ring-[#334155]" : "bg-[#ffffff] ring-[#dbe4ef]"
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Registros
                    </p>
                    <p className={`mt-1 text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {getReportFilteredCharges().length}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-4 ring-1 ${
                      isBlackTheme ? "bg-[#020617] ring-[#334155]" : "bg-[#ffffff] ring-[#dbe4ef]"
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Total filtrado
                    </p>
                    <p className={`mt-1 text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {formatCurrency(getReportTotalAmount(getReportFilteredCharges()))}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl p-4 ring-1 ${
                      isBlackTheme ? "bg-[#020617] ring-[#334155]" : "bg-[#ffffff] ring-[#dbe4ef]"
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Tipo
                    </p>
                    <p className={`mt-1 text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {getReportDueFilterLabel(reportDueFilter)}
                    </p>
                  </div>
                </div>
              </div>

              {reportFormError && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${isBlackTheme ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {reportFormError}
                </div>
              )}
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closeReportModal}
                className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isBlackTheme
                    ? "bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={viewAccountsReceivableReport}
                className={`rounded-xl px-5 py-3 text-sm font-bold shadow-sm ring-1 transition ${
                  isBlackTheme
                    ? "bg-[#020617] text-[#f8fafc] ring-[#334155] hover:bg-[#1e293b]"
                    : "bg-[#f8fafc] text-[#334155] ring-[#dbe4ef] hover:bg-[#e2e8f0]"
                }`}
              >
                Visualizar relatório
              </button>

              <button
                type="button"
                onClick={generateAccountsReceivablePdf}
                className="rounded-xl bg-[#0f172a] px-5 py-3 text-sm font-bold text-[#ffffff] shadow-sm transition hover:bg-[#1e293b]"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/300 text-xl shadow-lg shadow-orange-500/20">
                    🔎
                  </div>

                  <div>
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Buscar por Inquilino
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      Selecione um inquilino para visualizar somente as contas
                      dele.
                    </p>
                  </div>
                </div>

                <button
                  onClick={clearTenantFilter}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155] hover:text-[#ffffff]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                  aria-label="Fechar busca"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-6 ${isBlackTheme ? "bg-[#0f172a]" : "bg-[#ffffff]"}`}>
              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Nome do inquilino
                </label>

                <input
                  placeholder="Digite para buscar..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {filteredTenants.length === 0 ? (
                    <div className="rounded-xl bg-white dark:bg-slate-900 p-5 text-center text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Nenhum inquilino encontrado.
                    </div>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <button
                        key={tenant.id}
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setIsSearchOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-left shadow-sm ring-1 ring-slate-100 dark:ring-slate-700 transition hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:bg-orange-950/30 hover:ring-orange-200 dark:ring-orange-900/60"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {tenant.name}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                            Clique para filtrar as contas
                          </p>
                        </div>

                        <span className="rounded-full bg-orange-100 dark:bg-orange-900/40 px-3 py-1 text-xs font-bold text-orange-700">
                          Selecionar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 transition hover:bg-slate-100 dark:hover:bg-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={autoOpenSearch}
                  onChange={(event) => {
                    const value = event.target.checked;

                    setAutoOpenSearch(value);
                    localStorage.setItem(
                      "rentix_auto_open_search",
                      JSON.stringify(value),
                    );
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-orange-500"
                />

                <span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-200">
                    Abrir busca automaticamente ao entrar na tela
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Desmarque esta opção para não abrir a busca toda vez que
                    acessar Contas a Receber.
                  </span>
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 md:flex-row md:justify-end">
                <button
                  onClick={clearTenantFilter}
                  className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isBlackTheme
                    ? "bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
                >
                  Ver todas as contas
                </button>

                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30">
                    💰
                  </div>

                  <div>
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {editingChargeId ? "Editar cobrança" : "Nova cobrança"}
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      {editingChargeId
                        ? "Ajuste os dados da conta a receber selecionada."
                        : "Cadastre uma conta a receber avulsa, única ou parcelada."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeCreateModal}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155] hover:text-[#ffffff]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                  aria-label="Fechar cadastro"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[calc(92vh-120px)] space-y-5 overflow-y-auto p-6">
              {!editingChargeId && (
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Tipo de lançamento
                  </label>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChargeFormError("");
                        setFormLaunchType("single");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "single"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                      }`}
                    >
                      <p className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Conta única
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Lançamento avulso com apenas um vencimento.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChargeFormError("");
                        setFormLaunchType("installment");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        formLaunchType === "installment"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-4 ring-emerald-100 dark:ring-emerald-900/50"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800"
                      }`}
                    >
                      <p className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Sequência de parcelas
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Divide o valor total em parcelas editáveis.
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border p-4 ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#111827]"
                    : "border-[#dbe4ef] bg-[#f8fafc]"
                }`}
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                      Inquilino/Pessoa
                    </label>

                    <select
                      value={formTenant}
                      disabled={isEditingPaidCharge}
                      onChange={(event) => {
                        setChargeFormError("");
                        setFormTenant(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                        isEditingPaidCharge
                          ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                          : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <option value="">Selecione o inquilino/pessoa</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isEditingPaidCharge && (
                    <button
                      type="button"
                      onClick={openTenantCreateModal}
                      className="h-12 rounded-xl bg-[#0f172a] px-5 text-sm font-bold text-[#ffffff] shadow-sm transition hover:bg-slate-800"
                    >
                      NOVO
                    </button>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {isEditingPaidCharge
                    ? "Cobrança paga não permite alteração de inquilino/pessoa."
                    : "Use o botão NOVO para abrir o cadastro completo de inquilino e selecionar automaticamente no lançamento."}
                </p>
              </div>

              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Imóvel
                  <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    opcional
                  </span>
                </label>

                <select
                  value={formProperty}
                  disabled={isEditingPaidCharge}
                  onChange={(event) => {
                    setChargeFormError("");
                    setFormProperty(event.target.value);
                  }}
                  className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                    isEditingPaidCharge
                      ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <option value="">Sem imóvel vinculado</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Valor total
                  </label>

                  <input
                    placeholder="Ex: 1500,00"
                    value={formAmount}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormAmount(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Data de lançamento
                  </label>

                  <input
                    type="date"
                    value={formIssueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormIssueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Primeiro vencimento
                  </label>

                  <input
                    type="date"
                    value={formDueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormDueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>
              </div>

              {isEditingPaidCharge && (
                <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30/40 p-4">
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Data de pagamento
                  </label>

                  <input
                    type="date"
                    value={formPaymentDate}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormPaymentDate(event.target.value);
                    }}
                    className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50 md:max-w-xs"
                  />

                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Para cobrança paga, somente a data de pagamento pode ser
                    ajustada antes de salvar.
                  </p>
                </div>
              )}

              {!editingChargeId && formLaunchType === "installment" && (
                <div className="space-y-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30/40 p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
                    <div className="space-y-3">
                      <div>
                        <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                          Quantidade de parcelas
                        </label>

                        <input
                          type="number"
                          min={2}
                          value={formInstallmentQuantity}
                          onChange={(event) =>
                            setFormInstallmentQuantity(event.target.value)
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                        />
                      </div>

                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        formFirstInstallmentAsDownPayment
                          ? "border-emerald-300 bg-white text-emerald-800 ring-2 ring-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      }`}>
                        <input
                          type="checkbox"
                          checked={formFirstInstallmentAsDownPayment}
                          onChange={(event) => {
                            setChargeFormError("");
                            setFormFirstInstallmentAsDownPayment(event.target.checked);
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />

                        <span>
                          <strong className="block text-sm font-black">
                             Entrada
                          </strong>
                          <small className="mt-1 block text-xs font-semibold leading-5">
                            
                          </small>
                        </span>
                      </label>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-1 ring-emerald-100 dark:ring-emerald-900/50">
                      O sistema divide o valor total em parcelas iguais e gera
                      os vencimentos automaticamente de 30 em 30 dias. Quando a
                      primeira parcela for marcada como entrada, ela usa a data
                      de lançamento e as próximas parcelas seguem a sequência a
                      partir do primeiro vencimento.
                    </div>
                  </div>

                  {installmentPreview.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="grid grid-cols-[90px_1fr_1fr] bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        <span>Parcela</span>
                        <span>Valor</span>
                        <span>Vencimento</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {installmentPreview.map((installment) => (
                          <div
                            key={installment.id}
                            className="grid grid-cols-[90px_1fr_1fr] gap-3 px-4 py-3"
                          >
                            <div className="flex items-center text-sm font-black text-slate-900 dark:text-slate-100">
                              {installment.isDownPayment ? (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800">
                                  Entrada
                                </span>
                              ) : (
                                <>
                                  {installment.installmentNumber}/
                                  {installmentPreview.length}
                                </>
                              )}
                            </div>

                            <input
                              value={installment.amount}
                              onChange={(event) =>
                                updateInstallmentAmount(
                                  installment.id,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                            />

                            <input
                              type="date"
                              value={installment.dueDate}
                              onChange={(event) =>
                                updateInstallmentDueDate(
                                  installment.id,
                                  event.target.value,
                                )
                              }
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {chargeFormError && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${isBlackTheme ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {chargeFormError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 pt-5 md:flex-row md:items-center md:justify-between">
                {editingChargeId && (
                  <div className="flex flex-col-reverse gap-3 md:flex-row">
                    {!isEditingPaidCharge && !formContractId && (
                      <button
                        type="button"
                        onClick={openDeleteChargeConfirmation}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
                      >
                        Excluir cobrança
                      </button>
                    )}

                    {!isEditingPaidCharge && formContractId && (
                      <div className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                        Vinculada ao contrato
                      </div>
                    )}

                    {isEditingPaidCharge && (
                      <button
                        type="button"
                        onClick={openPaymentReversalConfirmation}
                        className="rounded-xl bg-amber-50 dark:bg-amber-950/300 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600"
                      >
                        Voltar para pagamento
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row md:justify-end">
                  {!isEditingPaidCharge && (
                    <button
                      onClick={closeCreateModal}
                      className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                  isBlackTheme
                    ? "bg-[#1e293b] text-[#cbd5e1] hover:bg-[#334155]"
                    : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                }`}
                    >
                      Cancelar
                    </button>
                  )}

                  <button
                    onClick={saveManualCharge}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    {editingChargeId ? "Salvar ajustes" : "Salvar cobrança"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chargePendingPaymentReceipt && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30">
                    💵
                  </div>

                  <div>
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Receber cobrança
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      Informe os dados do pagamento para confirmar o
                      recebimento.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReceivePaymentModal}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
                    isBlackTheme
                      ? "bg-[#1e293b] text-[#cbd5e1] ring-[#334155] hover:bg-[#334155] hover:text-[#ffffff]"
                      : "bg-[#ffffff] text-[#64748b] ring-[#dbe4ef] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                  }`}
                  aria-label="Fechar recebimento"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className={`flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-6 ${isBlackTheme ? "bg-[#0f172a]" : "bg-[#ffffff]"}`}>
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Cobrança selecionada
                  </p>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${getReceiptStatusClassName(
                      chargePendingPaymentReceipt,
                    )}`}
                  >
                    {getReceiptStatusLabel(chargePendingPaymentReceipt)}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-2">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingPaymentReceipt.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReceipt.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingPaymentReceipt.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Valor original:
                    </span>{" "}
                    {formatCurrency(chargePendingPaymentReceipt.amount)}
                  </p>
                </div>
              </div>

              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#020617]"
                    : "border-[#dbe4ef] bg-[#ffffff]"
                }`}
              >
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Ajustes financeiros
                    </p>
                    <h3 className={`mt-1 text-base font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Juros, desconto e total recebido
                    </h3>
                  </div>

                  <div className={`rounded-2xl px-4 py-2 text-sm font-black ring-1 ${
                    isBlackTheme
                      ? "bg-[#0f172a] text-[#f8fafc] ring-[#334155]"
                      : "bg-[#f8fafc] text-[#0f172a] ring-[#dbe4ef]"
                  }`}>
                    Original: {formatCurrency(chargePendingPaymentReceipt.amount)}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className={`mb-2 block text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Juros
                    </label>
                    <div className={`flex overflow-hidden rounded-2xl border ${
                      isBlackTheme ? "border-[#334155] bg-[#111827]" : "border-[#dbe4ef] bg-[#ffffff]"
                    }`}>
                      <input
                        placeholder={paymentInterestMode === "percentage" ? "Ex: 2,00" : "Ex: 25,00"}
                        value={paymentInterestInput}
                        onChange={(event) =>
                          updatePaymentInterestInput(
                            chargePendingPaymentReceipt,
                            event.target.value,
                          )
                        }
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => changePaymentInterestMode(chargePendingPaymentReceipt, "amount")}
                        className={`w-11 shrink-0 border-l text-xs font-black transition ${
                          paymentInterestMode === "amount"
                            ? "bg-[#0f172a] text-[#ffffff]"
                            : isBlackTheme
                              ? "border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b]"
                              : "border-[#dbe4ef] text-[#475569] hover:bg-[#f8fafc]"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => changePaymentInterestMode(chargePendingPaymentReceipt, "percentage")}
                        className={`w-11 shrink-0 border-l text-xs font-black transition ${
                          paymentInterestMode === "percentage"
                            ? "bg-[#0f172a] text-[#ffffff]"
                            : isBlackTheme
                              ? "border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b]"
                              : "border-[#dbe4ef] text-[#475569] hover:bg-[#f8fafc]"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`mb-2 block text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Desconto
                    </label>
                    <div className={`flex overflow-hidden rounded-2xl border ${
                      isBlackTheme ? "border-[#334155] bg-[#111827]" : "border-[#dbe4ef] bg-[#ffffff]"
                    }`}>
                      <input
                        placeholder={paymentDiscountMode === "percentage" ? "Ex: 10,00" : "Ex: 50,00"}
                        value={paymentDiscountInput}
                        onChange={(event) =>
                          updatePaymentDiscountInput(
                            chargePendingPaymentReceipt,
                            event.target.value,
                          )
                        }
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => changePaymentDiscountMode(chargePendingPaymentReceipt, "amount")}
                        className={`w-11 shrink-0 border-l text-xs font-black transition ${
                          paymentDiscountMode === "amount"
                            ? "bg-[#0f172a] text-[#ffffff]"
                            : isBlackTheme
                              ? "border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b]"
                              : "border-[#dbe4ef] text-[#475569] hover:bg-[#f8fafc]"
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => changePaymentDiscountMode(chargePendingPaymentReceipt, "percentage")}
                        className={`w-11 shrink-0 border-l text-xs font-black transition ${
                          paymentDiscountMode === "percentage"
                            ? "bg-[#0f172a] text-[#ffffff]"
                            : isBlackTheme
                              ? "border-[#334155] text-[#cbd5e1] hover:bg-[#1e293b]"
                              : "border-[#dbe4ef] text-[#475569] hover:bg-[#f8fafc]"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className={`block text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Valor final
                      </label>
                      <span className={`text-xs font-bold ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                        Original + juros - desconto
                      </span>
                    </div>
                    <input
                      placeholder="Ex: 250,00"
                      value={paymentFinalAmount}
                      onChange={(event) => {
                        const value = event.target.value;

                        setPaymentFormError("");
                        setPaymentFinalAmount(value);
                        updatePaymentEntriesFromFinalAmount(value);

                        if (chargePendingPaymentReceipt) {
                          updatePaymentAdjustmentsFromFinalAmount(
                            chargePendingPaymentReceipt,
                            value,
                          );
                        }
                      }}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-emerald-900/50"
                    />
                  </div>
                </div>
              </div>

              <div
                className={`rounded-3xl border p-5 shadow-sm ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#020617]"
                    : "border-[#dbe4ef] bg-[#ffffff]"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Total a receber
                    </p>
                    <p className={`mt-2 text-3xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {formatCurrency(normalizeAmount(paymentFinalAmount))}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm md:min-w-[260px]">
                    <div className="flex items-center justify-between gap-6">
                      <span className={isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}>Informado</span>
                      <strong className={isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}>{formatCurrency(getPaymentEntriesTotal())}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span className={isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}>Original</span>
                      <strong className={isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}>{formatCurrency(chargePendingPaymentReceipt.amount)}</strong>
                    </div>
                  </div>
                </div>

                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-black ${getPaymentEntriesBalanceClassName()}`}>
                  {getPaymentEntriesBalanceLabel()}
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#111827]"
                    : "border-[#dbe4ef] bg-[#f8fafc]"
                }`}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Formas de pagamento
                    </h3>

                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Permite receber com um ou mais tipos, como Pix e cartão de
                      débito no mesmo recebimento.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addPaymentEntry}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold shadow-sm transition ${
                      isBlackTheme
                        ? "border-[#334155] bg-[#020617] text-[#f8fafc] hover:bg-[#1e293b]"
                        : "border-[#dbe4ef] bg-[#ffffff] text-[#0f172a] hover:bg-[#f8fafc]"
                    }`}
                  >
                    + Adicionar forma
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {paymentEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="grid gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 md:grid-cols-[1fr_180px_auto] md:items-end"
                    >
                      <div>
                        <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                          Tipo do pagamento {index + 1}
                        </label>

                        <select
                          value={entry.method}
                          onChange={(event) =>
                            updatePaymentEntryMethod(
                              entry.id,
                              event.target.value as PaymentMethod,
                            )
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                        >
                          {paymentMethodOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                          Valor
                        </label>

                        <input
                          placeholder="Ex: 100,00"
                          value={entry.amount}
                          onChange={(event) =>
                            updatePaymentEntryAmount(entry.id, event.target.value)
                          }
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-black text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removePaymentEntry(entry.id)}
                        disabled={paymentEntries.length === 1}
                        className="h-12 rounded-xl bg-red-50 dark:bg-red-950/30 px-4 text-sm font-bold text-red-600 ring-1 ring-red-100 dark:ring-red-900/50 transition hover:bg-red-100 dark:hover:bg-red-900/50 dark:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700">
                    Total informado: {formatCurrency(getPaymentEntriesTotal())}
                  </div>

                  <div className={`rounded-xl border px-4 py-3 text-sm font-black ${getPaymentEntriesBalanceClassName()}`}>
                    {getPaymentEntriesBalanceLabel()}
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#111827]"
                    : "border-[#dbe4ef] bg-[#f8fafc]"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className={`text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Resumo do recebimento
                    </h3>
                    <p className={`mt-1 text-xs font-semibold ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Conferência automática antes de finalizar a baixa financeira.
                    </p>
                  </div>

                  <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${getReceiptStatusClassName(
                    chargePendingPaymentReceipt,
                  )}`}>
                    {getReceiptStatusLabel(chargePendingPaymentReceipt)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Original</p>
                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatCurrency(chargePendingPaymentReceipt.amount)}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Juros</p>
                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatCurrency(normalizeAmount(paymentInterest))}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Desconto</p>
                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatCurrency(normalizeAmount(paymentDiscount))}</p>
                  </div>
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Final</p>
                    <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatCurrency(normalizeAmount(paymentFinalAmount))}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                  Observação
                  <span className="ml-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    opcional
                  </span>
                </label>

                <input
                  placeholder="Ex: Pix + cartão de débito / comprovante enviado pelo WhatsApp"
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:ring-emerald-900/50"
                />
              </div>

              {paymentFormError && (
                <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${isBlackTheme ? "border-red-900/60 bg-red-950/30 text-red-300" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {paymentFormError}
                </div>
              )}
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closeReceivePaymentModal}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmReceivePayment}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30 transition hover:bg-emerald-700"
              >
                Confirmar recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentConfirmationOpen && chargePendingPaymentReceipt && (
        <div className={`fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="flex-1 overflow-y-auto p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-3xl ring-1 ring-emerald-100 dark:ring-emerald-900/50">
                ✅
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Confirmar recebimento?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Confira os dados antes de concluir. Depois de confirmar, a
                cobrança será marcada como paga.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Inquilino:</span>{" "}
                    {chargePendingPaymentReceipt.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReceipt.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Vencimento:</span>{" "}
                    {formatDate(chargePendingPaymentReceipt.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor original:</span>{" "}
                    {formatCurrency(chargePendingPaymentReceipt.amount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Dados do recebimento
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Juros:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentInterest))}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Desconto:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentDiscount))}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor final:</span>{" "}
                    {formatCurrency(normalizeAmount(paymentFinalAmount))}
                  </p>

                  <div>
                    <p className="font-black text-slate-950 dark:text-white">Formas de pagamento:</p>
                    <div className="mt-2 space-y-1">
                      {paymentEntries.map((entry) => (
                        <p key={entry.id}>
                          {getPaymentMethodLabel(entry.method)} · {formatCurrency(normalizeAmount(entry.amount))}
                        </p>
                      ))}
                    </div>
                  </div>

                  {paymentNote.trim() && (
                    <p>
                      <span className="font-black text-slate-950 dark:text-white">Observação:</span>{" "}
                      {paymentNote.trim()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closePaymentConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Conferir novamente
              </button>

              <button
                type="button"
                onClick={finishReceivePayment}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/30 transition hover:bg-emerald-700"
              >
                Sim, confirmar
              </button>
            </div>
          </div>
        </div>
      )}


      {chargePendingDeletion && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30 text-3xl ring-1 ring-red-100 dark:ring-red-900/50">
                ⚠️
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Excluir cobrança?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Esta ação removerá a cobrança selecionada do contas a receber.
                Depois de confirmar, ela não aparecerá mais na listagem.
              </p>

              <div className="mt-5 rounded-2xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-red-600">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingDeletion.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingDeletion.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingDeletion.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor:</span>{" "}
                    {formatCurrency(chargePendingDeletion.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closeDeleteChargeConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDeleteCharge}
                className="rounded-2xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 dark:shadow-red-950/30 transition hover:bg-red-700"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {chargePendingPaymentReversal && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-3xl ring-1 ring-amber-100 dark:ring-amber-900/50">
                ↩️
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Voltar cobrança para pagamento?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Esta ação removerá o status de pago da cobrança selecionada.
                Depois de confirmar, ela voltará para pendente ou vencida,
                conforme a data de vencimento.
              </p>

              <div className="mt-5 rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-amber-600">
                  Cobrança selecionada
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {chargePendingPaymentReversal.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {chargePendingPaymentReversal.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {formatDate(chargePendingPaymentReversal.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Valor:</span>{" "}
                    {formatCurrency(chargePendingPaymentReversal.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closePaymentReversalConfirmation}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmPaymentReversal}
                className="rounded-2xl bg-amber-50 dark:bg-amber-950/300 px-6 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20 dark:shadow-amber-950/30 transition hover:bg-amber-600"
              >
                Sim, voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingContractPrintRequest && (
        <div className={`fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-3xl ring-1 ring-orange-100 dark:ring-orange-900/50">
                📄
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Deseja imprimir o contrato agora?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                As parcelas do contrato foram salvas e o carnê foi aberto. Você também pode abrir o contrato vinculado para impressão.
              </p>

              <div className="mt-5 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                  Contrato vinculado
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Imóvel:</span>{" "}
                    {pendingContractPrintRequest.propertyName ||
                      properties.find((property) => String(property.id) === String(pendingContractPrintRequest.propertyId))?.name ||
                      "Não informado"}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Inquilino:</span>{" "}
                    {pendingContractPrintRequest.tenantName ||
                      tenants.find((tenant) => String(tenant.id) === String(pendingContractPrintRequest.tenantId))?.name ||
                      "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closeContractPrintQuestion}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Não, voltar para contratos
              </button>

              <button
                type="button"
                onClick={confirmContractPrintQuestion}
                className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-950/30 transition hover:bg-orange-600"
              >
                Sim, imprimir e voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {isTenantCreateOpen && (
        <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:p-4 ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="flex max-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 md:max-h-[94vh] md:rounded-3xl">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    Nova pessoa
                  </h2>

                  <p className={`mt-1 text-sm leading-6 ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                    Preencha os dados pessoais e endereço da pessoa.
                  </p>
                </div>

                <button
                  onClick={closeTenantCreateModal}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-xl font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Fechar cadastro de pessoa"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6 md:px-8">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Nome completo / Razão social
                  </label>

                  <input
                    value={tenantFormData.name}
                    onChange={(event) =>
                      updateTenantFormData("name", event.target.value)
                    }
                    placeholder={
                      tenantFormData.personType === "Company"
                        ? "Ex: Empresa LTDA"
                        : "Ex: João Silva"
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Tipo de pessoa
                  </label>

                  <select
                    value={tenantFormData.personType}
                    onChange={(event) =>
                      updateTenantPersonType(event.target.value as PersonType)
                    }
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  >
                    <option value="Individual">Pessoa física</option>
                    <option value="Company">Pessoa jurídica</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    {tenantFormData.personType === "Company" ? "CNPJ" : "CPF"}
                  </label>

                  <input
                    value={tenantFormData.cpf}
                    onChange={(event) =>
                      updateTenantFormData(
                        "cpf",
                        formatDocument(
                          event.target.value,
                          tenantFormData.personType,
                        ),
                      )
                    }
                    onBlur={() => {
                      if (tenantFormData.personType === "Company") {
                        searchCompanyByCnpj();
                      }
                    }}
                    placeholder={
                      tenantFormData.personType === "Company"
                        ? "Ex: 12.345.678/0001-90"
                        : "Ex: 123.456.789-00"
                    }
                    maxLength={tenantFormData.personType === "Company" ? 18 : 14}
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />

                  {tenantFormData.personType === "Company" && (
                    <button
                      type="button"
                      onClick={searchCompanyByCnpj}
                      disabled={isCnpjLoading}
                      className="mt-3 w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-black text-[#ffffff] shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCnpjLoading
                        ? "Buscando CNPJ..."
                        : "Buscar dados da empresa"}
                    </button>
                  )}

                  {cnpjSearchError && tenantFormData.personType === "Company" && (
                    <p className="mt-2 text-xs font-bold text-red-500">
                      {cnpjSearchError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Telefone
                  </label>

                  <input
                    value={tenantFormData.phone}
                    onChange={(event) =>
                      updateTenantFormData("phone", formatPhone(event.target.value))
                    }
                    placeholder="Ex: (69) 99999-0000"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30/50 px-5 py-4 transition hover:bg-orange-50 dark:hover:bg-orange-950/40 dark:bg-orange-950/30">
                <input
                  type="checkbox"
                  checked={tenantFormData.isTenant}
                  onChange={(event) =>
                    updateTenantFormData("isTenant", event.target.checked)
                  }
                  className="mt-1 h-5 w-5 rounded border-slate-300 accent-orange-500"
                />

                <span>
                  <span className="block text-sm font-black text-slate-800 dark:text-slate-200">
                    Esta pessoa é inquilino
                  </span>

                  <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Quando desmarcado, esta pessoa não poderá ser vinculada a
                    contratos de aluguel.
                  </span>
                </span>
              </label>

              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-orange-600">
                  Endereço
                </h3>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    CEP
                  </label>

                  <div className="flex gap-2">
                    <input
                      value={tenantFormData.zipCode}
                      onChange={(event) =>
                        updateTenantFormData(
                          "zipCode",
                          formatZipCode(event.target.value),
                        )
                      }
                      onBlur={verifyZipCode}
                      placeholder="Ex: 76940-000"
                      className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                    />

                    <button
                      type="button"
                      onClick={verifyZipCode}
                      disabled={isZipCodeLoading}
                      className="h-14 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:bg-orange-300"
                    >
                      {isZipCodeLoading ? "..." : "Buscar"}
                    </button>
                  </div>

                  {zipCodeError && (
                    <p className="mt-2 text-xs font-bold text-red-500">
                      {zipCodeError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Estado
                  </label>

                  <input
                    value={tenantFormData.state}
                    onChange={(event) =>
                      updateTenantFormData("state", event.target.value.toUpperCase())
                    }
                    placeholder="UF"
                    maxLength={2}
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Cidade
                  </label>

                  <input
                    value={tenantFormData.city}
                    onChange={(event) =>
                      updateTenantFormData("city", event.target.value)
                    }
                    placeholder="Cidade"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Logradouro
                  </label>

                  <input
                    value={tenantFormData.street}
                    onChange={(event) =>
                      updateTenantFormData("street", event.target.value)
                    }
                    placeholder="Rua, avenida..."
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Número
                  </label>

                  <input
                    value={tenantFormData.number}
                    onChange={(event) =>
                      updateTenantFormData("number", event.target.value)
                    }
                    placeholder="Número da casa"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Bairro
                  </label>

                  <input
                    value={tenantFormData.district}
                    onChange={(event) =>
                      updateTenantFormData("district", event.target.value)
                    }
                    placeholder="Bairro"
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-800 dark:text-slate-200">
                    Complemento
                  </label>

                  <input
                    value={tenantFormData.complement}
                    onChange={(event) =>
                      updateTenantFormData("complement", event.target.value)
                    }
                    placeholder="Apartamento, bloco, referência..."
                    className="h-14 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-5 md:flex-row md:justify-end md:px-8">
              <button
                type="button"
                onClick={closeTenantCreateModal}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-4 text-sm font-black text-slate-600 dark:text-slate-400 dark:text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={createTenantFromModal}
                className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 dark:shadow-orange-950/30 transition hover:bg-orange-600"
              >
                Cadastrar pessoa
              </button>
            </div>
          </div>
        </div>
      )}


      {pendingContractPrintRequest && (
        <div className={`fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${isBlackTheme ? "rentix-accounts-receivable-page-black" : "rentix-accounts-receivable-page-light"}`}>
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-3xl ring-1 ring-orange-100 dark:ring-orange-900/50">
                📝
              </div>

              <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
                Imprimir contrato agora?
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                As parcelas foram lançadas e o carnê foi aberto. Deseja abrir também o contrato vinculado antes de voltar para a tela de contratos?
              </p>

              <div className="mt-5 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 p-4 text-left">
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                  Contrato vinculado
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Tipo:</span>{" "}
                    {pendingContractPrintRequest.isTemporaryRental
                      ? "Contrato temporário"
                      : "Contrato padrão"}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Início:</span>{" "}
                    {formatContractDateForTemplate(pendingContractPrintRequest.startDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Fim:</span>{" "}
                    {formatContractDateForTemplate(pendingContractPrintRequest.endDate)}
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col-reverse gap-3 border-t p-5 md:flex-row md:justify-end ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <button
                type="button"
                onClick={closeContractPrintQuestion}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Não, voltar para contratos
              </button>

              <button
                type="button"
                onClick={confirmContractPrintQuestion}
                className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-950/30 transition hover:bg-orange-600"
              >
                Sim, imprimir e voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}

function mapApiReceivableToCharge(account: ReceivableAccount): Charge {
  return {
    id: account.id,
    contractId: account.contractId || null,
    property: account.propertyName,
    tenant: account.tenantName,
    dueDate: account.dueDate,
    amount: normalizeApiAmount(account.amount),
    status: account.status === "PAID" ? "Paid" : "Pending",
    manual: account.manual,
    issueDate: account.issueDate || undefined,
    installmentNumber: account.installmentNumber || undefined,
    installmentTotal: account.installmentTotal || undefined,
    installmentGroupId: account.installmentGroupId || undefined,
    isDownPayment: account.isDownPayment,
  };
}

function mapApiReceivableToPayments(account: ReceivableAccount): ChargePayment[] {
  return (account.payments || []).map((payment) => ({
    chargeId: account.id,
    paidAt: payment.paidAt,
    method: mapApiPaymentMethodToUi(payment.method),
    paymentItems: mapApiPaymentItemsToUi(payment.paymentItems),
    interest: normalizeApiAmount(payment.interest),
    discount: normalizeApiAmount(payment.discount),
    amountPaid: normalizeApiAmount(payment.amountPaid),
    note: payment.note || "",
  }));
}

function mapApiContractToReceivableContract(contract: ApiContract): Contract {
  return {
    id: contract.id,
    propertyId: contract.propertyId,
    propertyName: contract.propertyName || contract.property?.title || "",
    tenantId: contract.tenantId,
    tenantName: contract.tenantName || contract.tenant?.name || "",
    startDate: contract.startDate,
    endDate: contract.endDate,
    rentValue: contract.rentValue,
    status: contract.status,
    isTemporaryRental: contract.isTemporaryRental,
    checkInTime: contract.checkInTime || undefined,
    checkOutTime: contract.checkOutTime || undefined,
  };
}

function mapApiPropertyToReceivableProperty(property: ApiProperty): Property {
  return {
    id: property.id,
    name: property.title,
    zipCode: property.zipCode || "",
    state: property.state || "",
    city: property.city || "",
    street: property.address || "",
    number: property.number || "",
    district: property.district || "",
    neighborhood: property.district || "",
    complement: property.complement || "",
  };
}

function mapApiPersonToReceivableTenant(person: Person): Tenant {
  return {
    id: person.id,
    name: person.name,
    personType: person.type === "COMPANY" ? "Company" : "Individual",
    cpf: person.document,
    document: person.document,
    phone: person.phone || "",
    isTenant: true,
    state: person.state || "",
    city: person.city || "",
    street: person.address || "",
  };
}

function buildPersonAddressFromTenantForm(formData: TenantFormData) {
  return [
    formData.street.trim(),
    formData.number.trim(),
    formData.district.trim(),
    formData.complement.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

function mapUiPaymentMethodToApi(method: PaymentMethod): ApiPaymentMethod {
  const methodMap: Record<PaymentMethod, ApiPaymentMethod> = {
    Cash: "CASH",
    Pix: "PIX",
    CreditCard: "CREDIT_CARD",
    DebitCard: "DEBIT_CARD",
    BankSlip: "BANK_SLIP",
    BankTransfer: "BANK_TRANSFER",
    Other: "OTHER",
  };

  return methodMap[method];
}

function mapApiPaymentMethodToUi(method: ApiPaymentMethod): PaymentMethod {
  const methodMap: Record<ApiPaymentMethod, PaymentMethod> = {
    CASH: "Cash",
    PIX: "Pix",
    CREDIT_CARD: "CreditCard",
    DEBIT_CARD: "DebitCard",
    BANK_SLIP: "BankSlip",
    BANK_TRANSFER: "BankTransfer",
    OTHER: "Other",
  };

  return methodMap[method];
}

function mapUiPaymentItemsToApi(items: PaymentAllocation[]) {
  return items.map((item) => ({
    ...item,
    method: mapUiPaymentMethodToApi(item.method),
  }));
}

function mapApiPaymentItemsToUi(items: unknown): PaymentAllocation[] | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }

  return items
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as {
        id?: unknown;
        method?: unknown;
        amount?: unknown;
      };

      if (typeof record.method !== "string") {
        return null;
      }

      return {
        id: typeof record.id === "string" ? record.id : `payment-item-${index}`,
        method: mapApiPaymentMethodToUi(record.method as ApiPaymentMethod),
        amount: normalizeApiAmount(record.amount),
      };
    })
    .filter((item): item is PaymentAllocation => item !== null);
}

function normalizeApiAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = weights.reduce(
      (total, weight, index) => total + Number(base[index]) * weight,
      0,
    );

    const rest = sum % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstCheckDigit = calculateDigit(cnpj.slice(0, 12), firstWeights);
  const secondCheckDigit = calculateDigit(cnpj.slice(0, 13), secondWeights);

  return (
    firstCheckDigit === Number(cnpj[12]) &&
    secondCheckDigit === Number(cnpj[13])
  );
}

function Card({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: ReactNode;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{title}</p>

      <h2
        className={`mt-2 text-2xl font-black ${
          green ? "text-emerald-600" : red ? "text-red-600" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}
