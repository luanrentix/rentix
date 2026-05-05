"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const CONTRACTS_STORAGE_KEY = "rentix_contracts";
const PROPERTIES_STORAGE_KEY = "rentix_properties";
const TENANTS_STORAGE_KEY = "rentix_tenants";
const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "rentix_new_charge_from_contract";
const MANUAL_CHARGES_STORAGE_KEY = "rentix_manual_charges";
const PAID_CHARGES_STORAGE_KEY = "rentix_paid_charges";
const CHARGE_PAYMENTS_STORAGE_KEY = "rentix_charge_payments";
const PROPERTY_MOVEMENTS_STORAGE_KEY = "rentix_property_movements";
const EXPIRING_CONTRACT_DAYS_LIMIT = 30;
const PRINT_TEMPLATES_STORAGE_KEY = "rentix_print_templates";
const DEFAULT_TEMPORARY_RENTAL_CHECK_IN_TIME = "14:00";
const DEFAULT_TEMPORARY_RENTAL_CHECK_OUT_TIME = "12:00";
const TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY = "rentix_temporary_rental_time_defaults";
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

type RentixTenant = Tenant & {
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

type ContractRenewalRecord = {
  renewedAt: string;
  previousEndDate: string;
  newEndDate: string;
  previousRentValue: number;
  newRentValue: number;
  notes?: string;
};

type Contract = {
  id: number;
  propertyId: string;
  propertyName: string;
  tenantId: number;
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
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

type ChargePaymentRecord = {
  chargeId: string;
  [key: string]: unknown;
};

type PendingStatusChange = {
  contract: Contract;
  nextStatus: "Canceled" | "Deleted";
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractFilterStatus>("Active");
  const [searchTerm, setSearchTerm] = useState("");
  const [printableContract, setPrintableContract] = useState<Contract | null>(null);
  const printableContractFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [contractStatus, setContractStatus] = useState<ContractStatus>("Active");
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
  const [openActionMenuContractId, setOpenActionMenuContractId] = useState<number | null>(null);

  const isEditing = editingContractId !== null;

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

        setIsBlackTheme(isBlackThemeSelected);
      } catch {
        const isLegacyBlackTheme = legacyTheme === "black" || legacyTheme === "dark";

        setIsBlackTheme(isLegacyBlackTheme);
      }
    }

    applyStoredTheme();

    window.addEventListener("storage", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
    };
  }, []);

  useEffect(() => {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

    if (storedContracts) {
      const parsedContracts = JSON.parse(storedContracts) as Partial<Contract>[];

      const normalizedContracts: Contract[] = parsedContracts.map((contract) => ({
        id: contract.id || Date.now(),
        propertyId: contract.propertyId || "",
        propertyName: toUpperText(contract.propertyName || ""),
        tenantId: contract.tenantId || 0,
        tenantName: contract.tenantName || "",
        startDate: contract.startDate || "",
        endDate: contract.endDate || "",
        rentValue: Number(contract.rentValue || 0),
        status: contract.status || getAutomaticContractStatus(contract.endDate || ""),
        deletedAt: contract.deletedAt || null,
        statusReason: contract.statusReason || null,
        statusReasonType: contract.statusReasonType || null,
        statusReasonAt: contract.statusReasonAt || null,
        isTemporaryRental: contract.isTemporaryRental ?? false,
        checkInTime: contract.checkInTime || "",
        checkOutTime: contract.checkOutTime || "",
        renewedAt: contract.renewedAt || null,
        renewalHistory: Array.isArray(contract.renewalHistory) ? contract.renewalHistory : [],
        finishedAt: contract.finishedAt || null,
        finishReason: contract.finishReason || null,
      }));

      setContracts(normalizedContracts);
    }

    if (storedProperties) {
      const parsedProperties = JSON.parse(storedProperties) as Property[];
      setProperties(
        parsedProperties.map((property) => ({
          ...property,
          name: toUpperText(property.name || ""),
          status: property.status || "Available",
          isActive: property.isActive ?? true,
        }))
      );
    }

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as RentixTenant[];
      setTenants(parsedTenants.length > 0 ? parsedTenants : initialTenants);
    } else {
      setTenants(initialTenants);
    }

    setIsLoaded(true);
  }, []);


  useEffect(() => {
    const storedDefaultTimes = localStorage.getItem(TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY);

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
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));

    setProperties((currentProperties) => {
      const updatedProperties = syncPropertiesWithContracts(contracts, currentProperties);

      localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(updatedProperties));

      return updatedProperties;
    });
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

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setContractStatus("Active");
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
    setRentValue(String(contract.rentValue || ""));
    setContractStatus(contract.status || getAutomaticContractStatus(contract.endDate));
    setIsTemporaryRental(contract.isTemporaryRental ?? false);
    setCheckInTime(contract.checkInTime || "");
    setCheckOutTime(contract.checkOutTime || "");
    setFormError("");
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

  function registerPropertyMovementFromContract(
    contract: Contract,
    type: PropertyMovement["type"],
    description: string
  ) {
    const storedMovements = localStorage.getItem(PROPERTY_MOVEMENTS_STORAGE_KEY);
    const currentMovements = safeParseLocalStorageArray<PropertyMovement>(storedMovements);

    const movement: PropertyMovement = {
      id: crypto.randomUUID(),
      propertyId: String(contract.propertyId),
      propertyName: contract.propertyName,
      type,
      description,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(PROPERTY_MOVEMENTS_STORAGE_KEY, JSON.stringify([movement, ...currentMovements]));
  }

  function applyEditedContract(updatedContract: Contract, reason?: string) {
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

    if (shouldRemoveReceivables) {
      removeReceivableChargesFromContract(contractToSave);
      registerPropertyMovementFromContract(
        contractToSave,
        contractToSave.status === "Deleted" ? "ContractDeleted" : "ContractCanceled",
        contractToSave.status === "Deleted"
          ? "Contrato marcado como excluído e parcelas vinculadas removidas."
          : "Contrato cancelado e parcelas vinculadas removidas."
      );
    } else {
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

  function handleConfirmStatusReason() {
    const cleanReason = statusReason.trim();

    if (!pendingStatusChange) return;

    if (cleanReason.length < 5) {
      setStatusReasonError("Informe um motivo com pelo menos 5 caracteres para continuar.");
      return;
    }

    applyEditedContract(pendingStatusChange.contract, cleanReason);
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  function handleCancelStatusReason() {
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  function removeReceivableChargesFromContract(contract: Contract) {
    const storedManualCharges = localStorage.getItem(MANUAL_CHARGES_STORAGE_KEY);
    const storedPaidCharges = localStorage.getItem(PAID_CHARGES_STORAGE_KEY);
    const storedPaymentRecords = localStorage.getItem(CHARGE_PAYMENTS_STORAGE_KEY);

    const manualCharges = safeParseLocalStorageArray<ReceivableCharge>(storedManualCharges);
    const paidCharges = safeParseLocalStorageArray<string>(storedPaidCharges);
    const paymentRecords = safeParseLocalStorageArray<ChargePaymentRecord>(storedPaymentRecords);
    const removedChargeIds = new Set<string>();
    const automaticChargePrefix = String(contract.id);

    const updatedManualCharges = manualCharges.filter((charge) => {
      const isLinked = isReceivableChargeLinkedToContract(charge, contract);

      if (isLinked) {
        removedChargeIds.add(String(charge.id));
        return false;
      }

      return true;
    });

    const updatedPaidCharges = paidCharges.filter((chargeId) => {
      const normalizedChargeId = String(chargeId);
      const isLinked =
        removedChargeIds.has(normalizedChargeId) ||
        normalizedChargeId.startsWith(automaticChargePrefix + "-");

      return !isLinked;
    });

    const updatedPaymentRecords = paymentRecords.filter((paymentRecord) => {
      const normalizedChargeId = String(paymentRecord.chargeId);
      const isLinked =
        removedChargeIds.has(normalizedChargeId) ||
        normalizedChargeId.startsWith(automaticChargePrefix + "-");

      return !isLinked;
    });

    localStorage.setItem(MANUAL_CHARGES_STORAGE_KEY, JSON.stringify(updatedManualCharges));
    localStorage.setItem(PAID_CHARGES_STORAGE_KEY, JSON.stringify(updatedPaidCharges));
    localStorage.setItem(CHARGE_PAYMENTS_STORAGE_KEY, JSON.stringify(updatedPaymentRecords));
  }

  function openReceivableChargeFromContract(contract: Contract) {
    const installmentQuantity = getContractInstallmentQuantity(contract.startDate, contract.endDate);
    const monthlyRentAmount = Number(contract.rentValue || 0);
    const totalContractAmount = monthlyRentAmount * installmentQuantity;

    localStorage.setItem(
      RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
      JSON.stringify({
        contractId: String(contract.id),
        tenantId: String(contract.tenantId),
        propertyId: String(contract.propertyId),
        amount: totalContractAmount,
        monthlyAmount: monthlyRentAmount,
        totalAmount: totalContractAmount,
        issueDate: contract.startDate,
        dueDate: getFirstDueDateFromStartDate(contract.startDate),
        endDate: contract.endDate,
        installmentQuantity,
      })
    );

    window.location.href = "/contas-receber";
  }

  function handleSubmitContract(event: React.FormEvent<HTMLFormElement>) {
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

    if (!rentValue || Number(rentValue) <= 0) {
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
        rentValue: Number(rentValue),
        status: contractStatus,
        isTemporaryRental,
        checkInTime: isTemporaryRental ? checkInTime : "",
        checkOutTime: isTemporaryRental ? checkOutTime : "",
        deletedAt:
          contractStatus === "Deleted"
            ? currentContract.deletedAt || new Date().toISOString()
            : null,
      };

      const statusRequiresReason =
        (contractStatus === "Canceled" || contractStatus === "Deleted") &&
        currentContract.status !== contractStatus;

      if (statusRequiresReason) {
        setPendingStatusChange({
          contract: updatedContract,
          nextStatus: contractStatus,
        });
        setStatusReason("");
        setStatusReasonError("");
        return;
      }

      applyEditedContract(updatedContract);
      return;
    }

    const newContract: Contract = {
      id: Date.now(),
      propertyId: selectedProperty.id,
      propertyName: toUpperText(selectedProperty.name),
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      startDate,
      endDate,
      rentValue: Number(rentValue),
      status: contractStatus,
      isTemporaryRental,
      checkInTime: isTemporaryRental ? checkInTime : "",
      checkOutTime: isTemporaryRental ? checkOutTime : "",
      deletedAt: contractStatus === "Deleted" ? new Date().toISOString() : null,
      statusReason: null,
      statusReasonType: null,
      statusReasonAt: null,
      renewedAt: null,
      renewalHistory: [],
      finishedAt: null,
      finishReason: null,
    };

    const updatedContracts = [newContract, ...contracts];

    setContracts(updatedContracts);
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(updatedContracts));
    registerPropertyMovementFromContract(
      newContract,
      "ContractCreated",
      "Contrato criado e imóvel vinculado à locação."
    );
    resetForm();
    openReceivableChargeFromContract(newContract);
  }

  function handlePropertyChange(selectedPropertyId: string) {
    setPropertyId(selectedPropertyId);
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(selectedPropertyId)
    );

    if (selectedProperty) {
      setRentValue(String(selectedProperty.rentValue || ""));
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

    localStorage.setItem(
      TEMPORARY_RENTAL_TIME_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        checkInTime: nextDefaultCheckInTime,
        checkOutTime: nextDefaultCheckOutTime,
      })
    );
  }


  function handleToggleContractActions(contractId: number) {
    setOpenActionMenuContractId((currentContractId) =>
      currentContractId === contractId ? null : contractId
    );
  }

  function handleCloseContractActions() {
    setOpenActionMenuContractId(null);
  }

  function canRenewContract(displayStatus: ContractDisplayStatus) {
    return displayStatus === "Expiring";
  }

  function canFinishContract(displayStatus: ContractDisplayStatus) {
    return !["Finished", "Deleted", "Canceled"].includes(displayStatus);
  }


  function handleOpenRenewalModal(contract: Contract) {
    setRenewalContract(contract);
    setRenewalEndDate(contract.endDate || "");
    setRenewalRentValue(String(contract.rentValue || ""));
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

  function handleConfirmContractRenewal() {
    if (!renewalContract) return;

    const nextEndDate = renewalEndDate;
    const nextRentValue = Number(renewalRentValue || 0);

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

    const renewedAt = new Date().toISOString();
    const renewalRecord: ContractRenewalRecord = {
      renewedAt,
      previousEndDate: renewalContract.endDate,
      newEndDate: nextEndDate,
      previousRentValue: Number(renewalContract.rentValue || 0),
      newRentValue: nextRentValue,
      notes: renewalNotes.trim() || undefined,
    };

    const renewedContract: Contract = {
      ...renewalContract,
      endDate: nextEndDate,
      rentValue: nextRentValue,
      status: "Active",
      renewedAt,
      renewalHistory: [...(renewalContract.renewalHistory || []), renewalRecord],
      finishedAt: null,
      finishReason: null,
    };

    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.id === renewalContract.id ? renewedContract : contract
      )
    );

    registerPropertyMovementFromContract(
      renewedContract,
      "ContractRenewed",
      `Contrato renovado até ${formatDate(nextEndDate)}.`
    );

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

  function handleConfirmContractFinish() {
    if (!finishContract) return;

    const cleanReason = finishReason.trim();

    if (cleanReason.length < 5) {
      setFinishReasonError("Informe um motivo com pelo menos 5 caracteres para finalizar o contrato.");
      return;
    }

    const finishedContract: Contract = {
      ...finishContract,
      status: "Finished",
      finishedAt: new Date().toISOString(),
      finishReason: cleanReason,
      statusReason: cleanReason,
      statusReasonType: null,
      statusReasonAt: new Date().toISOString(),
    };

    removeFutureReceivableChargesFromContract(finishedContract);
    registerPropertyMovementFromContract(
      finishedContract,
      "ContractFinished",
      "Contrato finalizado e imóvel liberado para nova locação."
    );

    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.id === finishContract.id ? finishedContract : contract
      )
    );

    handleCloseFinishModal();
  }

  function removeFutureReceivableChargesFromContract(contract: Contract) {
    const storedManualCharges = localStorage.getItem(MANUAL_CHARGES_STORAGE_KEY);
    const storedPaidCharges = localStorage.getItem(PAID_CHARGES_STORAGE_KEY);
    const storedPaymentRecords = localStorage.getItem(CHARGE_PAYMENTS_STORAGE_KEY);
    const manualCharges = safeParseLocalStorageArray<ReceivableCharge>(storedManualCharges);
    const paidCharges = safeParseLocalStorageArray<string>(storedPaidCharges);
    const paymentRecords = safeParseLocalStorageArray<ChargePaymentRecord>(storedPaymentRecords);
    const today = new Date();
    const removedChargeIds = new Set<string>();

    today.setHours(0, 0, 0, 0);

    const updatedManualCharges = manualCharges.filter((charge) => {
      if (!isReceivableChargeLinkedToContract(charge, contract)) {
        return true;
      }

      const chargeDueDate = charge.dueDate ? new Date(`${charge.dueDate}T00:00:00`) : null;
      const isFutureCharge = chargeDueDate && !Number.isNaN(chargeDueDate.getTime()) && chargeDueDate >= today;

      if (isFutureCharge) {
        removedChargeIds.add(String(charge.id));
        return false;
      }

      return true;
    });

    const updatedPaidCharges = paidCharges.filter((chargeId) => !removedChargeIds.has(String(chargeId)));
    const updatedPaymentRecords = paymentRecords.filter(
      (paymentRecord) => !removedChargeIds.has(String(paymentRecord.chargeId))
    );

    localStorage.setItem(MANUAL_CHARGES_STORAGE_KEY, JSON.stringify(updatedManualCharges));
    localStorage.setItem(PAID_CHARGES_STORAGE_KEY, JSON.stringify(updatedPaidCharges));
    localStorage.setItem(CHARGE_PAYMENTS_STORAGE_KEY, JSON.stringify(updatedPaymentRecords));
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

  return (
    <AppShell>
      <style jsx global>{`
        .rentix-contracts-page.rentix-black-theme {
          color: #f8fafc;
        }

        .rentix-contracts-page.rentix-black-theme .bg-white {
          background-color: #0f172a !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-slate-50,
        .rentix-contracts-page.rentix-black-theme .bg-slate-100 {
          background-color: #111827 !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-orange-50,
        .rentix-contracts-page.rentix-black-theme .bg-orange-100,
        .rentix-contracts-page.rentix-black-theme .bg-orange-50\/50,
        .rentix-contracts-page.rentix-black-theme .bg-orange-50\/60,
        .rentix-contracts-page.rentix-black-theme .bg-orange-50\/40 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-red-50,
        .rentix-contracts-page.rentix-black-theme .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.12) !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-emerald-50,
        .rentix-contracts-page.rentix-black-theme .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-amber-50,
        .rentix-contracts-page.rentix-black-theme .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.14) !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-blue-100 {
          background-color: rgba(59, 130, 246, 0.14) !important;
        }

        .rentix-contracts-page.rentix-black-theme .bg-zinc-200 {
          background-color: #334155 !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-slate-950,
        .rentix-contracts-page.rentix-black-theme .text-slate-900,
        .rentix-contracts-page.rentix-black-theme .text-slate-800,
        .rentix-contracts-page.rentix-black-theme .text-slate-700 {
          color: #f8fafc !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-slate-600,
        .rentix-contracts-page.rentix-black-theme .text-slate-500,
        .rentix-contracts-page.rentix-black-theme .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-orange-600,
        .rentix-contracts-page.rentix-black-theme .text-orange-700,
        .rentix-contracts-page.rentix-black-theme .text-orange-800 {
          color: #fb923c !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-red-600,
        .rentix-contracts-page.rentix-black-theme .text-red-700 {
          color: #fca5a5 !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-emerald-700,
        .rentix-contracts-page.rentix-black-theme .text-emerald-800 {
          color: #6ee7b7 !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-amber-700 {
          color: #fcd34d !important;
        }

        .rentix-contracts-page.rentix-black-theme .text-blue-700 {
          color: #93c5fd !important;
        }

        .rentix-contracts-page.rentix-black-theme .border-orange-100,
        .rentix-contracts-page.rentix-black-theme .border-orange-200,
        .rentix-contracts-page.rentix-black-theme .border-red-100,
        .rentix-contracts-page.rentix-black-theme .border-red-200,
        .rentix-contracts-page.rentix-black-theme .border-emerald-200,
        .rentix-contracts-page.rentix-black-theme .border-slate-100,
        .rentix-contracts-page.rentix-black-theme .border-slate-200,
        .rentix-contracts-page.rentix-black-theme .border-slate-300 {
          border-color: #334155 !important;
        }

        .rentix-contracts-page.rentix-black-theme input,
        .rentix-contracts-page.rentix-black-theme select,
        .rentix-contracts-page.rentix-black-theme textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        .rentix-contracts-page.rentix-black-theme input::placeholder,
        .rentix-contracts-page.rentix-black-theme textarea::placeholder {
          color: #64748b !important;
        }

        .rentix-contracts-page.rentix-black-theme table,
        .rentix-contracts-page.rentix-black-theme tbody,
        .rentix-contracts-page.rentix-black-theme tr {
          background-color: #0f172a !important;
        }

        .rentix-contracts-page.rentix-black-theme thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .rentix-contracts-page.rentix-black-theme tbody tr:hover {
          background-color: #1e293b !important;
        }

        .rentix-contracts-page.rentix-force-light,
        .rentix-contracts-page .rentix-force-light,
        .rentix-contracts-page.rentix-force-light .bg-white,
        .rentix-contracts-page .rentix-force-light .bg-white,
        .rentix-contracts-page.rentix-force-light .bg-slate-50,
        .rentix-contracts-page .rentix-force-light .bg-slate-50,
        .rentix-contracts-page.rentix-force-light .bg-slate-100,
        .rentix-contracts-page .rentix-force-light .bg-slate-100 {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-slate-50,
        .rentix-contracts-page .rentix-force-light .bg-slate-50,
        .rentix-contracts-page.rentix-force-light .bg-slate-100,
        .rentix-contracts-page .rentix-force-light .bg-slate-100 {
          background-color: #f8fafc !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-orange-50,
        .rentix-contracts-page .rentix-force-light .bg-orange-50,
        .rentix-contracts-page.rentix-force-light .bg-orange-100,
        .rentix-contracts-page .rentix-force-light .bg-orange-100,
        .rentix-contracts-page.rentix-force-light .bg-orange-50\/50,
        .rentix-contracts-page .rentix-force-light .bg-orange-50\/50,
        .rentix-contracts-page.rentix-force-light .bg-orange-50\/60,
        .rentix-contracts-page .rentix-force-light .bg-orange-50\/60,
        .rentix-contracts-page.rentix-force-light .bg-orange-50\/40,
        .rentix-contracts-page .rentix-force-light .bg-orange-50\/40 {
          background-color: #fff7ed !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-red-50,
        .rentix-contracts-page .rentix-force-light .bg-red-50,
        .rentix-contracts-page.rentix-force-light .bg-red-100,
        .rentix-contracts-page .rentix-force-light .bg-red-100 {
          background-color: #fef2f2 !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-emerald-50,
        .rentix-contracts-page .rentix-force-light .bg-emerald-50,
        .rentix-contracts-page.rentix-force-light .bg-emerald-100,
        .rentix-contracts-page .rentix-force-light .bg-emerald-100 {
          background-color: #ecfdf5 !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-amber-50,
        .rentix-contracts-page .rentix-force-light .bg-amber-50,
        .rentix-contracts-page.rentix-force-light .bg-amber-100,
        .rentix-contracts-page .rentix-force-light .bg-amber-100 {
          background-color: #fffbeb !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-blue-100,
        .rentix-contracts-page .rentix-force-light .bg-blue-100 {
          background-color: #dbeafe !important;
        }

        .rentix-contracts-page.rentix-force-light .text-white,
        .rentix-contracts-page .rentix-force-light .text-white,
        .rentix-contracts-page.rentix-force-light .text-slate-950,
        .rentix-contracts-page .rentix-force-light .text-slate-950,
        .rentix-contracts-page.rentix-force-light .text-slate-900,
        .rentix-contracts-page .rentix-force-light .text-slate-900,
        .rentix-contracts-page.rentix-force-light .text-slate-800,
        .rentix-contracts-page .rentix-force-light .text-slate-800,
        .rentix-contracts-page.rentix-force-light .text-slate-700,
        .rentix-contracts-page .rentix-force-light .text-slate-700 {
          color: #0f172a !important;
        }

        .rentix-contracts-page.rentix-force-light .text-slate-600,
        .rentix-contracts-page .rentix-force-light .text-slate-600,
        .rentix-contracts-page.rentix-force-light .text-slate-500,
        .rentix-contracts-page .rentix-force-light .text-slate-500,
        .rentix-contracts-page.rentix-force-light .text-slate-400,
        .rentix-contracts-page .rentix-force-light .text-slate-400 {
          color: #64748b !important;
        }

        .rentix-contracts-page.rentix-force-light .text-orange-400,
        .rentix-contracts-page .rentix-force-light .text-orange-400,
        .rentix-contracts-page.rentix-force-light .text-orange-500,
        .rentix-contracts-page .rentix-force-light .text-orange-500,
        .rentix-contracts-page.rentix-force-light .text-orange-600,
        .rentix-contracts-page .rentix-force-light .text-orange-600,
        .rentix-contracts-page.rentix-force-light .text-orange-700,
        .rentix-contracts-page .rentix-force-light .text-orange-700,
        .rentix-contracts-page.rentix-force-light .text-orange-800,
        .rentix-contracts-page .rentix-force-light .text-orange-800 {
          color: #ea580c !important;
        }

        .rentix-contracts-page.rentix-force-light .text-red-300,
        .rentix-contracts-page .rentix-force-light .text-red-300,
        .rentix-contracts-page.rentix-force-light .text-red-600,
        .rentix-contracts-page .rentix-force-light .text-red-600,
        .rentix-contracts-page.rentix-force-light .text-red-700,
        .rentix-contracts-page .rentix-force-light .text-red-700 {
          color: #dc2626 !important;
        }

        .rentix-contracts-page.rentix-force-light .text-emerald-700,
        .rentix-contracts-page .rentix-force-light .text-emerald-700 {
          color: #047857 !important;
        }

        .rentix-contracts-page.rentix-force-light .text-amber-700,
        .rentix-contracts-page .rentix-force-light .text-amber-700 {
          color: #b45309 !important;
        }

        .rentix-contracts-page.rentix-force-light .border-orange-100,
        .rentix-contracts-page .rentix-force-light .border-orange-100,
        .rentix-contracts-page.rentix-force-light .border-orange-200,
        .rentix-contracts-page .rentix-force-light .border-orange-200 {
          border-color: #fed7aa !important;
        }

        .rentix-contracts-page.rentix-force-light .border-slate-100,
        .rentix-contracts-page .rentix-force-light .border-slate-100,
        .rentix-contracts-page.rentix-force-light .border-slate-200,
        .rentix-contracts-page .rentix-force-light .border-slate-200,
        .rentix-contracts-page.rentix-force-light .border-slate-300,
        .rentix-contracts-page .rentix-force-light .border-slate-300,
        .rentix-contracts-page.rentix-force-light .border-slate-700,
        .rentix-contracts-page .rentix-force-light .border-slate-700,
        .rentix-contracts-page.rentix-force-light .border-slate-800,
        .rentix-contracts-page .rentix-force-light .border-slate-800 {
          border-color: #e2e8f0 !important;
        }

        .rentix-contracts-page.rentix-force-light input,
        .rentix-contracts-page .rentix-force-light input,
        .rentix-contracts-page.rentix-force-light select,
        .rentix-contracts-page .rentix-force-light select,
        .rentix-contracts-page.rentix-force-light textarea,
        .rentix-contracts-page .rentix-force-light textarea {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #334155 !important;
          color-scheme: light !important;
        }

        .rentix-contracts-page.rentix-force-light input::placeholder,
        .rentix-contracts-page .rentix-force-light input::placeholder,
        .rentix-contracts-page.rentix-force-light textarea::placeholder,
        .rentix-contracts-page .rentix-force-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .rentix-contracts-page.rentix-force-light .bg-slate-900,
        .rentix-contracts-page .rentix-force-light .bg-slate-900,
        .rentix-contracts-page.rentix-force-light .bg-slate-950,
        .rentix-contracts-page .rentix-force-light .bg-slate-950,
        .rentix-contracts-page.rentix-force-light .bg-slate-800,
        .rentix-contracts-page .rentix-force-light .bg-slate-800,
        .rentix-contracts-page.rentix-force-light .bg-slate-700,
        .rentix-contracts-page .rentix-force-light .bg-slate-700 {
          background-color: #f8fafc !important;
        }

        .rentix-contracts-page.rentix-force-light button.bg-slate-900,
        .rentix-contracts-page .rentix-force-light button.bg-slate-900,
        .rentix-contracts-page.rentix-force-light button.bg-slate-800,
        .rentix-contracts-page .rentix-force-light button.bg-slate-800,
        .rentix-contracts-page.rentix-force-light button.bg-slate-700,
        .rentix-contracts-page .rentix-force-light button.bg-slate-700 {
          background-color: #f1f5f9 !important;
          color: #475569 !important;
        }

        .rentix-contracts-page.rentix-force-light button.bg-orange-500,
        .rentix-contracts-page .rentix-force-light button.bg-orange-500 {
          background-color: #f97316 !important;
          color: #ffffff !important;
        }

        .rentix-contracts-page.rentix-force-light button.bg-orange-500:hover,
        .rentix-contracts-page .rentix-force-light button.bg-orange-500:hover {
          background-color: #ea580c !important;
        }

        .rentix-contracts-page.rentix-force-light button.bg-red-500,
        .rentix-contracts-page .rentix-force-light button.bg-red-500 {
          background-color: #ef4444 !important;
          color: #ffffff !important;
        }

        .rentix-contracts-page.rentix-force-light button.bg-red-500:hover,
        .rentix-contracts-page .rentix-force-light button.bg-red-500:hover {
          background-color: #dc2626 !important;
        }
      `}</style>
      <div className={`rentix-contracts-page space-y-8 ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
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

        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard icon="📄" title="Contratos ativos" value={activeContracts} detail="Inclui vencendo" />
          <SummaryCard icon="⏳" title="Vencendo" value={expiringContracts} detail={`Até ${EXPIRING_CONTRACT_DAYS_LIMIT} dias`} />
          <SummaryCard icon="💰" title="Receita mensal" value={formatCurrency(monthlyRevenue)} detail="Contratos ativos" />
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
                              onClick={() => handleToggleContractActions(contract.id)}
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
                                ▼
                              </span>
                            </button>

                            {openActionMenuContractId === contract.id && (
                              <div className="w-56 rounded-3xl border border-slate-100 bg-white p-2 text-left shadow-xl">
                                {canRenewContract(displayStatus) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCloseContractActions();
                                      handleOpenRenewalModal(contract);
                                    }}
                                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
                                  >
                                    <span>Renovar</span>
                                    <span>🔄</span>
                                  </button>
                                )}

                                {canFinishContract(displayStatus) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCloseContractActions();
                                      handleOpenFinishModal(contract);
                                    }}
                                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
                                  >
                                    <span>Finalizar</span>
                                    <span>✅</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCloseContractActions();
                                    handleOpenPrintableContract(contract);
                                  }}
                                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-orange-600 transition hover:bg-orange-50"
                                >
                                  <span>Gerar contrato</span>
                                  <span>📄</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleCloseContractActions();
                                    handleEditContract(contract);
                                  }}
                                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                                >
                                  <span>Editar</span>
                                  <span>✏️</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredContracts.length === 0 && (
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


        {renewalContract && (
          <div className="fixed inset-0 z-[68] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-2xl rounded-[2rem] border border-emerald-100 bg-white p-8 shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-3xl">
                🔄
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
                  {renewalContract.tenantName || "Inquilino não informado"} • Vence em {formatDate(renewalContract.endDate)}
                </p>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FormField label="Nova data final">
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

                <FormField label="Novo valor do aluguel">
                  <input
                    type="number"
                    value={renewalRentValue}
                    onChange={(event) => {
                      setRenewalRentValue(event.target.value);
                      setRenewalError("");
                    }}
                    placeholder="Ex: 1800"
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
            <div className={`w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                ✅
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
            <div className={`flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className={`w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                {pendingStatusChange.nextStatus === "Deleted" ? "🗑️" : "🚫"}
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
            <div className={`w-full max-w-lg rounded-[2rem] border border-orange-100 bg-white p-8 shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-3xl">
                ✏️
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

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className={`max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl ${isBlackTheme ? "rentix-black-theme" : "rentix-force-light"}`}>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {isEditing ? "Editar contrato" : "Novo contrato"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados do contrato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitContract}>
                <div className="p-8">
                  {formError && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Imóvel">
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

                    <FormField label="Inquilino">
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

                    <FormField label="Valor aluguel">
                      <input
                        type="number"
                        value={rentValue}
                        onChange={(event) => {
                          setRentValue(event.target.value);
                          setFormError("");
                        }}
                        placeholder="Ex: 1800"
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data início">
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

                    <FormField label="Data fim">
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

                    <FormField label="Status">
                      <select
                        value={contractStatus}
                        onChange={(event) => setContractStatus(event.target.value as ContractStatus)}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                        <option value="Canceled">Cancelado</option>
                        <option value="Finished">Finalizado</option>
                        <option value="Deleted">Excluído</option>
                      </select>
                    </FormField>
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
                            ✏️
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
    </AppShell>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

type SummaryCardProps = {
  icon: string;
  title: string;
  value: string | number;
  detail: string;
};

function SummaryCard({ icon, title, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
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

function safeParseLocalStorageArray<T>(value: string | null): T[] {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

function isReceivableChargeLinkedToContract(charge: ReceivableCharge, contract: Contract) {
  if (String(charge.contractId || "") === String(contract.id)) {
    return true;
  }

  const chargeTenant = normalizeSearchText(charge.tenant || "");
  const chargeProperty = normalizeSearchText(charge.property || "");
  const contractTenant = normalizeSearchText(contract.tenantName || "");
  const contractProperty = normalizeSearchText(contract.propertyName || "");

  if (!chargeTenant || !contractTenant || chargeTenant !== contractTenant) {
    return false;
  }

  if (!chargeProperty || !contractProperty || chargeProperty !== contractProperty) {
    return false;
  }

  const chargeAmount = Number(charge.amount || 0);
  const contractRentValue = Number(contract.rentValue || 0);

  if (Math.abs(chargeAmount - contractRentValue) > 0.01) {
    return false;
  }

  if (!charge.dueDate || !contract.startDate || !contract.endDate) {
    return false;
  }

  const chargeDueDate = new Date(charge.dueDate);
  const contractStartDate = new Date(contract.startDate + "T00:00:00");
  const contractEndDate = new Date(contract.endDate + "T23:59:59");

  if (
    Number.isNaN(chargeDueDate.getTime()) ||
    Number.isNaN(contractStartDate.getTime()) ||
    Number.isNaN(contractEndDate.getTime())
  ) {
    return false;
  }

  const lowerLimit = new Date(contractStartDate);
  lowerLimit.setDate(lowerLimit.getDate() - 5);

  const upperLimit = new Date(contractEndDate);
  upperLimit.setDate(upperLimit.getDate() + 45);

  return chargeDueDate >= lowerLimit && chargeDueDate <= upperLimit;
}



function buildStandardResidentialContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: RentixTenant,
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
  tenant?: RentixTenant,
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
  if (typeof window === "undefined") return null;

  try {
    const storedTemplates = window.localStorage.getItem(PRINT_TEMPLATES_STORAGE_KEY);

    if (!storedTemplates) return null;

    const parsedTemplates = JSON.parse(storedTemplates) as Record<string, unknown>;
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
  if (typeof window === "undefined") return null;

  try {
    const storedTemplates = window.localStorage.getItem(PRINT_TEMPLATES_STORAGE_KEY);

    if (!storedTemplates) return null;

    const parsedTemplates = JSON.parse(storedTemplates) as Record<string, unknown>;
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
  if (typeof window === "undefined") return {};

  const possibleStorageKeys = [
    "rentix_company_settings",
    "rentix_company_config",
    "rentix_company_registration",
    "rentix_company",
    "rentix_settings",
    "rentix_system_settings",
    "rentix_configuration",
  ];

  for (const storageKey of possibleStorageKeys) {
    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) continue;

    try {
      const parsedValue = JSON.parse(storedValue) as Record<string, unknown>;
      const source = getNestedCompanySettingsSource(parsedValue);
      const normalizedSettings = normalizeCompanySettingsSource(source);

      if (normalizedSettings.name || normalizedSettings.legalName || normalizedSettings.document) {
        return normalizedSettings;
      }
    } catch {
      continue;
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
  if (!startDateValue || !endDateValue) return 1;

  const start = new Date(`${startDateValue}T00:00:00`);
  const end = new Date(`${endDateValue}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
}

function getContractDurationInMonths(startDateValue: string, endDateValue: string) {
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

function getContractRentDueDay(startDateValue: string) {
  if (!startDateValue) return "____";

  const [, , day] = startDateValue.split("-");

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

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}
