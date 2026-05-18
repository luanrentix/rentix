"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  ChevronDown,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  MapPin,
  Maximize2,
  Minimize2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createContract,
  cancelContract,
  getContracts,
  finishContract as finishContractAction,
  renewContract,
  softDeleteContract,
  updateContract,
  type Contract as ApiContract,
  type ContractRenewalRecord as ApiContractRenewalRecord,
  type ContractStatus as ApiContractStatus,
  type ContractStatusReasonType as ApiContractStatusReasonType,
  type CreateContractDto,
  type UpdateContractDto,
} from "@/services/contracts.service";
import {
  createReceivableAccount,
  deleteReceivableAccount,
  getReceivableAccounts,
  updateReceivableAccount,
  type ReceivableAccount,
} from "@/services/financial.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import { getPeople, type Person as ApiPerson } from "@/services/people.service";
import { createPropertyMovement } from "@/services/property-movements.service";
import {
  getCachedCompanySettings,
  getCachedPrintTemplates,
} from "@/services/settings-cache";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import {
  createScheduleItem,
  getScheduleItems,
  updateScheduleItem,
  type ScheduleItem,
} from "@/services/schedule.service";

type ThemeMode = "light" | "black" | "graphite";

const EXPIRING_CONTRACT_DAYS_LIMIT = 30;
const DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME = "14:00";
const DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME = "12:00";
const TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY = "contrx_temporary_rental_time_defaults";
const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "contrx_receivable_from_contract";
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

type PropertyStatus = "Available" | "Rented";

type Property = {
  id: string;
  name: string;
  rentValue?: number;
  status: PropertyStatus;
  isActive?: boolean;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

type ContrxTenant = {
  id: string;
  name: string;
  isTenant?: boolean;
  isActive?: boolean;
  personType?: "Individual" | "Company";
  cpf?: string;
  document?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

type CompanySettings = {
  name?: string;
  legalName?: string;
  document?: string;
  stateRegistration?: string;
  email?: string;
  phone?: string;
  zipCode?: string;
  state?: string;
  city?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  pixKey?: string;
  contractCity?: string;
  contractDefaultNotes?: string;
};

type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

type ContractDisplayStatus = ContractStatus | "Expiring";

type ContractFilterStatus = "All" | ContractStatus | "Expiring";

type ContractDetailsTab = "Data" | "Financial" | "History" | "Prints" | "Notes";

type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

type Contract = {
  id: string;
  propertyId: string;
  propertyName: string;
  tenantId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentValue: number;
  status?: ContractStatus;
  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: "Canceled" | "Deleted" | null;
  statusReasonAt?: string | null;
  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  renewedAt?: string | null;
  renewalHistory?: ContractRenewalRecord[];
  finishedAt?: string | null;
  finishReason?: string | null;
};

type ReceivableCharge = {
  id: string;
  contractId?: string | number | null;
  property?: string;
  tenant?: string;
  dueDate?: string;
  amount?: number;
  status?: "Pending" | "Paid";
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

type PendingStatusChange = {
  contract: Contract;
  nextStatus: "Canceled" | "Deleted";
};

type ActionMenuPosition = {
  top: number;
  left: number;
};

type PropertyMovement = {
  id: string;
  propertyId: string;
  propertyName: string;
  type:
    | "ContractCreated"
    | "ContractUpdated"
    | "ContractCanceled"
    | "ContractDeleted"
    | "ContractRenewed"
    | "ContractFinished";
  description: string;
  createdAt: string;
};

export default function ContractsPage() {
  const { user } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<ContrxTenant[]>([]);
  const [receivableAccounts, setReceivableAccounts] = useState<ReceivableAccount[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormMinimized, setIsFormMinimized] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractFilterStatus>("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [printableContract, setPrintableContract] = useState<Contract | null>(null);
  const printableContractFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [isTemporaryRental, setIsTemporaryRental] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [defaultCheckInTime, setDefaultCheckInTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
  const [defaultCheckOutTime, setDefaultCheckOutTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
  const [isDefaultTimeModalOpen, setIsDefaultTimeModalOpen] = useState(false);
  const [draftDefaultCheckInTime, setDraftDefaultCheckInTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
  const [draftDefaultCheckOutTime, setDraftDefaultCheckOutTime] = useState(DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusReasonError, setStatusReasonError] = useState("");
  const [renewalContract, setRenewalContract] = useState<Contract | null>(null);
  const [renewalEndDate, setRenewalEndDate] = useState("");
  const [renewalRentValue, setRenewalRentValue] = useState("");
  const [renewalNotes, setRenewalNotes] = useState("");
  const [renewalError, setRenewalError] = useState("");
  const [finishContract, setFinishContract] = useState<Contract | null>(null);
  const [finishReason, setFinishReason] = useState("");
  const [finishReasonError, setFinishReasonError] = useState("");
  const [openActionMenuContractId, setOpenActionMenuContractId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition | null>(null);
  const [selectedContractDetails, setSelectedContractDetails] = useState<Contract | null>(null);
  const [contractDetailsActiveTab, setContractDetailsActiveTab] = useState<ContractDetailsTab>("Data");

  const isEditing = editingContractId !== null;
  const companyId = user?.companyId;
  const openActionMenuContract = useMemo(
    () =>
      openActionMenuContractId
        ? contracts.find((contract) => contract.id === openActionMenuContractId) || null
        : null,
    [contracts, openActionMenuContractId],
  );

  useEffect(() => {
    function applyStoredTheme() {
      const storedThemeSettings = getCompanyStorageItem(
        companyId,
        "contrx_theme_settings",
        "contrx_theme_settings",
      );
      const legacyTheme = getCompanyStorageItem(
        companyId,
        "contrx_theme",
        "contrx_theme",
      );

      try {
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;

        const nextTheme =
          parsedThemeSettings?.mode === "graphite" ||
          legacyTheme === "graphite" ||
          legacyTheme === "grafite"
            ? "graphite"
            : parsedThemeSettings?.mode === "black" ||
                parsedThemeSettings?.mode === "dark" ||
                legacyTheme === "black" ||
                legacyTheme === "dark"
              ? "black"
              : "light";

        setThemeMode(nextTheme);
        setIsBlackTheme(nextTheme !== "light");
      } catch {
        const nextTheme =
          legacyTheme === "graphite" || legacyTheme === "grafite"
            ? "graphite"
            : legacyTheme === "black" || legacyTheme === "dark"
              ? "black"
              : "light";

        setThemeMode(nextTheme);
        setIsBlackTheme(nextTheme !== "light");
      }
    }

    applyStoredTheme();

    window.addEventListener("storage", applyStoredTheme);
    window.addEventListener("contrx-theme-change", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
      window.removeEventListener("contrx-theme-change", applyStoredTheme);
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setContracts([]);
      setProperties([]);
      setTenants([]);
      setIsLoaded(true);
      setIsLoadingPageData(false);
      return;
    }

    loadPageData(companyId);
  }, [companyId]);


  useEffect(() => {
    const storedDefaultTimes = getCompanyStorageItem(
      companyId,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
    );

    if (!storedDefaultTimes) return;

    try {
      const parsedDefaultTimes = JSON.parse(storedDefaultTimes) as {
        checkInTime?: string;
        checkOutTime?: string;
      };

      const nextDefaultCheckInTime =
        parsedDefaultTimes.checkInTime || DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME;
      const nextDefaultCheckOutTime =
        parsedDefaultTimes.checkOutTime || DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME;

      setDefaultCheckInTime(nextDefaultCheckInTime);
      setDefaultCheckOutTime(nextDefaultCheckOutTime);
      setDraftDefaultCheckInTime(nextDefaultCheckInTime);
      setDraftDefaultCheckOutTime(nextDefaultCheckOutTime);
    } catch {
      setDefaultCheckInTime(DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
      setDefaultCheckOutTime(DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
      setDraftDefaultCheckInTime(DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME);
      setDraftDefaultCheckOutTime(DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME);
    }
  }, [companyId]);

  useEffect(() => {
    if (!isLoaded) return;

    setProperties((currentProperties) => syncPropertiesWithContracts(contracts, currentProperties));
  }, [contracts, isLoaded]);

  const availableProperties = useMemo(() => {
    return properties.filter((property) => {
      const hasActiveContract = contracts.some(
        (contract) =>
          String(contract.propertyId) === String(property.id) &&
          ["Active", "Expiring"].includes(getDisplayContractStatus(contract)) &&
          contract.status !== "Deleted"
      );

      const isCurrentEditingProperty = isEditing && String(property.id) === String(propertyId);
      const isPropertyActive = property.isActive !== false;

      return (isPropertyActive && property.status === "Available" && !hasActiveContract) || isCurrentEditingProperty;
    });
  }, [properties, contracts, isEditing, propertyId]);

  const availableTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const isTenant = tenant.isTenant !== false;
      const isActive = tenant.isActive !== false;
      return isTenant && isActive;
    });
  }, [tenants]);

  const filteredContracts = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    return contracts.filter((contract) => {
      const displayStatus = getDisplayContractStatus(contract);
      const matchesStatus =
        statusFilter === "All" ||
        displayStatus === statusFilter ||
        (statusFilter === "Active" && displayStatus === "Expiring");
      const matchesSearch =
        !normalizedSearchTerm ||
        normalizeSearchText(contract.propertyName).includes(normalizedSearchTerm) ||
        normalizeSearchText(contract.tenantName).includes(normalizedSearchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [contracts, statusFilter, searchTerm]);

  const activeContracts = contracts.filter((contract) =>
    ["Active", "Expiring"].includes(getDisplayContractStatus(contract))
  ).length;

  const expiringContracts = contracts.filter(
    (contract) => getDisplayContractStatus(contract) === "Expiring"
  ).length;

  const monthlyRevenue = contracts
    .filter((contract) => ["Active", "Expiring"].includes(getDisplayContractStatus(contract)))
    .reduce((total, contract) => total + Number(contract.rentValue || 0), 0);

  async function loadPageData(currentCompanyId: string) {
    try {
      setIsLoadingPageData(true);
      setFormError("");

      const [apiContracts, apiProperties, apiPeople, apiReceivableAccounts] = await Promise.all([
        getContracts(currentCompanyId),
        getProperties(currentCompanyId),
        getPeople(currentCompanyId),
        getReceivableAccounts(currentCompanyId),
      ]);

      const normalizedContracts = apiContracts.map(mapApiContractToContract);

      setContracts(normalizedContracts);
      setProperties(apiProperties.map((property) => mapApiPropertyToProperty(property, normalizedContracts)));
      setTenants(apiPeople.map(mapApiPersonToTenant));
      setReceivableAccounts(apiReceivableAccounts);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os contratos do backend."
      );
    } finally {
      setIsLoaded(true);
      setIsLoadingPageData(false);
    }
  }

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setIsTemporaryRental(false);
    setCheckInTime("");
    setCheckOutTime("");
    setIsDefaultTimeModalOpen(false);
    setFormError("");
    setEditingContractId(null);
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
    setRenewalContract(null);
    setRenewalEndDate("");
    setRenewalRentValue("");
    setRenewalNotes("");
    setRenewalError("");
    setFinishContract(null);
    setFinishReason("");
    setFinishReasonError("");
    setOpenActionMenuContractId(null);
    setActionMenuPosition(null);
    setSelectedContractDetails(null);
    setContractDetailsActiveTab("Data");
    setIsFormMinimized(false);
    setIsFormOpen(false);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEditContract(contract: Contract) {
    setEditingContractId(contract.id);
    setPropertyId(contract.propertyId);
    setTenantId(String(contract.tenantId));
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setRentValue(formatCurrencyInput(contract.rentValue));
    setIsTemporaryRental(contract.isTemporaryRental ?? false);
    setCheckInTime(contract.checkInTime || "");
    setCheckOutTime(contract.checkOutTime || "");
    setFormError("");
    setIsFormMinimized(false);
    setIsFormOpen(true);
  }

  function getFirstDueDateFromStartDate(dateValue: string) {
    if (!dateValue) return "";

    const dueDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(dueDate.getTime())) {
      return "";
    }

    dueDate.setMonth(dueDate.getMonth() + 1);

    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, "0");
    const day = String(dueDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function addMonthsToDate(dateValue: string, monthsToAdd: number) {
    if (!dateValue) return "";

    const nextDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(nextDate.getTime())) {
      return "";
    }

    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getContractInstallmentQuantity(startDateValue: string, endDateValue: string) {
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

  function getContractReceivableSchedule(contract: Contract) {
    if (contract.isTemporaryRental) {
      return [
        {
          dueDate: contract.startDate,
          amount: Number(contract.rentValue || 0),
          installmentNumber: 1,
          installmentTotal: 1,
        },
      ];
    }

    const installmentQuantity = getContractInstallmentQuantity(contract.startDate, contract.endDate);
    const firstDueDate = getFirstDueDateFromStartDate(contract.startDate);

    if (!firstDueDate) return [];

    return Array.from({ length: installmentQuantity }, (_, index) => ({
      dueDate: addMonthsToDate(firstDueDate, index),
      amount: Number(contract.rentValue || 0),
      installmentNumber: index + 1,
      installmentTotal: installmentQuantity,
    }));
  }

  function registerPropertyMovementFromContract(
    contract: Contract,
    type: PropertyMovement["type"],
    description: string
  ) {
    const companyId = user?.companyId;

    if (!companyId) return;

    createPropertyMovement({
      companyId,
      propertyId: String(contract.propertyId),
      propertyName: contract.propertyName,
      type,
      description,
    }).catch((error) => {
      console.warn("Nao foi possivel registrar movimentacao do imovel no backend.", error);
    });
  }

  async function applyEditedContract(updatedContract: Contract, reason?: string) {
    const shouldRemoveReceivables =
      updatedContract.status === "Canceled" || updatedContract.status === "Deleted";
    const cleanReason = reason?.trim() || updatedContract.statusReason || null;

    const contractToSave: Contract = {
      ...updatedContract,
      propertyName: toUpperText(updatedContract.propertyName),
      deletedAt:
        updatedContract.status === "Deleted"
          ? updatedContract.deletedAt || new Date().toISOString()
          : null,
      statusReason: shouldRemoveReceivables ? cleanReason : updatedContract.statusReason || null,
      statusReasonType: shouldRemoveReceivables
        ? updatedContract.status === "Deleted"
          ? "Deleted"
          : "Canceled"
        : null,
      statusReasonAt:
        shouldRemoveReceivables && cleanReason
          ? new Date().toISOString()
          : updatedContract.statusReasonAt || null,
    };

    try {
      const savedContract = await updateContract(
        contractToSave.id,
        buildContractPayload(contractToSave),
      );
      Object.assign(contractToSave, mapApiContractToContract(savedContract));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível salvar o contrato."
      );
      return;
    }

    if (shouldRemoveReceivables) {
      await removeReceivableChargesFromContract(contractToSave);
      registerPropertyMovementFromContract(
        contractToSave,
        contractToSave.status === "Deleted" ? "ContractDeleted" : "ContractCanceled",
        contractToSave.status === "Deleted"
          ? "Contrato marcado como excluído e parcelas vinculadas removidas."
          : "Contrato cancelado e parcelas vinculadas removidas."
      );
    } else {
      await syncOpenReceivableChargesFromContract(contractToSave);
      registerPropertyMovementFromContract(
        contractToSave,
        "ContractUpdated",
        "Contrato atualizado no cadastro de locação."
      );
    }

    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.id === contractToSave.id ? contractToSave : contract
      )
    );

    resetForm();
  }

  async function handleConfirmStatusReason() {
    const cleanReason = statusReason.trim();

    if (!pendingStatusChange) return;

    if (cleanReason.length < 5) {
      setStatusReasonError("Informe um motivo com pelo menos 5 caracteres para continuar.");
      return;
    }

    try {
      const savedContract =
        pendingStatusChange.nextStatus === "Deleted"
          ? await softDeleteContract(pendingStatusChange.contract.id, cleanReason)
          : await cancelContract(pendingStatusChange.contract.id, cleanReason);
      const nextContract = mapApiContractToContract(savedContract);

      setContracts((currentContracts) =>
        currentContracts.map((contract) =>
          contract.id === nextContract.id ? nextContract : contract
        )
      );
      setReceivableAccounts((currentAccounts) =>
        currentAccounts.filter(
          (account) =>
            String(account.contractId || "") !== String(nextContract.id) ||
            account.status === "PAID",
        ),
      );

      registerPropertyMovementFromContract(
        nextContract,
        pendingStatusChange.nextStatus === "Deleted" ? "ContractDeleted" : "ContractCanceled",
        pendingStatusChange.nextStatus === "Deleted"
          ? "Contrato marcado como excluído e parcelas em aberto removidas."
          : "Contrato cancelado e parcelas em aberto removidas.",
      );
    } catch (error) {
      setStatusReasonError(
        error instanceof Error
           ? error.message
          : "Não foi possível atualizar o status do contrato.",
      );
      return;
    }

    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  function handleCancelStatusReason() {
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  async function removeReceivableChargesFromContract(contract: Contract) {
    const linkedAccounts = receivableAccounts.filter(
      (account) => String(account.contractId || "") === String(contract.id),
    );

    await Promise.all(linkedAccounts.map((account) => deleteReceivableAccount(account.id)));

    setReceivableAccounts((currentAccounts) =>
      currentAccounts.filter(
        (account) => String(account.contractId || "") !== String(contract.id),
      ),
    );
  }

  async function openReceivableChargeFromContract(contract: Contract) {
    const companyId = user?.companyId;

    if (!companyId) {
      setFormError("Empresa do usuário não encontrada. Faça login novamente.");
      return;
    }

    const receivableSchedule = getContractReceivableSchedule(contract);

    if (receivableSchedule.length === 0) {
      setFormError("Data inicial do contrato inválida para gerar cobranças.");
      return;
    }

    let existingAccounts = receivableAccounts.filter(
      (account) => String(account.contractId || "") === String(contract.id),
    );

    try {
      const backendAccounts = await getReceivableAccounts(companyId);
      existingAccounts = backendAccounts.filter(
        (account) => String(account.contractId || "") === String(contract.id),
      );
      setReceivableAccounts(backendAccounts);
    } catch (error) {
      console.warn("Nao foi possivel conferir parcelas do contrato no backend.", error);
    }

    if (existingAccounts.length === 0) {
      const monthlyAmount = Number(contract.rentValue || 0);
      const totalAmount = receivableSchedule.reduce(
        (total, installment) => total + Number(installment.amount || 0),
        0,
      );
      const firstInstallment = receivableSchedule[0];

      setCompanyStorageItem(
        companyId,
        RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
        JSON.stringify({
          contractId: String(contract.id),
          tenantId: String(contract.tenantId),
          tenantName:
            contract.tenantName ||
            tenants.find((tenant) => String(tenant.id) === String(contract.tenantId))?.name ||
            "",
          propertyId: String(contract.propertyId),
          propertyName:
            contract.propertyName ||
            properties.find((property) => String(property.id) === String(contract.propertyId))?.name ||
            "",
          amount: monthlyAmount,
          monthlyAmount,
          totalAmount,
          issueDate: contract.startDate,
          dueDate: firstInstallment.dueDate,
          endDate: contract.endDate,
          installmentQuantity: receivableSchedule.length,
        }),
      );
    }

    window.location.href = `/contas-receber?fromContract=1&contractId=${encodeURIComponent(
      String(contract.id),
    )}`;
  }

  async function syncOpenReceivableChargesFromContract(contract: Contract) {
    const companyId = user?.companyId;

    if (!companyId) return;

    const receivableSchedule = getContractReceivableSchedule(contract);
    const linkedAccounts = receivableAccounts
      .filter((account) => String(account.contractId || "") === String(contract.id))
      .sort((firstAccount, secondAccount) => {
        const firstNumber = firstAccount.installmentNumber || 0;
        const secondNumber = secondAccount.installmentNumber || 0;

        return firstNumber - secondNumber;
      });
    const paidAccounts = linkedAccounts.filter((account) => account.status === "PAID");
    const openAccounts = linkedAccounts.filter((account) => account.status !== "PAID");
    const openReceivableSchedule = receivableSchedule.slice(paidAccounts.length);
    const installmentGroupId = `${contract.id}-installments`;

    const updatedAccounts = await Promise.all(
      openAccounts.slice(0, openReceivableSchedule.length).map((account, index) => {
        const installment = openReceivableSchedule[index];

        return updateReceivableAccount(account.id, {
          tenantId: String(contract.tenantId),
          property: contract.propertyName,
          tenant: contract.tenantName,
          issueDate: contract.startDate,
          dueDate: installment.dueDate,
          amount: installment.amount,
          manual: false,
          installmentNumber: installment.installmentNumber,
          installmentTotal: installment.installmentTotal,
          installmentGroupId,
          isDownPayment: false,
        });
      }),
    );

    const extraOpenAccounts = openAccounts.slice(openReceivableSchedule.length);
    await Promise.all(extraOpenAccounts.map((account) => deleteReceivableAccount(account.id)));

    const missingSchedule = openReceivableSchedule.slice(openAccounts.length);
    const createdAccounts = await Promise.all(
      missingSchedule.map((installment) =>
        createReceivableAccount({
          companyId,
          contractId: String(contract.id),
          tenantId: String(contract.tenantId),
          property: contract.propertyName,
          tenant: contract.tenantName,
          issueDate: contract.startDate,
          dueDate: installment.dueDate,
          amount: installment.amount,
          status: "PENDING",
          manual: false,
          installmentNumber: installment.installmentNumber,
          installmentTotal: installment.installmentTotal,
          installmentGroupId,
          isDownPayment: false,
        }),
      ),
    );

    const changedAccountIds = new Set([
      ...updatedAccounts.map((account) => account.id),
      ...extraOpenAccounts.map((account) => account.id),
    ]);

    setReceivableAccounts((currentAccounts) => [
      ...createdAccounts,
      ...updatedAccounts,
      ...paidAccounts,
      ...currentAccounts.filter(
        (account) =>
          String(account.contractId || "") !== String(contract.id) &&
          !changedAccountIds.has(account.id),
      ),
    ]);
  }

  async function handleSubmitContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(propertyId)
    );

    const selectedTenant = tenants.find((tenant) => String(tenant.id) === String(tenantId));

    if (!selectedProperty) {
      setFormError("Selecione um imóvel válido.");
      return;
    }

    if (selectedProperty.isActive === false) {
      setFormError("Este imóvel está inativo e não pode ser utilizado para criar ou alterar um contrato.");
      return;
    }

    const propertyHasAnotherActiveContract = contracts.some((contract) => {
      const isSameProperty = String(contract.propertyId) === String(selectedProperty.id);
      const isSameContract = isEditing && contract.id === editingContractId;
      const isActiveContract = ["Active", "Expiring"].includes(getDisplayContractStatus(contract));

      return isSameProperty && !isSameContract && isActiveContract;
    });

    if (propertyHasAnotherActiveContract) {
      setFormError("Este imóvel já possui contrato ativo e não pode ser usado em outro contrato.");
      return;
    }

    if (!selectedTenant) {
      setFormError("Selecione um inquilino válido.");
      return;
    }

    if (selectedTenant.isTenant === false) {
      setFormError("Esta pessoa não está marcada como inquilino.");
      return;
    }

    if (selectedTenant.isActive === false) {
      setFormError("Esta pessoa está inativa e não pode ser utilizada para criar ou alterar um contrato.");
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Informe a data de início e a data de fim do contrato.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError("A data de fim não pode ser menor que a data de início.");
      return;
    }

    const normalizedRentValue = parseCurrencyInput(rentValue);

    if (!normalizedRentValue || normalizedRentValue <= 0) {
      setFormError("Informe um valor de aluguel válido.");
      return;
    }

    if (isEditing) {
      const currentContract = contracts.find((contract) => contract.id === editingContractId);

      if (!currentContract) {
        setFormError("Contrato não encontrado para edição.");
        return;
      }

      const updatedContract: Contract = {
        ...currentContract,
        propertyId: selectedProperty.id,
        propertyName: toUpperText(selectedProperty.name),
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        startDate,
        endDate,
        rentValue: normalizedRentValue,
        status: currentContract.status || "Active",
        isTemporaryRental,
        checkInTime: isTemporaryRental ? checkInTime : "",
        checkOutTime: isTemporaryRental ? checkOutTime : "",
        deletedAt: currentContract.status === "Deleted" ? currentContract.deletedAt : null,
      };

      await applyEditedContract(updatedContract);
      return;
    }

    if (!companyId) {
      setFormError("Empresa não identificada. Faça login novamente.");
      return;
    }

    const newContract: Contract = {
      id: crypto.randomUUID(),
      propertyId: selectedProperty.id,
      propertyName: toUpperText(selectedProperty.name),
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      startDate,
      endDate,
      rentValue: normalizedRentValue,
      status: "Active",
      isTemporaryRental,
      checkInTime: isTemporaryRental ? checkInTime : "",
      checkOutTime: isTemporaryRental ? checkOutTime : "",
      deletedAt: null,
      statusReason: null,
      statusReasonType: null,
      statusReasonAt: null,
      renewedAt: null,
      renewalHistory: [],
      finishedAt: null,
      finishReason: null,
    };

    try {
      const savedContract = await createContract(
        buildContractPayload(newContract, companyId) as CreateContractDto,
      );
      Object.assign(newContract, mapApiContractToContract(savedContract));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Não foi possível criar o contrato."
      );
      return;
    }

    const updatedContracts = [newContract, ...contracts];

    setContracts(updatedContracts);
    registerPropertyMovementFromContract(
      newContract,
      "ContractCreated",
      "Contrato criado e imóvel vinculado à locação."
    );
    resetForm();
    await openReceivableChargeFromContract(newContract);
  }

  function handlePropertyChange(selectedPropertyId: string) {
    setPropertyId(selectedPropertyId);
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(selectedPropertyId)
    );

    if (selectedProperty) {
      setRentValue(formatCurrencyInput(selectedProperty.rentValue || 0));
    }
  }

  function handleApplyDefaultTemporaryRentalTimes() {
    setCheckInTime(defaultCheckInTime);
    setCheckOutTime(defaultCheckOutTime);
    setFormError("");
  }

  function handleOpenDefaultTimeModal() {
    setDraftDefaultCheckInTime(defaultCheckInTime);
    setDraftDefaultCheckOutTime(defaultCheckOutTime);
    setIsDefaultTimeModalOpen(true);
  }

  function handleCloseDefaultTimeModal() {
    setDraftDefaultCheckInTime(defaultCheckInTime);
    setDraftDefaultCheckOutTime(defaultCheckOutTime);
    setIsDefaultTimeModalOpen(false);
  }

  function handleSaveDefaultTemporaryRentalTimes() {
    const nextDefaultCheckInTime =
      draftDefaultCheckInTime || DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME;
    const nextDefaultCheckOutTime =
      draftDefaultCheckOutTime || DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME;

    setDefaultCheckInTime(nextDefaultCheckInTime);
    setDefaultCheckOutTime(nextDefaultCheckOutTime);
    setDraftDefaultCheckInTime(nextDefaultCheckInTime);
    setDraftDefaultCheckOutTime(nextDefaultCheckOutTime);
    setIsDefaultTimeModalOpen(false);

    setCompanyStorageItem(
      companyId,
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        checkInTime: nextDefaultCheckInTime,
        checkOutTime: nextDefaultCheckOutTime,
      })
    );
  }


  function handleToggleContractActions(
    contractId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    if (openActionMenuContractId === contractId) {
      handleCloseContractActions();
      return;
    }

    const buttonRect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const estimatedMenuHeight = 316;
    const viewportPadding = 16;
    const availableBottomSpace = window.innerHeight - buttonRect.bottom;
    const top =
      availableBottomSpace < estimatedMenuHeight
          ? Math.max(viewportPadding, buttonRect.top - estimatedMenuHeight - 6)
        : buttonRect.bottom + 8;
    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    setActionMenuPosition({ top, left });
    setOpenActionMenuContractId(contractId);
  }

  function handleCloseContractActions() {
    setOpenActionMenuContractId(null);
    setActionMenuPosition(null);
  }

  useEffect(() => {
    if (!openActionMenuContractId) return;

    function closeFloatingActionMenu() {
      handleCloseContractActions();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        closeFloatingActionMenu();
        return;
      }

      if (
        target.closest("[data-contract-action-menu]") ||
        target.closest("[data-contract-action-trigger]")
      ) {
        return;
      }

      closeFloatingActionMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeFloatingActionMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeFloatingActionMenu);
    window.addEventListener("scroll", closeFloatingActionMenu, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeFloatingActionMenu);
      window.removeEventListener("scroll", closeFloatingActionMenu, true);
    };
  }, [openActionMenuContractId]);

  function handleOpenContractDetails(contract: Contract) {
    setSelectedContractDetails(contract);
    setContractDetailsActiveTab("Data");
    setOpenActionMenuContractId(null);
  }

  function handleCloseContractDetails() {
    setSelectedContractDetails(null);
    setContractDetailsActiveTab("Data");
  }

  function getContractReceivableCharges(contract: Contract) {
    return receivableAccounts
      .filter((account) => String(account.contractId || "") === String(contract.id))
      .map(mapReceivableAccountToCharge)
      .sort((firstCharge, secondCharge) => {
        const firstDate = firstCharge.dueDate ? new Date(firstCharge.dueDate).getTime() : 0;
        const secondDate = secondCharge.dueDate ? new Date(secondCharge.dueDate).getTime() : 0;

        return firstDate - secondDate;
      });
  }

  function getContractReceivableSummary(contract: Contract) {
    const contractCharges = getContractReceivableCharges(contract);
    const paidCharges = contractCharges.filter((charge) => charge.status === "Paid");
    const pendingCharges = contractCharges.filter((charge) => charge.status !== "Paid");
    const totalAmount = contractCharges.reduce((total, charge) => total + Number(charge.amount || 0), 0);
    const paidAmount = paidCharges.reduce((total, charge) => total + Number(charge.amount || 0), 0);
    const pendingAmount = pendingCharges.reduce((total, charge) => total + Number(charge.amount || 0), 0);

    return {
      charges: contractCharges,
      paidCharges,
      pendingCharges,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }

  function canRenewContract(displayStatus: ContractDisplayStatus) {
    return ["Active", "Expiring", "Inactive"].includes(displayStatus);
  }

  function canFinishContract(displayStatus: ContractDisplayStatus) {
    return !["Finished", "Deleted", "Canceled"].includes(displayStatus);
  }

  function canCancelContract(displayStatus: ContractDisplayStatus) {
    return !["Deleted", "Canceled", "Finished"].includes(displayStatus);
  }

  function canDeleteContract(displayStatus: ContractDisplayStatus) {
    return displayStatus !== "Deleted";
  }

  function getContractScheduleMarker(contractId: string | number) {
    return `contract-due:${String(contractId)}`;
  }

  function findContractDueScheduleItem(
    scheduleItems: ScheduleItem[],
    contract: Contract,
  ) {
    const scheduleMarker = getContractScheduleMarker(contract.id);

    return (
      scheduleItems.find((item) => item.notes?.includes(scheduleMarker)) ||
      scheduleItems.find(
        (item) =>
          item.type === "Contrato" &&
          item.title === "Vencimento de contrato" &&
          item.customerName === contract.tenantName &&
          item.propertyName === contract.propertyName,
      ) ||
      null
    );
  }

  async function upsertContractDueScheduleItem(contract: Contract) {
    if (!contract.endDate) return;

    const scheduleMarker = getContractScheduleMarker(contract.id);
    const scheduleItems = await getScheduleItems();
    const existingScheduleItem = findContractDueScheduleItem(scheduleItems, contract);
    const notes = [
      `Contrato: ${contract.id}`,
      `Vencimento em ${formatDate(contract.endDate)}`,
      scheduleMarker,
    ].join("\n");
    const schedulePayload = {
      title: "Vencimento de contrato",
      customerName: contract.tenantName || "Inquilino nao informado",
      propertyName: contract.propertyName || "Imovel nao informado",
      date: contract.endDate,
      time: existingScheduleItem?.time || "08:00",
      type: "Contrato",
      status: "scheduled" as const,
      priority: "high" as const,
      responsibleName: existingScheduleItem?.responsibleName || "Administrativo",
      reminder: existingScheduleItem?.reminder || "1 dia antes",
      notes,
    };

    if (existingScheduleItem) {
      await updateScheduleItem(existingScheduleItem.id, schedulePayload);
      return;
    }

    await createScheduleItem(schedulePayload);
  }

  async function completeContractDueScheduleItem(contract: Contract) {
    const scheduleItems = await getScheduleItems();
    const existingScheduleItem = findContractDueScheduleItem(scheduleItems, contract);

    if (!existingScheduleItem || existingScheduleItem.status === "completed") {
      return;
    }

    const currentNotes = existingScheduleItem.notes || "";
    const finishedNote = `Contrato finalizado em ${formatDate(
      getDateInputValue(new Date()),
    )}.`;

    await updateScheduleItem(existingScheduleItem.id, {
      status: "completed",
      notes: currentNotes.includes(finishedNote)
        ? currentNotes
        : [currentNotes, finishedNote].filter(Boolean).join("\n"),
    });
  }

  async function trySyncContractDueSchedule(
    action: "renew" | "finish",
    contract: Contract,
  ) {
    try {
      if (action === "renew") {
        await upsertContractDueScheduleItem(contract);
        return;
      }

      await completeContractDueScheduleItem(contract);
    } catch (error) {
      console.warn("Nao foi possivel sincronizar a agenda do contrato.", error);
    }
  }

  function handleOpenStatusReasonModal(contract: Contract, nextStatus: "Canceled" | "Deleted") {
    setPendingStatusChange({
      contract: {
        ...contract,
        status: nextStatus,
        deletedAt: nextStatus === "Deleted" ? contract.deletedAt || new Date().toISOString() : null,
      },
      nextStatus,
    });
    setStatusReason("");
    setStatusReasonError("");
    handleCloseContractActions();
  }


  function handleOpenRenewalModal(contract: Contract) {
    setRenewalContract(contract);
    setRenewalEndDate(contract.endDate || "");
    setRenewalRentValue(formatCurrencyInput(contract.rentValue || 0));
    setRenewalNotes("");
    setRenewalError("");
  }

  function handleCloseRenewalModal() {
    setRenewalContract(null);
    setRenewalEndDate("");
    setRenewalRentValue("");
    setRenewalNotes("");
    setRenewalError("");
  }

  async function handleConfirmContractRenewal() {
    if (!renewalContract) return;

    const nextEndDate = renewalEndDate;
    const nextRentValue = parseCurrencyInput(renewalRentValue);

    if (!nextEndDate) {
      setRenewalError("Informe a nova data de término do contrato.");
      return;
    }

    if (new Date(nextEndDate) <= new Date(renewalContract.endDate)) {
      setRenewalError("A nova data de término precisa ser maior que a data final atual.");
      return;
    }

    if (!nextRentValue || nextRentValue <= 0) {
      setRenewalError("Informe um valor de aluguel válido para a renovação.");
      return;
    }

    try {
      const savedContract = await renewContract(renewalContract.id, {
        endDate: nextEndDate,
        rentValue: nextRentValue,
        notes: renewalNotes.trim() || undefined,
      });
      const renewedContract = mapApiContractToContract(savedContract);

      setContracts((currentContracts) =>
        currentContracts.map((contract) =>
          contract.id === renewalContract.id ? renewedContract : contract
        )
      );

      if (companyId) {
        setReceivableAccounts(await getReceivableAccounts(companyId));
      }

      await trySyncContractDueSchedule("renew", renewedContract);

      registerPropertyMovementFromContract(
        renewedContract,
        "ContractRenewed",
        `Contrato renovado até ${formatDate(nextEndDate)}.`
      );
    } catch (error) {
      setRenewalError(
        error instanceof Error ? error.message : "Não foi possível renovar o contrato."
      );
      return;
    }

    handleCloseRenewalModal();
  }

  function handleOpenFinishModal(contract: Contract) {
    setFinishContract(contract);
    setFinishReason("");
    setFinishReasonError("");
  }

  function handleCloseFinishModal() {
    setFinishContract(null);
    setFinishReason("");
    setFinishReasonError("");
  }

  async function handleConfirmContractFinish() {
    if (!finishContract) return;

    const cleanReason = finishReason.trim();

    if (cleanReason.length < 5) {
      setFinishReasonError("Informe um motivo com pelo menos 5 caracteres para finalizar o contrato.");
      return;
    }

    try {
      const savedContract = await finishContractAction(finishContract.id, cleanReason);
      const finishedContract = mapApiContractToContract(savedContract);

      setContracts((currentContracts) =>
        currentContracts.map((contract) =>
          contract.id === finishContract.id ? finishedContract : contract
        )
      );

      if (companyId) {
        setReceivableAccounts(await getReceivableAccounts(companyId));
      }

      await trySyncContractDueSchedule("finish", finishedContract);

      registerPropertyMovementFromContract(
        finishedContract,
        "ContractFinished",
        "Contrato finalizado e imóvel liberado para nova locação."
      );
    } catch (error) {
      setFinishReasonError(
        error instanceof Error ? error.message : "Não foi possível finalizar o contrato."
      );
      return;
    }

    handleCloseFinishModal();
  }

  function handleOpenPrintableContract(contract: Contract) {
    setPrintableContract(contract);
  }

  function handleClosePrintableContract() {
    setPrintableContract(null);
  }

  function handlePrintPrintableContract() {
    const printableFrameWindow = printableContractFrameRef.current?.contentWindow;

    if (!printableFrameWindow) {
      alert("Não foi possível carregar a visualização do contrato para impressão.");
      return;
    }

    printableFrameWindow.focus();
    printableFrameWindow.print();
  }

  function handleGeneratePrintableContractPdf() {
    const printableFrameWindow = printableContractFrameRef.current?.contentWindow;

    if (!printableFrameWindow) {
      alert("Não foi possível carregar a visualização do contrato para gerar o PDF.");
      return;
    }

    printableFrameWindow.focus();
    printableFrameWindow.print();
  }

  const contractsThemeClass =
    themeMode === "graphite"
      ? "contrx-graphite-theme"
      : isBlackTheme
        ? "contrx-black-theme"
        : "contrx-force-light";

  return (
    <>
      <style jsx global>{`
        .contrx-contracts-page.contrx-black-theme {
          color: #f8fafc;
        }

        .contrx-contracts-page.contrx-black-theme .bg-white {
          background-color: #0f172a !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-slate-50,
        .contrx-contracts-page.contrx-black-theme .bg-slate-100 {
          background-color: #111827 !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-orange-50,
        .contrx-contracts-page.contrx-black-theme .bg-orange-100,
        .contrx-contracts-page.contrx-black-theme .bg-orange-50\/50,
        .contrx-contracts-page.contrx-black-theme .bg-orange-50\/60,
        .contrx-contracts-page.contrx-black-theme .bg-orange-50\/40 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-red-50,
        .contrx-contracts-page.contrx-black-theme .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.12) !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-emerald-50,
        .contrx-contracts-page.contrx-black-theme .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-amber-50,
        .contrx-contracts-page.contrx-black-theme .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.14) !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-blue-100 {
          background-color: rgba(59, 130, 246, 0.14) !important;
        }

        .contrx-contracts-page.contrx-black-theme .bg-zinc-200 {
          background-color: #334155 !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-slate-950,
        .contrx-contracts-page.contrx-black-theme .text-slate-900,
        .contrx-contracts-page.contrx-black-theme .text-slate-800,
        .contrx-contracts-page.contrx-black-theme .text-slate-700 {
          color: #f8fafc !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-slate-600,
        .contrx-contracts-page.contrx-black-theme .text-slate-500,
        .contrx-contracts-page.contrx-black-theme .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-orange-600,
        .contrx-contracts-page.contrx-black-theme .text-orange-700,
        .contrx-contracts-page.contrx-black-theme .text-orange-800 {
          color: #fb923c !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-red-600,
        .contrx-contracts-page.contrx-black-theme .text-red-700 {
          color: #fca5a5 !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-emerald-700,
        .contrx-contracts-page.contrx-black-theme .text-emerald-800 {
          color: #6ee7b7 !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-amber-700 {
          color: #fcd34d !important;
        }

        .contrx-contracts-page.contrx-black-theme .text-blue-700 {
          color: #93c5fd !important;
        }

        .contrx-contracts-page.contrx-black-theme .border-orange-100,
        .contrx-contracts-page.contrx-black-theme .border-orange-200,
        .contrx-contracts-page.contrx-black-theme .border-red-100,
        .contrx-contracts-page.contrx-black-theme .border-red-200,
        .contrx-contracts-page.contrx-black-theme .border-emerald-200,
        .contrx-contracts-page.contrx-black-theme .border-slate-100,
        .contrx-contracts-page.contrx-black-theme .border-slate-200,
        .contrx-contracts-page.contrx-black-theme .border-slate-300 {
          border-color: #334155 !important;
        }

        .contrx-contracts-page.contrx-black-theme input,
        .contrx-contracts-page.contrx-black-theme select,
        .contrx-contracts-page.contrx-black-theme textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        .contrx-contracts-page.contrx-black-theme input::placeholder,
        .contrx-contracts-page.contrx-black-theme textarea::placeholder {
          color: #64748b !important;
        }

        .contrx-contracts-page.contrx-black-theme table,
        .contrx-contracts-page.contrx-black-theme tbody,
        .contrx-contracts-page.contrx-black-theme tr {
          background-color: #0f172a !important;
        }

        .contrx-contracts-page.contrx-black-theme thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .contrx-contracts-page.contrx-black-theme tbody tr:hover {
          background-color: #1e293b !important;
        }

        .contrx-contracts-page.contrx-graphite-theme {
          color: #f4f4f5;
        }

        .contrx-contracts-page.contrx-graphite-theme .bg-white,
        .contrx-contracts-page.contrx-graphite-theme .bg-slate-50,
        .contrx-contracts-page.contrx-graphite-theme .bg-slate-100,
        .contrx-contracts-page.contrx-graphite-theme table,
        .contrx-contracts-page.contrx-graphite-theme tbody,
        .contrx-contracts-page.contrx-graphite-theme tr {
          background-color: #27272a !important;
        }

        .contrx-contracts-page.contrx-graphite-theme .bg-orange-50,
        .contrx-contracts-page.contrx-graphite-theme .bg-orange-100,
        .contrx-contracts-page.contrx-graphite-theme .bg-orange-50\/50,
        .contrx-contracts-page.contrx-graphite-theme .bg-orange-50\/60,
        .contrx-contracts-page.contrx-graphite-theme .bg-orange-50\/40 {
          background-color: rgba(249, 115, 22, 0.18) !important;
        }

        .contrx-contracts-page.contrx-graphite-theme .text-slate-950,
        .contrx-contracts-page.contrx-graphite-theme .text-slate-900,
        .contrx-contracts-page.contrx-graphite-theme .text-slate-800,
        .contrx-contracts-page.contrx-graphite-theme .text-slate-700 {
          color: #f4f4f5 !important;
        }

        .contrx-contracts-page.contrx-graphite-theme .text-slate-600,
        .contrx-contracts-page.contrx-graphite-theme .text-slate-500,
        .contrx-contracts-page.contrx-graphite-theme .text-slate-400 {
          color: #d4d4d8 !important;
        }

        .contrx-contracts-page.contrx-graphite-theme .border-orange-100,
        .contrx-contracts-page.contrx-graphite-theme .border-orange-200,
        .contrx-contracts-page.contrx-graphite-theme .border-red-100,
        .contrx-contracts-page.contrx-graphite-theme .border-red-200,
        .contrx-contracts-page.contrx-graphite-theme .border-emerald-200,
        .contrx-contracts-page.contrx-graphite-theme .border-slate-100,
        .contrx-contracts-page.contrx-graphite-theme .border-slate-200,
        .contrx-contracts-page.contrx-graphite-theme .border-slate-300 {
          border-color: #52525b !important;
        }

        .contrx-contracts-page.contrx-graphite-theme input,
        .contrx-contracts-page.contrx-graphite-theme select,
        .contrx-contracts-page.contrx-graphite-theme textarea {
          background-color: #18181b !important;
          border-color: #52525b !important;
          color: #f4f4f5 !important;
        }

        .contrx-contracts-page.contrx-graphite-theme thead {
          background-color: rgba(249, 115, 22, 0.18) !important;
        }

        .contrx-contracts-page.contrx-graphite-theme tbody tr:hover {
          background-color: #3f3f46 !important;
        }

        .contrx-contracts-page.contrx-force-light,
        .contrx-contracts-page .contrx-force-light,
        .contrx-contracts-page.contrx-force-light .bg-white,
        .contrx-contracts-page .contrx-force-light .bg-white,
        .contrx-contracts-page.contrx-force-light .bg-slate-50,
        .contrx-contracts-page .contrx-force-light .bg-slate-50,
        .contrx-contracts-page.contrx-force-light .bg-slate-100,
        .contrx-contracts-page .contrx-force-light .bg-slate-100 {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-slate-50,
        .contrx-contracts-page .contrx-force-light .bg-slate-50,
        .contrx-contracts-page.contrx-force-light .bg-slate-100,
        .contrx-contracts-page .contrx-force-light .bg-slate-100 {
          background-color: #f8fafc !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-orange-50,
        .contrx-contracts-page .contrx-force-light .bg-orange-50,
        .contrx-contracts-page.contrx-force-light .bg-orange-100,
        .contrx-contracts-page .contrx-force-light .bg-orange-100,
        .contrx-contracts-page.contrx-force-light .bg-orange-50\/50,
        .contrx-contracts-page .contrx-force-light .bg-orange-50\/50,
        .contrx-contracts-page.contrx-force-light .bg-orange-50\/60,
        .contrx-contracts-page .contrx-force-light .bg-orange-50\/60,
        .contrx-contracts-page.contrx-force-light .bg-orange-50\/40,
        .contrx-contracts-page .contrx-force-light .bg-orange-50\/40 {
          background-color: #fff7ed !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-red-50,
        .contrx-contracts-page .contrx-force-light .bg-red-50,
        .contrx-contracts-page.contrx-force-light .bg-red-100,
        .contrx-contracts-page .contrx-force-light .bg-red-100 {
          background-color: #fef2f2 !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-emerald-50,
        .contrx-contracts-page .contrx-force-light .bg-emerald-50,
        .contrx-contracts-page.contrx-force-light .bg-emerald-100,
        .contrx-contracts-page .contrx-force-light .bg-emerald-100 {
          background-color: #ecfdf5 !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-amber-50,
        .contrx-contracts-page .contrx-force-light .bg-amber-50,
        .contrx-contracts-page.contrx-force-light .bg-amber-100,
        .contrx-contracts-page .contrx-force-light .bg-amber-100 {
          background-color: #fffbeb !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-blue-100,
        .contrx-contracts-page .contrx-force-light .bg-blue-100 {
          background-color: #dbeafe !important;
        }

        .contrx-contracts-page.contrx-force-light .text-white,
        .contrx-contracts-page .contrx-force-light .text-white,
        .contrx-contracts-page.contrx-force-light .text-slate-950,
        .contrx-contracts-page .contrx-force-light .text-slate-950,
        .contrx-contracts-page.contrx-force-light .text-slate-900,
        .contrx-contracts-page .contrx-force-light .text-slate-900,
        .contrx-contracts-page.contrx-force-light .text-slate-800,
        .contrx-contracts-page .contrx-force-light .text-slate-800,
        .contrx-contracts-page.contrx-force-light .text-slate-700,
        .contrx-contracts-page .contrx-force-light .text-slate-700 {
          color: #0f172a !important;
        }

        .contrx-contracts-page.contrx-force-light .text-slate-600,
        .contrx-contracts-page .contrx-force-light .text-slate-600,
        .contrx-contracts-page.contrx-force-light .text-slate-500,
        .contrx-contracts-page .contrx-force-light .text-slate-500,
        .contrx-contracts-page.contrx-force-light .text-slate-400,
        .contrx-contracts-page .contrx-force-light .text-slate-400 {
          color: #64748b !important;
        }

        .contrx-contracts-page.contrx-force-light .text-orange-400,
        .contrx-contracts-page .contrx-force-light .text-orange-400,
        .contrx-contracts-page.contrx-force-light .text-orange-500,
        .contrx-contracts-page .contrx-force-light .text-orange-500,
        .contrx-contracts-page.contrx-force-light .text-orange-600,
        .contrx-contracts-page .contrx-force-light .text-orange-600,
        .contrx-contracts-page.contrx-force-light .text-orange-700,
        .contrx-contracts-page .contrx-force-light .text-orange-700,
        .contrx-contracts-page.contrx-force-light .text-orange-800,
        .contrx-contracts-page .contrx-force-light .text-orange-800 {
          color: #ea580c !important;
        }

        .contrx-contracts-page.contrx-force-light .text-red-300,
        .contrx-contracts-page .contrx-force-light .text-red-300,
        .contrx-contracts-page.contrx-force-light .text-red-600,
        .contrx-contracts-page .contrx-force-light .text-red-600,
        .contrx-contracts-page.contrx-force-light .text-red-700,
        .contrx-contracts-page .contrx-force-light .text-red-700 {
          color: #dc2626 !important;
        }

        .contrx-contracts-page.contrx-force-light .text-emerald-700,
        .contrx-contracts-page .contrx-force-light .text-emerald-700 {
          color: #047857 !important;
        }

        .contrx-contracts-page.contrx-force-light .text-amber-700,
        .contrx-contracts-page .contrx-force-light .text-amber-700 {
          color: #b45309 !important;
        }

        .contrx-contracts-page.contrx-force-light .border-orange-100,
        .contrx-contracts-page .contrx-force-light .border-orange-100,
        .contrx-contracts-page.contrx-force-light .border-orange-200,
        .contrx-contracts-page .contrx-force-light .border-orange-200 {
          border-color: #fed7aa !important;
        }

        .contrx-contracts-page.contrx-force-light .border-slate-100,
        .contrx-contracts-page .contrx-force-light .border-slate-100,
        .contrx-contracts-page.contrx-force-light .border-slate-200,
        .contrx-contracts-page .contrx-force-light .border-slate-200,
        .contrx-contracts-page.contrx-force-light .border-slate-300,
        .contrx-contracts-page .contrx-force-light .border-slate-300,
        .contrx-contracts-page.contrx-force-light .border-slate-700,
        .contrx-contracts-page .contrx-force-light .border-slate-700,
        .contrx-contracts-page.contrx-force-light .border-slate-800,
        .contrx-contracts-page .contrx-force-light .border-slate-800 {
          border-color: #e2e8f0 !important;
        }

        .contrx-contracts-page.contrx-force-light input,
        .contrx-contracts-page .contrx-force-light input,
        .contrx-contracts-page.contrx-force-light select,
        .contrx-contracts-page .contrx-force-light select,
        .contrx-contracts-page.contrx-force-light textarea,
        .contrx-contracts-page .contrx-force-light textarea {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #334155 !important;
          color-scheme: light !important;
        }

        .contrx-contracts-page.contrx-force-light input::placeholder,
        .contrx-contracts-page .contrx-force-light input::placeholder,
        .contrx-contracts-page.contrx-force-light textarea::placeholder,
        .contrx-contracts-page .contrx-force-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .contrx-contracts-page.contrx-force-light .bg-slate-900,
        .contrx-contracts-page .contrx-force-light .bg-slate-900,
        .contrx-contracts-page.contrx-force-light .bg-slate-950,
        .contrx-contracts-page .contrx-force-light .bg-slate-950,
        .contrx-contracts-page.contrx-force-light .bg-slate-800,
        .contrx-contracts-page .contrx-force-light .bg-slate-800,
        .contrx-contracts-page.contrx-force-light .bg-slate-700,
        .contrx-contracts-page .contrx-force-light .bg-slate-700 {
          background-color: #f8fafc !important;
        }

        .contrx-contracts-page.contrx-force-light button.bg-slate-900,
        .contrx-contracts-page .contrx-force-light button.bg-slate-900,
        .contrx-contracts-page.contrx-force-light button.bg-slate-800,
        .contrx-contracts-page .contrx-force-light button.bg-slate-800,
        .contrx-contracts-page.contrx-force-light button.bg-slate-700,
        .contrx-contracts-page .contrx-force-light button.bg-slate-700 {
          background-color: #f1f5f9 !important;
          color: #475569 !important;
        }

        .contrx-contracts-page.contrx-force-light button.bg-orange-500,
        .contrx-contracts-page .contrx-force-light button.bg-orange-500 {
          background-color: #f97316 !important;
          color: #ffffff !important;
        }

        .contrx-contracts-page.contrx-force-light button.bg-orange-500:hover,
        .contrx-contracts-page .contrx-force-light button.bg-orange-500:hover {
          background-color: #ea580c !important;
        }

        .contrx-contracts-page.contrx-force-light button.bg-red-500,
        .contrx-contracts-page .contrx-force-light button.bg-red-500 {
          background-color: #ef4444 !important;
          color: #ffffff !important;
        }

        .contrx-contracts-page.contrx-force-light button.bg-red-500:hover,
        .contrx-contracts-page .contrx-force-light button.bg-red-500:hover {
          background-color: #dc2626 !important;
        }
      `}</style>
      <div data-contrx-theme={themeMode} className={`contrx-contracts-page space-y-8 ${contractsThemeClass}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Contratos
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie os contratos de locação e mantenha o financeiro integrado.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo contrato
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={<FileText className="h-5 w-5" />} title="Contratos ativos" value={activeContracts} detail="Inclui vencendo" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} title="Vencendo" value={expiringContracts} detail={`Até ${EXPIRING_CONTRACT_DAYS_LIMIT} dias`} />
          <SummaryCard icon={<DollarSign className="h-5 w-5" />} title="Receita mensal" value={formatCurrency(monthlyRevenue)} detail="Contratos ativos" />
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Contratos cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredContracts.length} de {contracts.length} contrato(s)
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[1fr_240px] xl:max-w-3xl">
              <FormField label="Buscar contrato">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por imóvel ou inquilino"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as ContractFilterStatus)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="Active">Ativos</option>
                  <option value="Expiring">Vencendo</option>
                  <option value="Inactive">Inativos</option>
                  <option value="Canceled">Cancelados</option>
                  <option value="Finished">Finalizados</option>
                  <option value="Deleted">Excluídos</option>
                  <option value="All">Todos</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Imóvel</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Inquilino</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Início</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Fim</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Valor</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Tipo</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => {
                  const displayStatus = getDisplayContractStatus(contract);

                  return (
                    <tr
                      key={contract.id}
                      className={`transition hover:bg-slate-50 ${
                        displayStatus === "Deleted"
                          ? "bg-slate-50 opacity-70"
                          : displayStatus === "Expiring"
                            ? "bg-amber-50"
                            : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-black text-slate-900">
                        {contract.propertyName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {contract.tenantName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {formatDate(contract.startDate)}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>{formatDate(contract.endDate)}</span>
                          {displayStatus === "Expiring" && (
                            <span className="text-xs font-black text-amber-700">
                              Vence em {getDaysUntilDate(contract.endDate)} dia(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-black text-slate-900">
                        {formatCurrency(contract.rentValue)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            contract.isTemporaryRental
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {contract.isTemporaryRental ? "Temporário" : "Padrão"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={displayStatus} />
                          {(displayStatus === "Canceled" || displayStatus === "Deleted") &&
                            contract.statusReason && (
                              <span className="max-w-[220px] text-xs font-semibold text-slate-500">
                                Motivo: {contract.statusReason}
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-4 align-top">
                        <div className="flex justify-end">
                          <div className="relative flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={(event) => handleToggleContractActions(contract.id, event)}
                              data-contract-action-trigger
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                              aria-expanded={openActionMenuContractId === contract.id}
                              aria-label={`Abrir ações do contrato ${contract.propertyName || contract.id}`}
                            >
                              Ações
                              <span
                                className={`text-xs transition ${
                                  openActionMenuContractId === contract.id ? "rotate-180" : ""
                                }`}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </span>
                            </button>

                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {isLoadingPageData && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                      Carregando contratos do backend...
                    </td>
                  </tr>
                )}

                {!isLoadingPageData && filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm font-semibold text-slate-500">
                      Nenhum contrato encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {openActionMenuContract && actionMenuPosition && (
          <ContractActionMenu
            contract={openActionMenuContract}
            displayStatus={getDisplayContractStatus(openActionMenuContract)}
            position={actionMenuPosition}
            canRenew={canRenewContract(getDisplayContractStatus(openActionMenuContract))}
            canFinish={canFinishContract(getDisplayContractStatus(openActionMenuContract))}
            canCancel={canCancelContract(getDisplayContractStatus(openActionMenuContract))}
            canDelete={canDeleteContract(getDisplayContractStatus(openActionMenuContract))}
            onDetails={() => handleOpenContractDetails(openActionMenuContract)}
            onRenew={() => {
              handleCloseContractActions();
              handleOpenRenewalModal(openActionMenuContract);
            }}
            onFinish={() => {
              handleCloseContractActions();
              handleOpenFinishModal(openActionMenuContract);
            }}
            onCancel={() => handleOpenStatusReasonModal(openActionMenuContract, "Canceled")}
            onPrint={() => {
              handleCloseContractActions();
              handleOpenPrintableContract(openActionMenuContract);
            }}
            onEdit={() => {
              handleCloseContractActions();
              handleEditContract(openActionMenuContract);
            }}
            onDelete={() => handleOpenStatusReasonModal(openActionMenuContract, "Deleted")}
          />
        )}

        {selectedContractDetails && (() => {
          const detailsDisplayStatus = getDisplayContractStatus(selectedContractDetails);
          const detailsProperty = properties.find((property) => String(property.id) === String(selectedContractDetails.propertyId));
          const detailsTenant = tenants.find((tenant) => String(tenant.id) === String(selectedContractDetails.tenantId));
          const receivableSummary = getContractReceivableSummary(selectedContractDetails);
          const detailsTabs: { id: ContractDetailsTab; label: string; icon: React.ReactNode }[] = [
            { id: "Data", label: "Dados", icon: <MapPin className="h-4 w-4" /> },
            { id: "Financial", label: "Financeiro", icon: <DollarSign className="h-4 w-4" /> },
            { id: "History", label: "Histórico", icon: <Clock className="h-4 w-4" /> },
            { id: "Prints", label: "Impressos", icon: <FileText className="h-4 w-4" /> },
            { id: "Notes", label: "Observações", icon: <Pencil className="h-4 w-4" /> },
          ];

          return (
            <div className="fixed inset-0 z-[72] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
              <div className={`flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl ${contractsThemeClass}`}>
                <div className="border-b border-slate-100 bg-white px-6 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                        Detalhes do contrato
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h2 className="text-3xl font-black text-slate-950">
                          {selectedContractDetails.propertyName || "Contrato"}
                        </h2>
                        <StatusBadge status={detailsDisplayStatus} />
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${selectedContractDetails.isTemporaryRental ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>
                          {selectedContractDetails.isTemporaryRental ? "Temporário" : "Padrão residencial"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {selectedContractDetails.tenantName || "Inquilino não informado"} ⬢ {formatDate(selectedContractDetails.startDate)} até {formatDate(selectedContractDetails.endDate)}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCloseContractDetails}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                        title="Fechar detalhes"
                        aria-label="Fechar detalhes"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-100 bg-slate-50 px-6 py-3">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detailsTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setContractDetailsActiveTab(tab.id)}
                        className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-black transition ${
                          contractDetailsActiveTab === tab.id
                              ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                            : "bg-white text-slate-600 ring-1 ring-slate-100 hover:bg-orange-50 hover:text-orange-700"
                        }`}
                      >
                        <span className="mr-2 inline-flex align-[-2px]">{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6">
                  {contractDetailsActiveTab === "Data" && (
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      <DetailCard title="Imóvel" value={selectedContractDetails.propertyName || "Não informado"} detail={formatFullAddressForPrint({
                        street: detailsProperty?.street,
                        number: detailsProperty?.number,
                        neighborhood: detailsProperty?.neighborhood,
                        city: detailsProperty?.city,
                        state: detailsProperty?.state,
                        zipCode: detailsProperty?.zipCode,
                        complement: detailsProperty?.complement,
                      }) || "Endereço não informado"} />
                      <DetailCard title="Inquilino" value={selectedContractDetails.tenantName || "Não informado"} detail={detailsTenant?.phone || detailsTenant?.email || "Contato não informado"} />
                      <DetailCard title="Valor do aluguel" value={formatCurrency(selectedContractDetails.rentValue)} detail="Valor base do contrato" />
                      <DetailCard title="Período" value={`${formatDate(selectedContractDetails.startDate)} até ${formatDate(selectedContractDetails.endDate)}`} detail={`${getContractDurationInMonths(selectedContractDetails.startDate, selectedContractDetails.endDate)} mês(es) / ${getContractDurationInDays(selectedContractDetails.startDate, selectedContractDetails.endDate)} dia(s)`} />
                      <DetailCard
                        title="Tipo"
                        value={selectedContractDetails.isTemporaryRental ? "Locação temporária" : "Contrato padrão residencial"}
                        detail={
                          selectedContractDetails.isTemporaryRental
                            ? `Entrada ${selectedContractDetails.checkInTime || "--:--"} / Saída ${selectedContractDetails.checkOutTime || "--:--"}`
                            : "Modelo residencial padrão"
                        }
                      />
                      <DetailCard title="Status atual" value={getContractStatusLabel(detailsDisplayStatus)} detail={detailsDisplayStatus === "Expiring" ? `Vence em ${getDaysUntilDate(selectedContractDetails.endDate)} dia(s)` : "Controle operacional do contrato"} />
                    </div>
                  )}

                  {contractDetailsActiveTab === "Financial" && (
                    <div className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-3">
                        <DetailCard title="Total vinculado" value={formatCurrency(receivableSummary.totalAmount)} detail={`${receivableSummary.charges.length} parcela(s) encontrada(s)`} />
                        <DetailCard title="Total recebido" value={formatCurrency(receivableSummary.paidAmount)} detail={`${receivableSummary.paidCharges.length} parcela(s) paga(s)`} />
                        <DetailCard title="Total em aberto" value={formatCurrency(receivableSummary.pendingAmount)} detail={`${receivableSummary.pendingCharges.length} parcela(s) pendente(s)`} />
                      </div>

                      <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white">
                        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                          <h3 className="text-lg font-black text-slate-950">Parcelas vinculadas</h3>
                          <p className="mt-1 text-sm font-semibold text-slate-500">Cobranças geradas no Contas a Receber para este contrato.</p>
                        </div>

                        {receivableSummary.charges.length === 0 ? (
                          <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500">
                            Nenhuma parcela vinculada encontrada para este contrato.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left">
                              <thead className="bg-orange-50">
                                <tr>
                                  <th className="px-5 py-3 text-xs font-black uppercase text-slate-600">Parcela</th>
                                  <th className="px-5 py-3 text-xs font-black uppercase text-slate-600">Vencimento</th>
                                  <th className="px-5 py-3 text-xs font-black uppercase text-slate-600">Valor</th>
                                  <th className="px-5 py-3 text-xs font-black uppercase text-slate-600">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {receivableSummary.charges.map((charge) => {
                                  const isPaid = charge.status === "Paid";

                                  return (
                                    <tr key={charge.id}>
                                      <td className="px-5 py-4 text-sm font-black text-slate-900">
                                        {charge.installmentNumber && charge.installmentTotal
                                          ? `${charge.installmentNumber}/${charge.installmentTotal}`
                                          : "1/1"}
                                      </td>
                                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                                        {charge.dueDate ? new Date(charge.dueDate).toLocaleDateString("pt-BR") : "-"}
                                      </td>
                                      <td className="px-5 py-4 text-sm font-black text-slate-900">
                                        {formatCurrency(Number(charge.amount || 0))}
                                      </td>
                                      <td className="px-5 py-4">
                                        <span className={`rounded-full px-3 py-1 text-xs font-black ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                          {isPaid ? "Pago" : "Em aberto"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {contractDetailsActiveTab === "History" && (
                    <div className="space-y-4">
                      <TimelineItem icon={<FileText className="h-5 w-5" />} title="Contrato criado" description="Contrato registrado no módulo de contratos e imóvel vinculado à locação." date={formatDate(selectedContractDetails.startDate)} />

                      {(selectedContractDetails.renewalHistory || []).map((renewal, index) => (
                        <TimelineItem
                          key={`${renewal.renewedAt}-${index}`}
                          icon={<RefreshCw className="h-5 w-5" />}
                          title="Contrato renovado"
                          description={`De ${formatDate(renewal.previousEndDate)} para ${formatDate(renewal.newEndDate)} - Valor: ${formatCurrency(renewal.previousRentValue)} para ${formatCurrency(renewal.newRentValue)}${renewal.notes ? ` - ${renewal.notes}` : ""}`}
                          date={new Date(renewal.renewedAt).toLocaleString("pt-BR")}
                        />
                      ))}

                      {selectedContractDetails.finishedAt && (
                        <TimelineItem icon={<CheckCircle className="h-5 w-5" />} title="Contrato finalizado" description={selectedContractDetails.finishReason || "Contrato finalizado."} date={new Date(selectedContractDetails.finishedAt).toLocaleString("pt-BR")} />
                      )}

                      {selectedContractDetails.statusReason && (
                        <TimelineItem
                          icon={selectedContractDetails.statusReasonType === "Deleted" ? <Trash2 className="h-5 w-5" /> : <Ban className="h-5 w-5" />}
                          title={selectedContractDetails.statusReasonType === "Deleted" ? "Contrato excluído" : "Contrato cancelado"}
                          description={selectedContractDetails.statusReason}
                          date={selectedContractDetails.statusReasonAt ? new Date(selectedContractDetails.statusReasonAt).toLocaleString("pt-BR") : "Data não informada"}
                        />
                      )}
                    </div>
                  )}

                  {contractDetailsActiveTab === "Prints" && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="rounded-3xl border border-orange-100 bg-orange-50 p-6">
                        <p className="text-sm font-black uppercase tracking-wide text-orange-600">Contrato</p>
                        <h3 className="mt-3 text-2xl font-black text-slate-950">
                           {selectedContractDetails.isTemporaryRental ? "Contrato temporário" : "Contrato padrão residencial"}
                        </h3>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          Usa o mesmo modelo configurado na ferramenta de contratos e em Configurações &gt; Impresso.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintableContract(selectedContractDetails)}
                          className="mt-5 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                        >
                          Abrir impressão do contrato
                        </button>
                      </div>

                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
                        <p className="text-sm font-black uppercase tracking-wide text-slate-500">Carnê</p>
                        <h3 className="mt-3 text-2xl font-black text-slate-950">Parcelas financeiras</h3>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          O carnê permanece no módulo Contas a Receber para manter o fluxo financeiro centralizado.
                        </p>
                        <button
                          type="button"
                          onClick={() => (window.location.href = "/contas-receber")}
                          className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-md shadow-slate-100 transition hover:bg-slate-800"
                        >
                          Ir para Contas a Receber
                        </button>
                      </div>
                    </div>
                  )}

                  {contractDetailsActiveTab === "Notes" && (
                    <div className="grid gap-5 md:grid-cols-2">
                      <DetailCard title="Motivo / observação de status" value={selectedContractDetails.statusReason || selectedContractDetails.finishReason || "Sem observações registradas"} detail="Informações salvas em cancelamento, exclusão ou finalização." />
                      <DetailCard
                        title="Última renovação"
                        value={selectedContractDetails.renewedAt ? new Date(selectedContractDetails.renewedAt).toLocaleString("pt-BR") : "Sem renovação registrada"}
                        detail={`${selectedContractDetails.renewalHistory?.length || 0} renovação(ões) no histórico`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}


        {renewalContract && (
          <div className="fixed inset-0 z-[68] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-2xl rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-2xl ${contractsThemeClass}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
                <RefreshCw className="h-8 w-8" />
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Renovar contrato
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Atualize a data final e, se necessário, o valor do aluguel para manter o contrato ativo.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-black text-slate-900">
                  {renewalContract.propertyName || "Contrato"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {renewalContract.tenantName || "Inquilino não informado"} ⬢ Vence em {formatDate(renewalContract.endDate)}
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FormField label="Nova data final" required>
                  <input
                    type="date"
                    value={renewalEndDate}
                    onChange={(event) => {
                      setRenewalEndDate(event.target.value);
                      setRenewalError("");
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </FormField>

                <FormField label="Novo valor do aluguel" required>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={renewalRentValue}
                    onChange={(event) => {
                      setRenewalRentValue(formatCurrencyInput(event.target.value));
                      setRenewalError("");
                    }}
                    placeholder="R$ 0,00"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </FormField>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Observação da renovação
                </label>
                <textarea
                  value={renewalNotes}
                  onChange={(event) => setRenewalNotes(event.target.value)}
                  placeholder="Opcional: descreva alguma condição da renovação"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {renewalError && (
                <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {renewalError}
                </div>
              )}

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseRenewalModal}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmContractRenewal}
                  className="rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-md shadow-emerald-100 transition hover:bg-emerald-700"
                >
                  Confirmar renovação
                </button>
              </div>
            </div>
          </div>
        )}

        {finishContract && (
          <div className="fixed inset-0 z-[68] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl ${contractsThemeClass}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                <CheckCircle className="h-8 w-8" />
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Finalizar contrato
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Ao confirmar, o contrato será finalizado e o imóvel ficará disponível para uma nova locação.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-black text-slate-900">
                  {finishContract.propertyName || "Contrato"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {finishContract.tenantName || "Inquilino não informado"}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Motivo da finalização
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <textarea
                  value={finishReason}
                  onChange={(event) => {
                    setFinishReason(event.target.value);
                    setFinishReasonError("");
                  }}
                  placeholder="Descreva o motivo da finalização do contrato"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                {finishReasonError && (
                  <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {finishReasonError}
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseFinishModal}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmContractFinish}
                  className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {printableContract && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className={`flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl ${contractsThemeClass}`}>
              <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                    {printableContract.isTemporaryRental ? "Contrato temporário" : "Contrato padrão residencial"}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    Visualização do contrato
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Confira o documento antes de gerar PDF ou imprimir.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleClosePrintableContract}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleGeneratePrintableContractPdf}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-md shadow-slate-100 transition hover:bg-slate-800"
                  >
                    Gerar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPrintableContract}
                    className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Imprimir
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-slate-100 p-4">
                <iframe
                  ref={printableContractFrameRef}
                  title={
                    printableContract.isTemporaryRental
                        ? "Visualização do contrato temporário"
                      : "Visualização do contrato padrão residencial"
                  }
                  srcDoc={
                    printableContract.isTemporaryRental
                         ? buildTemporaryRentalContractHtml(
                          printableContract,
                          properties.find((property) => String(property.id) === String(printableContract.propertyId)),
                          tenants.find((tenant) => String(tenant.id) === String(printableContract.tenantId)),
                          false
                        )
                      : buildStandardResidentialContractHtml(
                          printableContract,
                          properties.find((property) => String(property.id) === String(printableContract.propertyId)),
                          tenants.find((tenant) => String(tenant.id) === String(printableContract.tenantId)),
                          false
                        )
                  }
                  className="h-[72vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {pendingStatusChange && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl ${contractsThemeClass}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
                {pendingStatusChange.nextStatus === "Deleted" ? (
                  <Trash2 className="h-8 w-8" />
                ) : (
                  <Ban className="h-8 w-8" />
                )}
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  {pendingStatusChange.nextStatus === "Deleted"
                      ? "Motivo da exclusão"
                    : "Motivo do cancelamento"}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Ao confirmar, as parcelas em aberto vinculadas a este contrato serão removidas do Contas a Receber para manter o financeiro consistente.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-black text-slate-900">
                  {pendingStatusChange.contract.propertyName || "Contrato"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {pendingStatusChange.contract.tenantName || "Inquilino não informado"}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Motivo
                  <span className="ml-1 text-red-500">*</span>
                </label>
                <textarea
                  value={statusReason}
                  onChange={(event) => {
                    setStatusReason(event.target.value);
                    setStatusReasonError("");
                  }}
                  placeholder={
                    pendingStatusChange.nextStatus === "Deleted"
                       ? "Descreva o motivo da exclusão do contrato"
                      : "Descreva o motivo do cancelamento do contrato"
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                {statusReasonError && (
                  <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {statusReasonError}
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancelStatusReason}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmStatusReason}
                  className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}


        {isDefaultTimeModalOpen && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-[2rem] border border-orange-100 bg-white p-8 shadow-2xl ${contractsThemeClass}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-orange-600">
                <Pencil className="h-8 w-8" />
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  Editar horário padrão
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Defina os horários que serão preenchidos ao clicar em Usar padrão.
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FormField label="Entrada padrão">
                  <input
                    type="time"
                    value={draftDefaultCheckInTime}
                    onChange={(event) => setDraftDefaultCheckInTime(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </FormField>

                <FormField label="Saída padrão">
                  <input
                    type="time"
                    value={draftDefaultCheckOutTime}
                    onChange={(event) => setDraftDefaultCheckOutTime(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </FormField>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCloseDefaultTimeModal}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveDefaultTemporaryRentalTimes}
                  className="rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                >
                  Salvar padrão
                </button>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && isFormMinimized && (
          <div className="contrx-minimized-modal fixed bottom-6 right-6 z-50 w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border-2 border-orange-300 bg-white shadow-2xl">
            <div className="h-2 bg-orange-500" />
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-orange-700">
                      Minimizado
                    </span>
                    <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgb(249_115_22/0.16)]" />
                  </div>
                  <p className="truncate text-base font-black text-slate-950">
                    {isEditing ? "Editar contrato" : "Novo contrato"}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-500">
                    {properties.find((property) => String(property.id) === String(propertyId))?.name || "Contrato em andamento"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormMinimized(false)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                    title="Restaurar modal"
                    aria-label="Restaurar modal"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                    title="Fechar modal"
                    aria-label="Fechar modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && !isFormMinimized && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className={`max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl ${contractsThemeClass}`}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {isEditing ? "Editar contrato" : "Novo contrato"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados do contrato.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormMinimized(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                    title="Minimizar modal"
                    aria-label="Minimizar modal"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                    title="Fechar modal"
                    aria-label="Fechar modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmitContract}>
                <div className="p-8">
                  {formError && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Imóvel" required>
                      <select
                        value={propertyId}
                        onChange={(event) => handlePropertyChange(event.target.value)}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um imóvel</option>

                        {availableProperties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {getPropertyOptionLabel(property)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Inquilino" required>
                      <select
                        value={tenantId}
                        onChange={(event) => {
                          setTenantId(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um inquilino</option>
                        {availableTenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Valor aluguel" required>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={rentValue}
                        onChange={(event) => {
                          setRentValue(formatCurrencyInput(event.target.value));
                          setFormError("");
                        }}
                        placeholder="R$ 0,00"
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data início" required>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data fim" required>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                          setEndDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <div className="rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4">
                      <p className="text-sm font-black text-slate-800">Status automático</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        O contrato novo entra como ativo. Cancelamento, finalização e exclusão ficam nas ações do contrato, sempre com registro de motivo quando necessário.
                      </p>
                    </div>
                  </div>

                  <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 transition hover:bg-orange-50">
                    <input
                      type="checkbox"
                      checked={isTemporaryRental}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setIsTemporaryRental(checked);

                        if (!checked) {
                          setCheckInTime("");
                          setCheckOutTime("");
                        }
                      }}
                      className="mt-1 h-5 w-5 rounded border-slate-300 accent-orange-500"
                    />

                    <div>
                      <p className="text-sm font-black text-slate-800">
                        Este contrato é de locação temporária
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Use esta opção para contratos de curto prazo. Esta marcação será utilizada na impressão e no modelo do contrato.
                      </p>
                    </div>
                  </label>

                  {isTemporaryRental && (
                    <div className="mt-5 rounded-3xl border border-orange-100 bg-orange-50 px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-sm font-black text-slate-800">
                            Horários da locação temporária
                          </h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Campos opcionais. Caso não informe, o contrato será gerado sem horários definidos.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleApplyDefaultTemporaryRentalTimes}
                            className="rounded-2xl bg-orange-500/15 px-4 py-3 text-xs font-black text-orange-700 transition hover:bg-orange-500/25"
                          >
                            Usar padrão
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenDefaultTimeModal}
                            className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <FormField label="Hora de entrada (check-in) (opcional)">
                          <input
                            type="time"
                            value={checkInTime}
                            onChange={(event) => {
                              setCheckInTime(event.target.value);
                              setFormError("");
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          />
                        </FormField>

                        <FormField label="Hora de saída (check-out) (opcional)">
                          <input
                            type="time"
                            value={checkOutTime}
                            onChange={(event) => {
                              setCheckOutTime(event.target.value);
                              setFormError("");
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          />
                        </FormField>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    {isEditing ? "Salvar alterações" : "Criar contrato"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  required?: boolean;
};

function FormField({ label, children, required = false }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

type SummaryCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  detail: string;
};

type ContractActionMenuProps = {
  contract: Contract;
  displayStatus: ContractDisplayStatus;
  position: ActionMenuPosition;
  canRenew: boolean;
  canFinish: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onDetails: () => void;
  onRenew: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function ContractActionMenu({
  position,
  canRenew,
  canFinish,
  canCancel,
  canDelete,
  onDetails,
  onRenew,
  onFinish,
  onCancel,
  onPrint,
  onEdit,
  onDelete,
}: ContractActionMenuProps) {
  return (
    <div
      data-contract-action-menu
      className="fixed z-[90] w-56 rounded-3xl border border-slate-100 bg-white p-2 text-left shadow-2xl shadow-slate-300/40"
      style={{ top: position.top, left: position.left }}
    >
      <ActionMenuButton onClick={onDetails} icon={<Eye className="h-4 w-4 shrink-0" />}>
        Ver detalhes
      </ActionMenuButton>

      {canRenew && (
        <ActionMenuButton
          onClick={onRenew}
          icon={<RefreshCw className="h-4 w-4 shrink-0" />}
          className="text-emerald-700 hover:bg-emerald-50"
        >
          Renovar
        </ActionMenuButton>
      )}

      {canFinish && (
        <ActionMenuButton
          onClick={onFinish}
          icon={<CheckCircle className="h-4 w-4 shrink-0" />}
          className="text-red-600 hover:bg-red-50"
        >
          Finalizar
        </ActionMenuButton>
      )}

      {canCancel && (
        <ActionMenuButton
          onClick={onCancel}
          icon={<Ban className="h-4 w-4 shrink-0" />}
          className="text-red-600 hover:bg-red-50"
        >
          Cancelar
        </ActionMenuButton>
      )}

      <ActionMenuButton
        onClick={onPrint}
        icon={<FileText className="h-4 w-4 shrink-0" />}
        className="text-orange-600 hover:bg-orange-50"
      >
        Gerar contrato
      </ActionMenuButton>

      <ActionMenuButton onClick={onEdit} icon={<Pencil className="h-4 w-4 shrink-0" />}>
        Editar
      </ActionMenuButton>

      {canDelete && (
        <ActionMenuButton
          onClick={onDelete}
          icon={<Trash2 className="h-4 w-4 shrink-0" />}
          className="text-zinc-700 hover:bg-zinc-100"
        >
          Excluir
        </ActionMenuButton>
      )}
    </div>
  );
}

function ActionMenuButton({
  children,
  className = "text-slate-700 hover:bg-slate-100",
  icon,
  onClick,
}: {
  children: React.ReactNode;
    className?: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function SummaryCard({ icon, title, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
        {icon}
      </div>

      <p className="text-xs font-bold text-slate-500">{title}</p>
      <h3 className="mt-2 text-2xl font-black text-slate-950">{value}</h3>
      <p className="mt-2 text-xs font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function getContractStatusLabel(status: ContractDisplayStatus) {
  const statusConfig = {
    Active: "Ativo",
    Expiring: "Vencendo",
    Inactive: "Inativo",
    Canceled: "Cancelado",
    Finished: "Finalizado",
    Deleted: "Excluído",
  };

  return statusConfig[status];
}

function StatusBadge({ status }: { status: ContractDisplayStatus }) {
  const statusConfig = {
    Active: { label: "Ativo", className: "bg-emerald-100 text-emerald-700" },
    Expiring: { label: "Vencendo", className: "bg-amber-100 text-amber-700" },
    Inactive: { label: "Inativo", className: "bg-slate-100 text-slate-600" },
    Canceled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
    Finished: { label: "Finalizado", className: "bg-blue-100 text-blue-700" },
    Deleted: { label: "Excluído", className: "bg-zinc-200 text-zinc-700" },
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}>
      {statusConfig[status].label}
    </span>
  );
}

function DetailCard({
  title,
  value,
  detail,
}: {
  title: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 text-lg font-black text-slate-950">{value}</div>
      {detail && <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{detail}</p>}
    </div>
  );
}

function TimelineItem({
  icon,
  title,
  description,
  date,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  date: string;
}) {
  return (
    <div className="flex gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-xl">
        {icon}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black text-slate-950">{title}</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{date}</span>
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function mapApiContractToContract(apiContract: ApiContract): Contract {
  const propertyName =
    apiContract.propertyName ||
    apiContract.property?.title ||
    "IMÓVEL NÃO INFORMADO";
  const tenantName =
    apiContract.tenantName ||
    apiContract.tenant?.name ||
    "LOCATÁRIO NÃO INFORMADO";

  return {
    id: apiContract.id,
    propertyId: apiContract.propertyId,
    propertyName: toUpperText(propertyName),
    tenantId: apiContract.tenantId,
    tenantName,
    startDate: formatApiDateForInput(apiContract.startDate),
    endDate: formatApiDateForInput(apiContract.endDate),
    rentValue: Number(apiContract.rentValue || 0),
    status: mapApiContractStatus(apiContract.status),
    deletedAt: apiContract.deletedAt || null,
    statusReason: apiContract.statusReason || null,
    statusReasonType: mapApiContractStatusReasonType(apiContract.statusReasonType),
    statusReasonAt: apiContract.statusReasonAt || null,
    isTemporaryRental: apiContract.isTemporaryRental ?? false,
    checkInTime: apiContract.checkInTime || "",
    checkOutTime: apiContract.checkOutTime || "",
    renewedAt: apiContract.renewedAt || null,
    renewalHistory: Array.isArray(apiContract.renewalHistory)
      ? apiContract.renewalHistory.map(mapApiRenewalRecord)
      : [],
    finishedAt: apiContract.finishedAt || null,
    finishReason: apiContract.finishReason || null,
  };
}

function mapReceivableAccountToCharge(account: ReceivableAccount): ReceivableCharge {
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
  };
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

function mapApiPropertyToProperty(
  apiProperty: ApiProperty,
  contracts: Contract[],
): Property {
  const hasActiveContract = contracts.some(
    (contract) =>
      String(contract.propertyId) === String(apiProperty.id) &&
      ["Active", "Expiring"].includes(getDisplayContractStatus(contract)) &&
      contract.status !== "Deleted",
  );

  return {
    id: apiProperty.id,
    name: toUpperText(apiProperty.title || ""),
    rentValue: Number(apiProperty.rentalValue || 0),
    status: hasActiveContract ? "Rented" : "Available",
    isActive: apiProperty.isActive ?? true,
    zipCode: apiProperty.zipCode || "",
    state: toUpperText(apiProperty.state || ""),
    city: toUpperText(apiProperty.city || ""),
    street: toUpperText(apiProperty.address || ""),
    number: toUpperText(apiProperty.number || ""),
    neighborhood: toUpperText(apiProperty.district || ""),
    complement: toUpperText(apiProperty.complement || ""),
  };
}

function mapApiPersonToTenant(apiPerson: ApiPerson): ContrxTenant {
  return {
    id: apiPerson.id,
    name: apiPerson.name,
    isTenant: apiPerson.isTenant !== false,
    isActive: apiPerson.status === "ACTIVE",
    personType: apiPerson.type === "COMPANY" ? "Company" : "Individual",
    cpf: apiPerson.document,
    document: apiPerson.document,
    email: apiPerson.email || "",
    phone: apiPerson.phone || "",
    zipCode: apiPerson.zipCode || "",
    state: apiPerson.state || "",
    city: apiPerson.city || "",
    street: apiPerson.address || "",
  };
}

function buildContractPayload(
  contract: Contract,
  companyId?: string,
): CreateContractDto | UpdateContractDto {
  return {
    ...(companyId ? { companyId } : {}),
    propertyId: contract.propertyId,
    tenantId: contract.tenantId,
    propertyName: contract.propertyName,
    tenantName: contract.tenantName,
    startDate: contract.startDate,
    endDate: contract.endDate,
    rentValue: Number(contract.rentValue || 0),
    status: mapContractStatusToApi(contract.status || "Active"),
    deletedAt: contract.deletedAt || null,
    statusReason: contract.statusReason || null,
    statusReasonType: mapContractStatusReasonTypeToApi(contract.statusReasonType),
    statusReasonAt: contract.statusReasonAt || null,
    isTemporaryRental: contract.isTemporaryRental ?? false,
    checkInTime: contract.checkInTime || "",
    checkOutTime: contract.checkOutTime || "",
    renewedAt: contract.renewedAt || null,
    renewalHistory: contract.renewalHistory || [],
    finishedAt: contract.finishedAt || null,
    finishReason: contract.finishReason || null,
  };
}

function mapApiRenewalRecord(record: ApiContractRenewalRecord): ContractRenewalRecord {
  return {
    renewedAt: record.renewedAt,
    previousEndDate: formatApiDateForInput(record.previousEndDate),
    newEndDate: formatApiDateForInput(record.newEndDate),
    previousRentValue: Number(record.previousRentValue || 0),
    newRentValue: Number(record.newRentValue || 0),
    notes: record.notes,
  };
}

function mapApiContractStatus(status: ApiContractStatus): ContractStatus {
  const statusMap: Record<ApiContractStatus, ContractStatus> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    CANCELED: "Canceled",
    FINISHED: "Finished",
    DELETED: "Deleted",
  };

  return statusMap[status] || "Inactive";
}

function mapContractStatusToApi(status: ContractStatus): ApiContractStatus {
  const statusMap: Record<ContractStatus, ApiContractStatus> = {
    Active: "ACTIVE",
    Inactive: "INACTIVE",
    Canceled: "CANCELED",
    Finished: "FINISHED",
    Deleted: "DELETED",
  };

  return statusMap[status] || "INACTIVE";
}

function mapApiContractStatusReasonType(
  value?: ApiContractStatusReasonType | null,
): Contract["statusReasonType"] {
  if (value === "CANCELED") return "Canceled";
  if (value === "DELETED") return "Deleted";
  return null;
}

function mapContractStatusReasonTypeToApi(
  value?: Contract["statusReasonType"],
): ApiContractStatusReasonType | null {
  if (value === "Canceled") return "CANCELED";
  if (value === "Deleted") return "DELETED";
  return null;
}

function formatApiDateForInput(value: string) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function syncPropertiesWithContracts(contracts: Contract[], properties: Property[]): Property[] {
  return properties.map((property) => {
    const hasActiveContract = contracts.some(
      (contract) =>
        String(contract.propertyId) === String(property.id) &&
        ["Active", "Expiring"].includes(getDisplayContractStatus(contract)) &&
        contract.status !== "Deleted"
    );

    return {
      ...property,
      name: toUpperText(property.name || ""),
      status: hasActiveContract ? "Rented" : "Available",
      isActive: property.isActive ?? true,
    };
  });
}

function getDisplayContractStatus(contract: Contract): ContractDisplayStatus {
  if (contract.status === "Deleted") return "Deleted";
  if (contract.status === "Canceled") return "Canceled";
  if (contract.status === "Finished") return "Finished";
  if (contract.status === "Inactive") return "Inactive";

  const automaticStatus = getAutomaticContractStatus(contract.endDate);

  if (automaticStatus === "Active" && isContractExpiring(contract.endDate)) {
    return "Expiring";
  }

  return automaticStatus;
}

function getAutomaticContractStatus(endDate: string): ContractStatus {
  if (!endDate) return "Inactive";

  const today = new Date();
  const contractEndDate = new Date(`${endDate}T23:59:59`);

  return contractEndDate >= today ? "Active" : "Inactive";
}

function isContractExpiring(endDate: string) {
  const daysUntilEndDate = getDaysUntilDate(endDate);

  return daysUntilEndDate >= 0 && daysUntilEndDate <= EXPIRING_CONTRACT_DAYS_LIMIT;
}

function getDaysUntilDate(value: string) {
  if (!value) return -1;

  const today = new Date();
  const endDate = new Date(`${value}T00:00:00`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) {
    return -1;
  }

  return Math.round((endDate.getTime() - today.getTime()) / millisecondsPerDay);
}

function buildStandardResidentialContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = true
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName =
    companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "IMÓVEL NÃO INFORMADO";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });
  const currentDate = new Date();
  const locationText =
    property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
        ? `${companySettings.city}/${companySettings.state}`
        : "______/__";
  const durationInMonths = getContractDurationInMonths(contract.startDate, contract.endDate);
  const monthlyAmount = formatCurrency(contract.rentValue);
  const penaltyAmount = formatCurrency(Number(contract.rentValue || 0) * 3);
  const dueDay = getContractRentDueDay(contract.startDate);
  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    contractMonths: String(durationInMonths),
    contractDays: String(getContractDurationInDays(contract.startDate, contract.endDate)),
    amount: monthlyAmount,
    rentValue: monthlyAmount,
    monthlyAmount,
    penaltyAmount,
    dueDay: String(dueDay),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: companySettings.contractCity || locationText,
    currentDate: formatLongDateForPrint(currentDate),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
  };
  const configuredTemplateContent = getConfiguredStandardContractTemplateContent();

  return buildConfiguredContractHtml(
    configuredTemplateContent || ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE,
    templateData,
    showToolbar
  );
}

function buildTemporaryRentalContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = true
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName =
    companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "IMÓVEL NÃO INFORMADO";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });
  const currentDate = new Date();
  const locationText =
    companySettings.contractCity ||
    (property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
        ? `${companySettings.city}/${companySettings.state}`
        : "______/__");
  const configuredTemplateContent = getConfiguredTemporaryContractTemplateContent();
  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    entryTime: contract.checkInTime || "____:____",
    exitTime: contract.checkOutTime || "____:____",
    checkInTime: contract.checkInTime || "____:____",
    checkOutTime: contract.checkOutTime || "____:____",
    contractDays: String(getContractDurationInDays(contract.startDate, contract.endDate)),
    contractMonths: String(getContractDurationInMonths(contract.startDate, contract.endDate)),
    amount: formatCurrency(contract.rentValue),
    rentValue: formatCurrency(contract.rentValue),
    monthlyAmount: formatCurrency(contract.rentValue),
    penaltyAmount: formatCurrency(Number(contract.rentValue || 0) * 3),
    dueDay: String(getContractRentDueDay(contract.startDate)),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: locationText,
    currentDate: formatLongDateForPrint(currentDate),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
  };

  return buildConfiguredTemporaryContractHtml(
    configuredTemplateContent || DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT,
    templateData,
    showToolbar
  );
}


type TemplateData = Record<string, string>;

function getConfiguredTemporaryContractTemplateContent() {
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


function normalizeTemplateContent(value: string) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getConfiguredStandardContractTemplateContent() {
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

    const normalizedTemplateContent = normalizeTemplateContent(cleanTemplateContent);
    const normalizedLegacyTemplateContent = normalizeTemplateContent(LEGACY_SETTINGS_STANDARD_CONTRACT_CONTENT);
    const normalizedOriginalTemplateContent = normalizeTemplateContent(ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE);

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

function buildConfiguredContractHtml(
  templateContent: string,
  templateData: TemplateData,
  showToolbar: boolean
) {
  const renderedTemplateContent = renderTemporaryContractTemplate(templateContent, templateData);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title></title>
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
  ${showToolbar ? `<div class="toolbar">
    <button class="close-button" onclick="window.close()">Fechar</button>
    <button class="print-button" onclick="window.print()">Imprimir contrato</button>
  </div>` : ""}

  <main class="page">
    <div class="page-inner">
      <div class="content">${escapeHtml(renderedTemplateContent)}</div>
    </div>
  </main>
</body>
</html>`;
}

function buildConfiguredTemporaryContractHtml(
  templateContent: string,
  templateData: TemplateData,
  showToolbar: boolean
) {
  const renderedTemplateContent = renderTemporaryContractTemplate(templateContent, templateData);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title></title>
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
  ${showToolbar ? `<div class="toolbar">
    <button class="close-button" onclick="window.close()">Fechar</button>
    <button class="print-button" onclick="window.print()">Imprimir contrato</button>
  </div>` : ""}

  <main class="page">
    <div class="page-inner">
      <div class="content">${escapeHtml(renderedTemplateContent)}</div>
    </div>
  </main>
</body>
</html>`;
}

function renderTemporaryContractTemplate(templateContent: string, templateData: TemplateData) {
  return Object.entries(templateData).reduce((renderedContent, [key, value]) => {
    return renderedContent.replace(new RegExp(`{${key}}`, "g"), value);
  }, templateContent);
}


function getCompanySettingsForContractPrint(): CompanySettings {
  const cachedCompanySettings = getCachedCompanySettings();

  if (cachedCompanySettings) {
    const source = getNestedCompanySettingsSource(cachedCompanySettings);
    const normalizedSettings = normalizeCompanySettingsSource(source);

    if (normalizedSettings.name || normalizedSettings.legalName || normalizedSettings.document) {
      return normalizedSettings;
    }
  }

  return {};
}

function getNestedCompanySettingsSource(source: Record<string, unknown>) {
  const nestedKeys = ["company", "companySettings", "companyData", "business", "businessData", "registration"];

  for (const nestedKey of nestedKeys) {
    const nestedValue = source[nestedKey];

    if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) {
      return nestedValue as Record<string, unknown>;
    }
  }

  return source;
}

function normalizeCompanySettingsSource(source: Record<string, unknown>): CompanySettings {
  return {
    name: getFirstStringValue(source, ["name", "companyName", "fantasyName", "tradeName", "nomeFantasia", "nome"]),
    legalName: getFirstStringValue(source, ["legalName", "corporateName", "businessName", "razaoSocial", "companyLegalName"]),
    document: getFirstStringValue(source, ["document", "cnpj", "cpfCnpj", "taxId", "companyDocument"]),
    stateRegistration: getFirstStringValue(source, ["stateRegistration", "ie", "inscricaoEstadual"]),
    email: getFirstStringValue(source, ["email", "companyEmail", "contactEmail"]),
    phone: getFirstStringValue(source, ["phone", "companyPhone", "whatsapp", "cellphone", "mobile"]),
    zipCode: getFirstStringValue(source, ["zipCode", "cep", "postalCode"]),
    state: getFirstStringValue(source, ["state", "uf"]),
    city: getFirstStringValue(source, ["city", "cidade", "municipality", "municipio"]),
    street: getFirstStringValue(source, ["street", "logradouro", "address", "endereco"]),
    number: getFirstStringValue(source, ["number", "numero", "addressNumber"]),
    neighborhood: getFirstStringValue(source, ["neighborhood", "bairro", "district"]),
    complement: getFirstStringValue(source, ["complement", "complemento", "addressComplement"]),
    pixKey: getFirstStringValue(source, ["pixKey", "pix", "companyPixKey"]),
    contractCity: getFirstStringValue(source, ["contractCity", "cityForContract", "signatureCity"]),
    contractDefaultNotes: getFirstStringValue(source, ["contractDefaultNotes", "defaultContractNotes", "contractNotes"]),
  };
}

function getFirstStringValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function formatFullAddressForPrint(address: {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
}) {
  const parts = [
    address.street,
    address.number ? `nº ${address.number}` : "",
    address.complement,
     address.neighborhood ? `Bairro: ${address.neighborhood}` : "",
    address.city && address.state ? `${address.city}/${address.state}` : address.city || address.state,
    address.zipCode ? `CEP ${address.zipCode}` : "",
  ];

  return parts.filter(Boolean).join(", ");
}

function formatDocumentForPrint(value: string) {
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

function getContractDurationInDays(startDateValue: string, endDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);
  const endDate = normalizeDateInputValue(endDateValue);

  if (!startDate || !endDate) return 1;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
}

function getContractDurationInMonths(startDateValue: string, endDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);
  const endDate = normalizeDateInputValue(endDateValue);

  if (!startDate || !endDate) return 1;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 1;
  }

  const monthDifference =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;

  return Math.max(monthDifference, 1);
}

function getContractRentDueDay(startDateValue: string) {
  const startDate = normalizeDateInputValue(startDateValue);

  if (!startDate) return "____";

  const [, , day] = startDate.split("-");

  return day || "____";
}

function formatLongDateForPrint(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPropertyOptionLabel(property: Property) {
  return toUpperText(property.name || "");
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR").trimStart();
}

function formatCurrency(value?: number) {
  const safeValue = Number(value || 0);

  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseCurrencyInput(value: string) {
  const digits = String(value || "").replace(/\D/g, "");

  return Number(digits || 0) / 100;
}

function formatCurrencyInput(value: string | number) {
  if (typeof value === "number") {
    return formatCurrency(value);
  }

  return formatCurrency(parseCurrencyInput(value));
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const normalizedDate = normalizeDateInputValue(value);

  if (!normalizedDate) return "-";

  const [year, month, day] = normalizedDate.split("-");

  return `${day}/${month}/${year}`;
}

function normalizeDateInputValue(value?: string | null) {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "";

  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
