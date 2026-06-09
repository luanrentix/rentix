"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import QRCode from "qrcode";
import { useAuth } from "@/context/AuthContext";
import { PersonCreateModal } from "@/components/people/person-create-modal";
import {
  createReceivableAccount,
  deleteReceivableAccount,
  getReceivableAccounts,
  receiveAccount,
  receiveAccountsBatch,
  replaceReceivedAccountPayment,
  reverseReceivedAccount,
  updateReceivableAccount,
  type PaymentMethod as ApiPaymentMethod,
  type ReceivableAccount,
} from "@/services/financial.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import { getPeople, type Person } from "@/services/people.service";
import { getProperties, type Property as ApiProperty } from "@/services/properties.service";
import {
  createScheduleItem,
  getScheduleItems,
} from "@/services/schedule.service";
import {
  getCachedCompanySettings,
  getCachedPrintTemplates,
  setCachedAppSettings,
} from "@/services/settings-cache";
import { getAppSettings } from "@/services/settings.service";
import {
  getCompanyStorageItem,
  removeCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import { openWhatsAppMessage } from "@/services/whatsapp.service";

type ThemeMode = "light" | "black" | "graphite";

function createLocalId(prefix: string) {
  const randomId =
    globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(36).slice(2, 12);

  return `${prefix}-${randomId}`;
}

const LEGACY_SETTINGS_TEMPORARY_CONTRACT_CONTENT = `CONTRATO TEMPORÁRIO

LOCADOR: {companyName}
LOCATÁRIO: {personName}
BEM/ATIVO: {propertyName}
PERÍODO: {startDate} até {endDate}
HORÁRIO: Entrada {entryTime} / Saída {exitTime}

CLÁUSULAS E CONDIÇÕES:
1. O presente contrato tem finalidade de locação temporária.
2. O locatário declara estar ciente das regras de uso do bem/ativo.
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

const DEFAULT_ASSET_CONTRACT_TEMPLATE = `CONTRATO DE LOCAÇÃO DE BEM/ATIVO

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

CLÁUSULA SEXTA - DA INADIMPLÊNCIA E RESCISÃO
O descumprimento de qualquer obrigação contratual poderá acarretar rescisão, cobrança dos valores devidos, multa, perdas e danos, além das medidas administrativas, extrajudiciais ou judiciais cabíveis.

CLÁUSULA SÉTIMA - DO FORO
As partes elegem o foro da comarca de {contractCity} para dirimir dúvidas ou questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

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
  assetCategory?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  managementMode?: string | null;
  administrationFeePercentage?: number | null;
  ownerPayoutDay?: number | null;
  autoCreateOwnerPayable?: boolean | null;
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
  tenantId?: string | null;
  property: string;
  tenant: string;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  paidAmount?: number;
  remainingAmount?: number;
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

type ActionMenuPosition = {
  top: number;
  left: number;
};

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
  tenantName?: string;
  propertyId: string;
  propertyName?: string;
  amount: number;
  monthlyAmount?: number;
  totalAmount?: number;
  issueDate: string;
  dueDate: string;
  endDate?: string;
  installmentQuantity?: number;
};

type ContractSchedulePayload = {
  id: string;
  tenantId: string;
  propertyId: string;
  tenantName?: string;
  propertyName?: string;
  endDate?: string;
};

const MAX_INSTALLMENT_QUANTITY = 120;
const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "contrx_receivable_from_contract";
const DEFAULT_RECEIVABLE_STATUS_FILTER: StatusFilter = "Pending";

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
  id?: string;
  chargeId: string;
  paidAt: string;
  method: PaymentMethod;
  paymentItems?: PaymentAllocation[];
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string;
};

type ReceiptPrintItem = {
  charge: Charge;
  paymentRecord: ChargePayment;
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatPercent(value: number) {
  return `${roundMoney(value).toFixed(2).replace(".", ",")}%`;
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

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  return formatAmountInput(Number(digits) / 100);
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
  const [isChargeSaving, setIsChargeSaving] = useState(false);
  const [processingConfirmation, setProcessingConfirmation] = useState<
    "payment" | "delete" | "reversal" | "print" | null
  >(null);

  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [focusedContractId, setFocusedContractId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    DEFAULT_RECEIVABLE_STATUS_FILTER,
  );
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [openActionMenuChargeId, setOpenActionMenuChargeId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] =
    useState<ActionMenuPosition | null>(null);

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

  const [chargeFormError, setChargeFormError] = useState("");
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargePendingDeletion, setChargePendingDeletion] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReversal, setChargePendingPaymentReversal] =
    useState<Charge | null>(null);
  const [chargePendingPaymentReceipt, setChargePendingPaymentReceipt] =
    useState<Charge | null>(null);
  const [paymentBatchCharges, setPaymentBatchCharges] = useState<Charge[]>([]);
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
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [isBlackTheme, setIsBlackTheme] = useState(false);
  const [pendingContractCarnetRequest, setPendingContractCarnetRequest] =
    useState<{ contract: Contract; charges: Charge[] } | null>(null);
  const [pendingContractPrintRequest, setPendingContractPrintRequest] =
    useState<Contract | null>(null);
  const [pendingContractScheduleNotice, setPendingContractScheduleNotice] =
    useState<{
      title: string;
      description: string;
      itemValue: string;
    } | null>(null);
  const [pendingDownPaymentFlow, setPendingDownPaymentFlow] =
    useState<{
      downPaymentChargeId: string;
      contractId: string | null;
      carnetCharges: Charge[];
    } | null>(null);

  useEffect(() => {
    if (!companyId) return;

    loadReceivablesFromBackend(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const nextContracts = apiContracts.map(mapApiContractToReceivableContract);
      const nextTenants = apiPeople.map(mapApiPersonToReceivableTenant);
      const nextPaid = nextManualCharges
        .filter((charge) => charge.status === "Paid")
        .map((charge) => charge.id);
      const nextPaymentRecords = apiCharges.flatMap(mapApiReceivableToPayments);

      setManualCharges(nextManualCharges);
      setPaid(nextPaid);
      setPaymentRecords(nextPaymentRecords);
      setContracts(nextContracts);
      setProperties(apiProperties.map(mapApiPropertyToReceivableProperty));
      setTenants(nextTenants);

      const queryParams = new URLSearchParams(window.location.search);
      const cameFromContract = queryParams.get("fromContract") === "1";
      const contractIdFromQuery = queryParams.get("contractId");

      if (cameFromContract && contractIdFromQuery) {
        setFocusedContractId(String(contractIdFromQuery));
        setStatusFilter("All");

        const linkedContract = nextContracts.find(
          (contract) => String(contract.id) === String(contractIdFromQuery),
        );
        const linkedCharges = nextManualCharges
          .filter(
            (charge) =>
              String(charge.contractId || "") === String(contractIdFromQuery) &&
              !charge.isDownPayment,
          )
          .sort(
            (firstCharge, secondCharge) =>
              Number(firstCharge.installmentNumber || 0) -
              Number(secondCharge.installmentNumber || 0),
          );

        if (linkedContract) {
          const linkedTenant =
            nextTenants.find(
              (tenant) => String(tenant.id) === String(linkedContract.tenantId),
            ) || null;

          setSelectedTenant(linkedTenant);
        }

        const contractChargeData = getCompanyStorageItem(
          currentCompanyId,
          RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
          RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
        );

        if (contractChargeData) {
          try {
            const parsedContractChargeData = JSON.parse(
              contractChargeData,
            ) as ReceivableFromContractPayload;

            removeCompanyStorageItem(currentCompanyId, RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
            openChargeFromContractPayload(parsedContractChargeData);
          } catch {
            removeCompanyStorageItem(currentCompanyId, RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
          }
        } else if (linkedCharges.length === 0) {
          setFocusedContractId(String(contractIdFromQuery));
        }
      }
    } catch (error) {
      console.error("Não foi possível carregar contas a receber.", error);
    }
  }

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
        const isDarkTheme = nextTheme !== "light";

        document.documentElement.classList.toggle("dark", isDarkTheme);
        document.body.classList.toggle("dark", isDarkTheme);
        setThemeMode(nextTheme);
        setIsBlackTheme(isDarkTheme);
      } catch {
        const nextTheme =
          legacyTheme === "graphite" || legacyTheme === "grafite"
            ? "graphite"
            : legacyTheme === "black" || legacyTheme === "dark"
              ? "black"
              : "light";
        const isDarkTheme = nextTheme !== "light";

        document.documentElement.classList.toggle("dark", isDarkTheme);
        document.body.classList.toggle("dark", isDarkTheme);
        setThemeMode(nextTheme);
        setIsBlackTheme(isDarkTheme);
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

  const openChargeFromContractPayload = useCallback((payload: ReceivableFromContractPayload) => {
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
    setFocusedContractId(null);
    setSearch("");
    setIsSearchOpen(false);
    setIsCreateOpen(true);
  }, []);

  useEffect(() => {
    const c = null;
    const p = null;
    const t = null;
    const paidData = null;
    const manualData = null;
    const paymentData = null;
    const savedAutoOpenSearch = getCompanyStorageItem(
      companyId,
      "contrx_auto_open_search",
      "contrx_auto_open_search",
    );

    if (c) setContracts(JSON.parse(c));
    if (p) setProperties(JSON.parse(p));
    if (t) setTenants(JSON.parse(t));
    if (paidData) setPaid(JSON.parse(paidData));
    if (manualData) setManualCharges(JSON.parse(manualData));
    if (paymentData) setPaymentRecords(JSON.parse(paymentData));

    setStatusFilter(DEFAULT_RECEIVABLE_STATUS_FILTER);

    if (savedAutoOpenSearch !== null) {
      const parsedAutoOpenSearch = JSON.parse(savedAutoOpenSearch) as boolean;

      setAutoOpenSearch(parsedAutoOpenSearch);
      setIsSearchOpen(parsedAutoOpenSearch);
    } else {
      setAutoOpenSearch(true);
      setIsSearchOpen(true);
    }

    const contractChargeData = getCompanyStorageItem(
      companyId,
      RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
      RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
    );
    const queryParams = new URLSearchParams(window.location.search);
    const cameFromContract = queryParams.get("fromContract") === "1";

    if (contractChargeData && !cameFromContract) {
      try {
        const parsedContractChargeData = JSON.parse(
          contractChargeData,
        ) as ReceivableFromContractPayload;

        removeCompanyStorageItem(companyId, RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
        openChargeFromContractPayload(parsedContractChargeData);
        return;
      } catch {
        removeCompanyStorageItem(companyId, RECEIVABLE_FROM_CONTRACT_STORAGE_KEY);
        return;
      }
    }
  }, [companyId, openChargeFromContractPayload]);

  useEffect(() => {
    setCompanyStorageItem(
      companyId,
      "contrx_receivable_status_filter",
      statusFilter,
    );
  }, [companyId, statusFilter]);

  const getContractAmount = useCallback((contract: Contract) => {
    return normalizeAmount(
      contract.value ??
        contract.amount ??
        contract.rentValue ??
        contract.monthlyValue ??
        0,
    );
  }, []);

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
          property: property?.name || "Bem/Ativo",
          tenant: tenant?.name || "Inquilino",
          dueDate: dueDate.toISOString(),
          amount: getContractAmount(contract),
          status,
        };
      });
  }, [contracts, properties, tenants, paid, manualCharges, getContractAmount]);

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

  const openActionMenuCharge = useMemo(() => {
    return openActionMenuChargeId
      ? charges.find((charge) => String(charge.id) === String(openActionMenuChargeId)) || null
      : null;
  }, [charges, openActionMenuChargeId]);

  function getFloatingActionMenuPosition(
    buttonRect: DOMRect,
    estimatedMenuHeight: number,
  ) {
    const menuWidth = 208;
    const viewportPadding = 16;
    const availableBottomSpace = window.innerHeight - buttonRect.bottom;
    const top =
      availableBottomSpace < estimatedMenuHeight
        ? Math.max(viewportPadding, buttonRect.top - estimatedMenuHeight - 8)
        : buttonRect.bottom + 8;
    const left = Math.min(
      Math.max(viewportPadding, buttonRect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    return { top, left };
  }

  function handleToggleChargeActions(
    charge: Charge,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    if (openActionMenuChargeId === charge.id) {
      handleCloseChargeActions();
      return;
    }

    const visibleActionCount =
      3 +
      (charge.status !== "Paid" ? 1 : 0) +
      (getChargePayment(charge.id) ? 2 : 0) +
      (charge.status === "Paid" ? 1 : 0);
    const estimatedMenuHeight = Math.min(visibleActionCount * 48 + 16, 360);

    setActionMenuPosition(
      getFloatingActionMenuPosition(
        event.currentTarget.getBoundingClientRect(),
        estimatedMenuHeight,
      ),
    );
    setOpenActionMenuChargeId(charge.id);
  }

  function handleCloseChargeActions() {
    setOpenActionMenuChargeId(null);
    setActionMenuPosition(null);
  }

  function toggleChargeSelection(chargeId: string) {
    setSelectedChargeIds((currentChargeIds) =>
      currentChargeIds.includes(chargeId)
        ? currentChargeIds.filter((currentChargeId) => currentChargeId !== chargeId)
        : [...currentChargeIds, chargeId],
    );
  }

  function toggleAllVisibleChargeSelection() {
    if (allVisibleChargesSelected) {
      setSelectedChargeIds((currentChargeIds) =>
        currentChargeIds.filter(
          (currentChargeId) => !selectableChargeIds.includes(currentChargeId),
        ),
      );
      return;
    }

    setSelectedChargeIds((currentChargeIds) =>
      Array.from(new Set([...currentChargeIds, ...selectableChargeIds])),
    );
  }

  function clearChargeSelection() {
    setSelectedChargeIds([]);
  }

  useEffect(() => {
    if (!openActionMenuChargeId) return;

    function closeFloatingActionMenu() {
      handleCloseChargeActions();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Element)) {
        closeFloatingActionMenu();
        return;
      }

      if (
        target.closest("[data-receivable-action-menu]") ||
        target.closest("[data-receivable-action-trigger]")
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
  }, [openActionMenuChargeId]);

  const getChargePayments = useCallback((chargeId: string) => {
    return paymentRecords
      .filter(
        (paymentRecord) => String(paymentRecord.chargeId) === String(chargeId),
      )
      .sort(
        (firstPayment, secondPayment) =>
          new Date(secondPayment.paidAt).getTime() -
          new Date(firstPayment.paidAt).getTime(),
      );
  }, [paymentRecords]);

  const getChargePayment = useCallback((chargeId: string) => {
    return getChargePayments(chargeId)[0];
  }, [getChargePayments]);

  const getChargePaidAmount = useCallback((charge: Charge) => {
    const backendPaidAmount = Number(charge.paidAmount || 0);

    if (backendPaidAmount > 0) return backendPaidAmount;

    return getChargePayments(charge.id).reduce(
      (total, paymentRecord) => total + paymentRecord.amountPaid,
      0,
    );
  }, [getChargePayments]);

  const getChargeSettlementAmount = useCallback((charge: Charge) => {
    return getChargePayments(charge.id).reduce((total, paymentRecord) => {
      return (
        total +
        paymentRecord.amountPaid +
        paymentRecord.discount -
        paymentRecord.interest
      );
    }, 0);
  }, [getChargePayments]);

  const getChargeRemainingAmount = useCallback((charge: Charge) => {
    if (typeof charge.remainingAmount === "number") {
      return Math.max(charge.remainingAmount, 0);
    }

    return Math.max(charge.amount - getChargeSettlementAmount(charge), 0);
  }, [getChargeSettlementAmount]);

  useEffect(() => {
    window.dispatchEvent(new Event("contrx-receivables-updated"));
    window.dispatchEvent(new Event("contrx-accounts-receivable-updated"));
    window.dispatchEvent(new Event("contrx-financial-updated"));
  }, [charges, paymentRecords]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (focusedContractId) {
      result = result.filter(
        (charge) => String(charge.contractId || "") === String(focusedContractId),
      );
    }

    if (selectedTenant) {
      result = result.filter(
        (charge) =>
          String(charge.tenantId || "") === String(selectedTenant.id) ||
          (!charge.tenantId &&
            charge.tenant.toLowerCase() === selectedTenant.name.toLowerCase()),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((charge) => charge.status === statusFilter);
    }

    return result;
  }, [charges, focusedContractId, selectedTenant, statusFilter]);

  useEffect(() => {
    const availableChargeIds = new Set(charges.map((charge) => String(charge.id)));

    setSelectedChargeIds((currentChargeIds) =>
      currentChargeIds.filter((chargeId) => availableChargeIds.has(String(chargeId))),
    );
  }, [charges]);

  const totalReceivable = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status !== "Paid")
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  }, [filteredCharges, getChargeRemainingAmount]);

  const totalPaid = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
  }, [filteredCharges, getChargePaidAmount]);

  const totalOverdue = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  }, [filteredCharges, getChargeRemainingAmount]);

  const selectedCharges = useMemo(() => {
    const selectedIds = new Set(selectedChargeIds.map(String));

    return filteredCharges.filter((charge) => selectedIds.has(String(charge.id)));
  }, [filteredCharges, selectedChargeIds]);

  const selectableChargeIds = filteredCharges.map((charge) => String(charge.id));

  const allVisibleChargesSelected =
    selectableChargeIds.length > 0 &&
    selectableChargeIds.every((chargeId) => selectedChargeIds.includes(chargeId));

  const selectedPendingCharges = selectedCharges.filter(
    (charge) => charge.status !== "Paid",
  );
  const selectedPaidCharges = selectedCharges.filter((charge) =>
    Boolean(getChargePayment(charge.id)),
  );

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

  function hasPartialPayment(charge: Charge) {
    return charge.status !== "Paid" && getChargePaidAmount(charge) > 0;
  }

  function getChargeStatusLabel(charge: Charge) {
    if (hasPartialPayment(charge)) return "Parcial";

    return getStatusLabel(charge.status);
  }

  function getChargeTenant(charge: Charge) {
    return tenants.find(
      (tenant) =>
        String(tenant.id) === String(charge.tenantId || "") ||
        tenant.name.toLowerCase() === charge.tenant.toLowerCase(),
    );
  }

  function getCompanyNameFromSettings(settings: Record<string, unknown> | null) {
    const source =
      settings?.company && typeof settings.company === "object" && !Array.isArray(settings.company)
        ? (settings.company as Record<string, unknown>)
        : settings;

    return String(
      source?.tradeName ||
        source?.companyName ||
        source?.name ||
        source?.legalName ||
        "Contrx",
    );
  }

  async function getWhatsAppCompanyName() {
    const cachedCompanySettings = getCachedCompanySettings();

    if (cachedCompanySettings) {
      return getCompanyNameFromSettings(cachedCompanySettings);
    }

    if (!companyId) return "Contrx";

    try {
      const settings = await getAppSettings(companyId);
      setCachedAppSettings(settings);

      return getCompanyNameFromSettings(settings.companySettings || null);
    } catch {
      return "Contrx";
    }
  }

  async function sendChargeWhatsAppMessage(charge: Charge) {
    const tenant = getChargeTenant(charge);
    const tenantPhone = tenant?.phone || "";

    if (!tenantPhone) {
      window.alert("Este inquilino/pessoa nao possui telefone cadastrado.");
      return;
    }

    const chargeAmount =
      charge.status === "Paid"
        ? getChargePaidAmount(charge)
        : getChargeRemainingAmount(charge);
    const installmentLabel =
      charge.installmentNumber && charge.installmentTotal
        ? ` (${charge.installmentNumber}/${charge.installmentTotal})`
        : "";
    const companyName = await getWhatsAppCompanyName();

    openWhatsAppMessage({
      phone: tenantPhone,
      message: [
        `Olá, ${charge.tenant}.`,
        "",
        `${companyName} informa sobre a cobrança${installmentLabel}:`,
        `Bem/Ativo: ${charge.property || "Não informado"}`,
        `Vencimento: ${formatDate(charge.dueDate)}`,
        `Valor: ${formatCurrency(chargeAmount)}`,
        `Status: ${getChargeStatusLabel(charge)}`,
        "",
        "Caso já tenha realizado o pagamento, por favor envie o comprovante por aqui.",
      ].join("\n"),
    });
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

  function getChargeStatusClassName(charge: Charge) {
    if (hasPartialPayment(charge)) {
      return "bg-sky-50 dark:bg-sky-950/30 text-sky-700 ring-1 ring-sky-200 dark:ring-sky-900/60";
    }

    return getStatusClassName(charge.status);
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
    return Math.max(getChargeRemainingAmount(charge) + interest - discount, 0);
  }

  function getPaymentAdjustmentAmountInput(
    charge: Charge,
    value: string,
    mode: PaymentAdjustmentMode,
  ) {
    const normalizedValue = normalizeAmount(value);

    if (normalizedValue <= 0) return "";

    if (mode === "percentage") {
      return formatAmountInput(
        getChargeRemainingAmount(charge) * (normalizedValue / 100),
      );
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
    const difference = finalAmount - getChargeRemainingAmount(charge);

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

    setPaymentInterestInput("");
    setPaymentDiscountInput("");
    setPaymentInterest("");
    setPaymentDiscount("");
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
        id: createLocalId("payment-entry"),
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
        entry.id === entryId
          ? { ...entry, amount: formatCurrencyInput(amount) }
          : entry,
      ),
    );
  }

  function normalizePaymentEntryAmount(entryId: string) {
    setPaymentEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.id !== entryId) return entry;

        const amount = normalizeAmount(entry.amount);

        return {
          ...entry,
          amount: amount > 0 ? formatAmountInput(amount) : "",
        };
      }),
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
        String(charge.tenantId || "") !== String(selectedReportTenant.id) &&
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
        (charge.status === "Paid"
          ? getChargePaidAmount(charge)
          : getChargeRemainingAmount(charge)),
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
      companyName: "Contrx",
      tradeName: "Contrx",
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

      const source =
        cachedCompanySettings.company &&
        typeof cachedCompanySettings.company === "object" &&
        !Array.isArray(cachedCompanySettings.company)
          ? (cachedCompanySettings.company as Record<string, unknown>)
          : (cachedCompanySettings as Record<string, unknown>);

      return {
        ...defaultCompanySettings,
        ...source,
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
        document: String(source.document || source.cnpj || source.cpfCnpj || ""),
        phone: String(source.phone || source.companyPhone || source.whatsapp || ""),
        email: String(source.email || source.companyEmail || ""),
        city: String(source.city || source.cidade || "BRASIL"),
        pixKeyType: String(source.pixKeyType || source.tipoChavePix || ""),
        pixKey: String(source.pixKey || source.pix || source.chavePix || ""),
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

    return cleanContent;
  }

  function renderPaymentBookletTemplate(
    templateContent: string,
    templateData: Record<string, string>,
  ) {
    return Object.entries(templateData).reduce((content, [key, value]) => {
      return content.replace(new RegExp(`{${key}}`, "g"), value);
    }, templateContent);
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

  function normalizePixKeyForPayload(value: string, pixKeyType: string) {
    const cleanValue = value.trim();
    const cleanPixKeyType = pixKeyType.toLowerCase();

    if (cleanPixKeyType === "cpf" || cleanPixKeyType === "cnpj") {
      return cleanValue.replace(/\D/g, "");
    }

    if (cleanPixKeyType === "phone") {
      const digits = cleanValue.replace(/\D/g, "");

      if (digits.startsWith("55")) {
        return `+${digits}`;
      }

      if (digits.length === 10 || digits.length === 11) {
        return `+55${digits}`;
      }

      return cleanValue;
    }

    if (cleanPixKeyType === "email") {
      return cleanValue.toLowerCase();
    }

    return cleanValue;
  }

  function formatEmvField(id: string, value: string) {
    const length = String(value.length).padStart(2, "0");

    return `${id}${length}${value}`;
  }

  function buildPixMerchantAccountInfo(pixKey: string, description: string) {
    const baseFields =
      formatEmvField("00", "br.gov.bcb.pix") + formatEmvField("01", pixKey);
    const maxMerchantAccountInfoLength = 99;
    const availableDescriptionLength =
      maxMerchantAccountInfoLength - baseFields.length - 4;

    if (availableDescriptionLength <= 0) {
      return baseFields;
    }

    const cleanDescription = sanitizePixText(
      description,
      Math.min(availableDescriptionLength, 72),
    );

    if (!cleanDescription) {
      return baseFields;
    }

    return baseFields + formatEmvField("02", cleanDescription);
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
    pixKeyType: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    txId: string;
    description: string;
  }) {
    const pixKey = normalizePixKeyForPayload(params.pixKey, params.pixKeyType);

    if (!pixKey) {
      return "";
    }

    const merchantAccountInfo = buildPixMerchantAccountInfo(
      pixKey,
      params.description,
    );
    const merchantName = sanitizePixText(params.merchantName || "CONTRX", 25) || "CONTRX";
    const merchantCity = sanitizePixText(params.merchantCity || "BRASIL", 15) || "BRASIL";

    const additionalDataField = formatEmvField(
      "05",
      sanitizePixText(params.txId || "CONTRX", 25),
    );

    const amount = Number(params.amount || 0).toFixed(2);
    const payloadWithoutCrc =
      formatEmvField("00", "01") +
      formatEmvField("26", merchantAccountInfo) +
      formatEmvField("52", "0000") +
      formatEmvField("53", "986") +
      formatEmvField("54", amount) +
      formatEmvField("58", "BR") +
      formatEmvField("59", merchantName) +
      formatEmvField("60", merchantCity) +
      formatEmvField("62", additionalDataField) +
      "6304";

    return `${payloadWithoutCrc}${calculatePixCrc16(payloadWithoutCrc)}`;
  }

  async function getPixQrCodeDataUrl(pixPayload: string) {
    try {
      return await QRCode.toDataURL(pixPayload, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 180,
      });
    } catch (error) {
      console.warn("Nao foi possivel gerar QR Code Pix localmente.", error);
      return "";
    }
  }

  async function generatePaymentCarnet(carnetCharges: Charge[]) {
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
      companySettings.tradeName || companySettings.companyName || "Contrx";
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

    const vouchers = (
      await Promise.all(
        carnetCharges.map(async (charge) => {
        const installmentLabel = `${charge.installmentNumber || 1}/${
          charge.installmentTotal || carnetCharges.length
        }`;
        const pixPayload = generatePixPayload({
          pixKey: companySettings.pixKey || "",
          pixKeyType,
          merchantName: companyName,
          merchantCity: companySettings.city || "Brasil",
          amount: charge.amount,
          txId: `RX${String(charge.installmentGroupId || charge.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-18)}${String(charge.installmentNumber || 1).padStart(2, "0")}`,
          description: `Aluguel ${installmentLabel} ${charge.tenant}`,
        });
        const pixQrCodeDataUrl = pixPayload ? await getPixQrCodeDataUrl(pixPayload) : "";
        const paymentBookletContent = renderPaymentBookletTemplate(
          paymentBookletInstructions,
          {
            companyName,
            tradeName: companyName,
            personName: charge.tenant,
            tenantName: charge.tenant,
            propertyName: charge.property,
            contractNumber: String(charge.contractId || firstCharge.contractId || "SEM CONTRATO"),
            installmentNumber: installmentLabel,
            dueDate: formatDate(charge.dueDate),
            amount: formatCurrency(charge.amount),
            pixKey,
            currentDate: new Date().toLocaleDateString("pt-BR"),
          },
        );

        return `
          <section class="voucher">
            <div class="voucher-header">
              <div>
                <div class="brand">${escapeHtml(companyName)}</div>
                <h2>Carnê de pagamento</h2>
              </div>
              <div class="installment-badge">
                <span>Parcela</span>
                <strong>${installmentLabel}</strong>
              </div>
            </div>

            <div class="payer-card">
              <div>
                <span>Pagador</span>
                <strong>${escapeHtml(charge.tenant)}</strong>
              </div>
              <div>
                <span>Bem/Ativo</span>
                <strong>${escapeHtml(charge.property)}</strong>
              </div>
            </div>

            <div class="amount-strip">
              <div>
                <span>Vencimento</span>
                <strong>${formatDate(charge.dueDate)}</strong>
              </div>
              <div>
                <span>Valor</span>
                <strong>${formatCurrency(charge.amount)}</strong>
              </div>
            </div>

            <div class="pix-area">
              <div class="pix-info">
                <div class="pix-heading">
                  <span>Pagamento via Pix</span>
                  <strong>${escapeHtml(pixKey)}</strong>
                  <small>Tipo da chave: ${escapeHtml(pixKeyType || "Não informado")}</small>
                </div>
                ${
                  pixPayload
                    ? `<div class="pix-copy"><span>Pix copia e cola</span><p>${escapeHtml(pixPayload)}</p></div>`
                    : `<div class="pix-warning">Cadastre a chave Pix da empresa para gerar o QR Code automático.</div>`
                }
              </div>
              ${
                pixQrCodeDataUrl
                  ? `<div class="pix-qr"><img src="${pixQrCodeDataUrl}" alt="QR Code Pix" /><span>QR Code Pix</span></div>`
                  : pixPayload
                    ? `<div class="pix-qr pix-qr-error"><span>QR Code indisponivel</span></div>`
                  : ""
              }
            </div>

            ${renderPaymentBookletInstructions(paymentBookletContent)}

            <div class="voucher-footer">
              <span>${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)}</span>
              <span>Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}</span>
            </div>
          </section>
        `;
        }),
      )
    )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Carnê de Pagamento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #eef2f7; color: #172033; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.97); border-bottom: 1px solid #d8dee8; backdrop-filter: blur(10px); }
            .toolbar button { border: 0; border-radius: 8px; padding: 11px 18px; font-size: 12px; font-weight: 900; cursor: pointer; }
            .print-button { background: #0f766e; color: #ffffff; }
            .close-button { background: #f8fafc; color: #172033; border: 1px solid #cbd5e1 !important; }
            @page { size: A4; margin: 7mm; }
            .page { width: min(1080px, calc(100% - 28px)); margin: 14px auto; }
            .voucher-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
            .summary { margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; padding: 14px 16px; box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08); }
            .summary-header { display: grid; grid-template-columns: 1fr auto; gap: 14px; border-bottom: 2px solid #172033; padding-bottom: 9px; }
            .brand { color: #0f766e; font-size: 9.5px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
            h1, h2 { margin: 5px 0 0; color: #172033; letter-spacing: 0; }
            h1 { font-size: 22px; text-transform: uppercase; }
            h2 { font-size: 14px; }
            .summary p { margin: 5px 0 0; font-size: 11px; }
            .summary-meta { color: #475569; font-size: 11px; line-height: 1.55; text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #172033; color: #ffffff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
            th, td { border: 1px solid #d8dee8; padding: 5px 6px; font-size: 10px; text-align: left; }
            tbody tr:nth-child(even) td { background: #f8fafc; }
            .voucher { position: relative; overflow: hidden; break-inside: avoid; page-break-inside: avoid; border: 1px solid #c6cfda; border-radius: 4px; background: #ffffff; padding: 10px; min-height: 286px; }
            .voucher::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: #0f766e; }
            .voucher-header { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 10px; border-bottom: 1.5px solid #172033; padding: 0 0 8px 7px; }
            .voucher-header h2 { text-transform: uppercase; }
            .installment-badge { min-width: 74px; border: 1px solid #172033; background: #f8fafc; color: #172033; padding: 5px 8px; text-align: center; white-space: nowrap; }
            .installment-badge span { display: block; color: #64748b; font-size: 7.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
            .installment-badge strong { display: block; margin-top: 1px; font-size: 13px; line-height: 1; }
            .payer-card { display: grid; grid-template-columns: 1fr; gap: 5px; margin: 8px 0 0 7px; padding: 8px 9px; border: 1px solid #d8dee8; background: #f8fafc; }
            .payer-card span, .amount-strip span, .pix-heading span, .pix-copy span { display: block; color: #64748b; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
            .payer-card strong { display: block; margin-top: 2px; color: #172033; font-size: 10.5px; line-height: 1.2; text-transform: uppercase; }
            .amount-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 7px 0 0 7px; border: 1px solid #172033; background: #172033; }
            .amount-strip div { background: #ffffff; padding: 7px 9px; }
            .amount-strip div + div { border-left: 1px solid #172033; }
            .amount-strip strong { display: block; margin-top: 2px; color: #172033; font-size: 14px; line-height: 1.1; }
            .pix-area { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 8px; margin: 8px 0 0 7px; border: 1px solid #d8dee8; background: #ffffff; padding: 8px; }
            .pix-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
            .pix-heading { display: grid; grid-template-columns: 1fr; gap: 2px; }
            .pix-heading span { color: #0f766e; }
            .pix-heading strong { display: block; color: #172033; font-size: 12px; line-height: 1.1; }
            .pix-heading small { display: block; color: #64748b; font-size: 7.6px; font-weight: 800; }
            .pix-copy { border: 1px dashed #a7b2c1; background: #f8fafc; padding: 6px; }
            .pix-copy span { color: #0f766e; }
            .pix-copy p { margin: 3px 0 0; color: #172033; font-family: "Courier New", monospace; font-size: 5.8px; line-height: 1.28; word-break: break-all; }
            .pix-warning { border: 1px solid #fbbf24; background: #fffbeb; color: #92400e; padding: 6px; font-size: 8px; font-weight: 800; }
            .pix-qr { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; padding: 6px; border: 1px solid #d8dee8; min-height: 124px; }
            .pix-qr img { width: 98px; height: 98px; object-fit: contain; background: #ffffff; }
            .pix-qr span { margin-top: 4px; color: #172033; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
            .instructions { margin: 8px 0 0 7px; border: 1px solid #d8dee8; border-left: 4px solid #0f766e; background: #ffffff; padding: 7px 8px; }
            .instructions span { display: block; margin-bottom: 4px; color: #0f766e; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
            .instructions p { margin: 1px 0; color: #475569; font-size: 7.4px; line-height: 1.25; font-weight: 700; }
            .voucher-footer { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 7px 0 0 7px; border-top: 1px solid #d8dee8; padding-top: 5px; color: #64748b; font-size: 7.3px; font-weight: 700; }
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
                  <p>Bem/Ativo: <strong>${escapeHtml(firstCharge.property)}</strong></p>
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
                    <th>Bem/Ativo</th>
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
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
    const paidTotal = reportCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
    const overdueTotal = reportCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
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
          charge.status === "Paid"
            ? getChargePaidAmount(charge)
            : getChargeRemainingAmount(charge);
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
              <div class="brand">Contrx · Financeiro</div>
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
                <th>Bem/Ativo</th>
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

          <div class="footer">Relatório gerado pelo módulo Contas a Receber do Contrx.</div>
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

    resetCreateForm();
    setFormIssueDate(getLocalDateValue(today));
    setFormDueDate(getLocalDateValue(dueDate));
    setEditingChargeId(null);
    setIsChargeSaving(false);
    setIsCreateOpen(true);
  }

  function openEditCharge(charge: Charge) {
    const tenant = tenants.find(
      (item) =>
        String(item.id) === String(charge.tenantId || "") ||
        item.name.toLowerCase() === charge.tenant.toLowerCase(),
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
    setIsChargeSaving(false);
    setIsCreateOpen(true);
  }

  function openReceivePaymentModal(charge: Charge, batchCharges: Charge[] = []) {
    const normalizedBatchCharges = batchCharges.length > 0 ? batchCharges : [];
    const remainingAmount = normalizedBatchCharges.length
      ? normalizedBatchCharges.reduce(
          (total, currentCharge) => total + getChargeRemainingAmount(currentCharge),
          0,
        )
      : getChargeRemainingAmount(charge);

    setChargePendingPaymentReceipt(charge);
    setPaymentBatchCharges(normalizedBatchCharges);
    setPaymentInterest("");
    setPaymentDiscount("");
    setPaymentInterestInput("");
    setPaymentDiscountInput("");
    setPaymentInterestMode("amount");
    setPaymentDiscountMode("amount");
    setPaymentFinalAmount(formatAmountInput(remainingAmount));
    setPaymentMethod("Cash");
    setPaymentEntries([
      {
        id: createLocalId("payment-entry"),
        method: "Cash",
        amount: formatAmountInput(remainingAmount),
      },
    ]);
    setPaymentNote("");
    setPaymentFormError("");
  }

  function closeReceivePaymentModal() {
    if (processingConfirmation) return;

    setChargePendingPaymentReceipt(null);
    setPaymentBatchCharges([]);
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
    const remainingAmount = paymentBatchCharges.length
      ? paymentBatchCharges.reduce(
          (total, charge) => total + getChargeRemainingAmount(charge),
          0,
        )
      : getChargeRemainingAmount(chargePendingPaymentReceipt);
    const maximumPaymentAmount = Math.max(remainingAmount + interest - discount, 0);

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

    if (amountPaid - maximumPaymentAmount > 0.01) {
      setPaymentFormError(
        `O valor recebido não pode ser maior que ${formatCurrency(maximumPaymentAmount)} considerando juros e desconto.`,
      );
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

    if (Math.abs(paymentEntriesTotal - amountPaid) > 0.01) {
      const difference = Math.abs(amountPaid - paymentEntriesTotal);

      setPaymentFormError(
        paymentEntriesTotal < amountPaid
          ? `Falta informar ${formatCurrency(difference)} nas formas de pagamento.`
          : `As formas de pagamento excedem o valor recebido em ${formatCurrency(difference)}.`,
      );
      return;
    }

    setPaymentFormError("");
    setIsPaymentConfirmationOpen(true);
  }

  function closePaymentConfirmation() {
    if (processingConfirmation) return;

    setIsPaymentConfirmationOpen(false);
  }

  function getOwnerPayoutNotice(charge: Charge | null) {
    if (!charge?.contractId) return null;

    const contract = contracts.find(
      (item) => String(item.id) === String(charge.contractId),
    );
    const property = contract
      ? properties.find((item) => String(item.id) === String(contract.propertyId))
      : properties.find(
          (item) => item.name.toLowerCase() === charge.property.toLowerCase(),
        );

    if (
      !property ||
      property.managementMode !== "MANAGED" ||
      property.autoCreateOwnerPayable === false ||
      !property.ownerId
    ) {
      return null;
    }

    const receivedAmount = normalizeAmount(paymentFinalAmount);
    const feePercent = normalizeAmount(property.administrationFeePercentage || 0);
    const feeAmount = roundMoney((receivedAmount * feePercent) / 100);
    const payoutAmount = roundMoney(receivedAmount - feeAmount);

    if (receivedAmount <= 0 || payoutAmount <= 0) return null;

    return {
      ownerName: property.ownerName || "Proprietario nao informado",
      propertyName: property.name || charge.property,
      feePercent,
      feeAmount,
      payoutAmount,
      payoutDay: property.ownerPayoutDay || null,
    };
  }

  async function finishReceivePayment() {
    if (!chargePendingPaymentReceipt || processingConfirmation) return;

    setProcessingConfirmation("payment");

    if (paymentBatchCharges.length > 1) {
      await finishBatchReceivePayment();
      setProcessingConfirmation(null);
      return;
    }

    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const amountPaid = normalizeAmount(paymentFinalAmount);
    const paidAt = formPaymentDate
      ? new Date(`${formPaymentDate}T00:00:00`).toISOString()
      : new Date().toISOString();

    const paymentRecord: ChargePayment = {
      chargeId: chargePendingPaymentReceipt.id,
      paidAt,
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

    let receivedAccount: ReceivableAccount | null = null;

    if (companyId) {
      try {
        receivedAccount = await receiveAccount(chargePendingPaymentReceipt.id, {
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
            : "Não foi possível registrar o recebimento no backend.",
        );
        setProcessingConfirmation(null);
        return;
      }
    }

    if (receivedAccount) {
      const receivedCharge = mapApiReceivableToCharge(receivedAccount);
      const receivedPaymentRecords = mapApiReceivableToPayments(receivedAccount);

      setManualCharges((currentCharges) => {
        const chargeExists = currentCharges.some(
          (charge) => String(charge.id) === String(receivedCharge.id),
        );

        return chargeExists
          ? currentCharges.map((charge) =>
              String(charge.id) === String(receivedCharge.id)
                ? receivedCharge
                : charge,
            )
          : [...currentCharges, receivedCharge];
      });
      setPaid((currentPaid) => {
        const nextPaid = currentPaid.filter(
          (paidChargeId) =>
            String(paidChargeId) !== String(receivedCharge.id),
        );

        return receivedCharge.status === "Paid"
          ? [...nextPaid, receivedCharge.id]
          : nextPaid;
      });
      setPaymentRecords((currentPaymentRecords) => [
        ...currentPaymentRecords.filter(
          (currentPaymentRecord) =>
            String(currentPaymentRecord.chargeId) !== String(receivedCharge.id),
        ),
        ...receivedPaymentRecords,
      ]);
    } else {
      const nextSettlementAmount =
        getChargeSettlementAmount(chargePendingPaymentReceipt) +
        amountPaid +
        discount -
        interest;
      const shouldMarkAsPaid =
        nextSettlementAmount >= chargePendingPaymentReceipt.amount;

      setPaid((currentPaid) => {
        const nextPaid = currentPaid.filter(
          (paidChargeId) =>
            String(paidChargeId) !== String(chargePendingPaymentReceipt.id),
        );

        return shouldMarkAsPaid
          ? [...nextPaid, chargePendingPaymentReceipt.id]
          : nextPaid;
      });
      setPaymentRecords((currentPaymentRecords) => [
        ...currentPaymentRecords,
        paymentRecord,
      ]);
    }

    const receivedFlowCharge = chargePendingPaymentReceipt;

    generatePaymentReceipt(receivedFlowCharge, paymentRecord);
    closeReceivePaymentModal();
    await continueContractFlowAfterDownPayment(receivedFlowCharge);
    setProcessingConfirmation(null);
  }

  function distributeBatchPaymentAmount(
    chargesToReceive: Charge[],
    totalAmount: number,
  ) {
    const normalizedTotalInCents = Math.max(Math.round(totalAmount * 100), 0);
    const totalRemainingInCents = chargesToReceive.reduce(
      (total, charge) => total + Math.round(getChargeRemainingAmount(charge) * 100),
      0,
    );

    if (normalizedTotalInCents <= 0 || totalRemainingInCents <= 0) {
      return chargesToReceive.map(() => 0);
    }

    let distributedInCents = 0;

    return chargesToReceive.map((charge, index) => {
      if (index === chargesToReceive.length - 1) {
        return Math.max((normalizedTotalInCents - distributedInCents) / 100, 0);
      }

      const remainingInCents = Math.round(getChargeRemainingAmount(charge) * 100);
      const shareInCents = Math.min(
        remainingInCents,
        Math.round((normalizedTotalInCents * remainingInCents) / totalRemainingInCents),
      );

      distributedInCents += shareInCents;

      return shareInCents / 100;
    });
  }

  async function finishBatchReceivePayment() {
    const chargesToReceive = paymentBatchCharges.filter(
      (charge) => charge.status !== "Paid",
    );

    if (chargesToReceive.length === 0) return;

    const amountPaid = normalizeAmount(paymentFinalAmount);
    const interest = normalizeAmount(paymentInterest);
    const discount = normalizeAmount(paymentDiscount);
    const paidAt = formPaymentDate
      ? new Date(`${formPaymentDate}T00:00:00`).toISOString()
      : new Date().toISOString();
    const amountDistribution = distributeBatchPaymentAmount(
      chargesToReceive,
      amountPaid,
    );
    const interestDistribution = distributeBatchPaymentAmount(
      chargesToReceive,
      interest,
    );
    const discountDistribution = distributeBatchPaymentAmount(
      chargesToReceive,
      discount,
    );
    const nextPaymentRecords: ChargePayment[] = [];
    const nextReceivedCharges: Charge[] = [];

    for (const [index, charge] of chargesToReceive.entries()) {
      const distributedAmount = amountDistribution[index] || 0;
      const distributedInterest = interestDistribution[index] || 0;
      const distributedDiscount = discountDistribution[index] || 0;

      if (distributedAmount <= 0) continue;

      const paymentRecord: ChargePayment = {
        id: createLocalId("payment"),
        chargeId: charge.id,
        paidAt,
        method: paymentEntries[0]?.method || paymentMethod,
        paymentItems: [
          {
            id: createLocalId("payment-entry"),
            method: paymentEntries[0]?.method || paymentMethod,
            amount: distributedAmount,
          },
        ],
        interest: distributedInterest,
        discount: distributedDiscount,
        amountPaid: distributedAmount,
        note: paymentNote.trim() || "Recebimento em lote",
      };

      nextPaymentRecords.push(paymentRecord);

      if (!companyId) {
        const nextSettlementAmount =
          getChargeSettlementAmount(charge) +
          distributedAmount +
          distributedDiscount -
          distributedInterest;
        const shouldMarkAsPaid = nextSettlementAmount >= charge.amount;

        nextReceivedCharges.push({
          ...charge,
          paidAmount: getChargePaidAmount(charge) + distributedAmount,
          remainingAmount: Math.max(charge.amount - nextSettlementAmount, 0),
          status: shouldMarkAsPaid ? "Paid" : "Pending",
        });
      }
    }

    if (nextPaymentRecords.length === 0) {
      setPaymentFormError("Informe um valor válido para receber as contas selecionadas.");
      return;
    }

    if (companyId) {
      try {
        const receivedAccounts = await receiveAccountsBatch(
          nextPaymentRecords.map((paymentRecord) => ({
            chargeId: paymentRecord.chargeId,
            paidAt: paymentRecord.paidAt,
            method: mapUiPaymentMethodToApi(paymentRecord.method),
            paymentItems: mapUiPaymentItemsToApi(paymentRecord.paymentItems || []),
            interest: paymentRecord.interest,
            discount: paymentRecord.discount,
            amountPaid: paymentRecord.amountPaid,
            note: paymentRecord.note,
          })),
        );

        nextReceivedCharges.push(...receivedAccounts.map(mapApiReceivableToCharge));
        nextPaymentRecords.splice(
          0,
          nextPaymentRecords.length,
          ...receivedAccounts.flatMap(mapApiReceivableToPayments),
        );
      } catch (error) {
        setPaymentFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível registrar o recebimento em lote no backend.",
        );
        return;
      }
    }

    setManualCharges((currentCharges) => {
      const receivedById = new Map(
        nextReceivedCharges.map((charge) => [String(charge.id), charge]),
      );

      const updatedCharges = currentCharges.map((charge) =>
        receivedById.get(String(charge.id)) || charge,
      );
      const existingIds = new Set(updatedCharges.map((charge) => String(charge.id)));
      const missingReceivedCharges = nextReceivedCharges.filter(
        (charge) => !existingIds.has(String(charge.id)),
      );

      return [...updatedCharges, ...missingReceivedCharges];
    });

    setPaid((currentPaid) => {
      const nextPaid = currentPaid.filter(
        (paidChargeId) =>
          !nextReceivedCharges.some(
            (charge) => String(charge.id) === String(paidChargeId),
          ),
      );

      return [
        ...nextPaid,
        ...nextReceivedCharges
          .filter((charge) => charge.status === "Paid")
          .map((charge) => charge.id),
      ];
    });

    setPaymentRecords((currentPaymentRecords) => [
      ...currentPaymentRecords,
      ...nextPaymentRecords,
    ]);

    generatePaymentReceiptBatch(
      nextPaymentRecords.map((paymentRecord) => ({
        charge:
          nextReceivedCharges.find(
            (charge) => String(charge.id) === String(paymentRecord.chargeId),
          ) ||
          chargesToReceive.find(
            (charge) => String(charge.id) === String(paymentRecord.chargeId),
          )!,
        paymentRecord,
      })),
    );
    clearChargeSelection();
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
    setStatusFilter(DEFAULT_RECEIVABLE_STATUS_FILTER);
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
    if (processingConfirmation) return;

    setChargePendingDeletion(null);
  }

  function openPaymentReversalConfirmation(selectedCharge?: Charge) {
    if (!selectedCharge && !editingChargeId) return;

    const charge =
      selectedCharge ||
      charges.find((item) => String(item.id) === String(editingChargeId));

    if (!charge || !getChargePayment(charge.id)) {
      setChargeFormError(
        "Esta cobrança não está marcada como paga para voltar para pagamento.",
      );
      return;
    }

    setChargePendingPaymentReversal(charge);
  }

  function closePaymentReversalConfirmation() {
    if (processingConfirmation) return;

    setChargePendingPaymentReversal(null);
  }

  async function confirmPaymentReversal() {
    if (!chargePendingPaymentReversal || processingConfirmation) return;

    setProcessingConfirmation("reversal");

    let reversedAccount: ReceivableAccount | null = null;

    if (companyId) {
      try {
        reversedAccount = await reverseReceivedAccount(
          chargePendingPaymentReversal.id,
        );
      } catch (error) {
        setChargeFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível estornar o recebimento no backend.",
        );
        setChargePendingPaymentReversal(null);
        setProcessingConfirmation(null);
        return;
      }
    }

    if (reversedAccount) {
      const reversedCharge = mapApiReceivableToCharge(reversedAccount);
      const reversedPaymentRecords = mapApiReceivableToPayments(reversedAccount);

      setManualCharges((currentCharges) =>
        currentCharges.map((charge) =>
          String(charge.id) === String(reversedCharge.id)
            ? reversedCharge
            : charge,
        ),
      );
      setPaid((currentPaid) => {
        const nextPaid = currentPaid.filter(
          (paidChargeId) =>
            String(paidChargeId) !== String(reversedCharge.id),
        );

        return reversedCharge.status === "Paid"
          ? [...nextPaid, reversedCharge.id]
          : nextPaid;
      });
      setPaymentRecords((currentPaymentRecords) => [
        ...currentPaymentRecords.filter(
          (paymentRecord) =>
            String(paymentRecord.chargeId) !== String(reversedCharge.id),
        ),
        ...reversedPaymentRecords,
      ]);
    } else {
      const updatedPaid = paid.filter(
        (paidChargeId) =>
          String(paidChargeId) !== String(chargePendingPaymentReversal.id),
      );
      const updatedPaymentRecords = paymentRecords.filter(
        (paymentRecord) =>
          String(paymentRecord.chargeId) !==
          String(chargePendingPaymentReversal.id),
      );
      const updatedManualCharges = manualCharges.map((charge) =>
        String(charge.id) === String(chargePendingPaymentReversal.id)
          ? {
              ...charge,
              status: "Pending" as const,
              paidAmount: 0,
              remainingAmount: charge.amount,
            }
          : charge,
      );

      setManualCharges(updatedManualCharges);
      setPaid(updatedPaid);
      setPaymentRecords(updatedPaymentRecords);
    }
    setChargePendingPaymentReversal(null);
    setProcessingConfirmation(null);
    closeCreateModal();
  }

  async function confirmDeleteCharge() {
    if (!chargePendingDeletion || processingConfirmation) return;

    setProcessingConfirmation("delete");

    if (companyId) {
      try {
        await deleteReceivableAccount(chargePendingDeletion.id);
      } catch (error) {
        setChargeFormError(
          error instanceof Error
            ? error.message
            : "Não foi possível excluir a cobrança no backend.",
        );
        setChargePendingDeletion(null);
        setProcessingConfirmation(null);
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
    setProcessingConfirmation(null);
    closeCreateModal();
  }

  function openTenantCreateModal() {
    setIsTenantCreateOpen(true);
  }

  function closeTenantCreateModal() {
    setIsTenantCreateOpen(false);
  }

  function handleTenantCreated(apiPerson: Person) {
    const newTenant = mapApiPersonToReceivableTenant(apiPerson);

    setTenants((currentTenants) => {
      const tenantAlreadyExists = currentTenants.some(
        (tenant) => String(tenant.id) === String(newTenant.id),
      );

      return tenantAlreadyExists ? currentTenants : [...currentTenants, newTenant];
    });
    setFormTenant(newTenant.id);
    setChargeFormError("");
  }

  const generateInstallmentPreview = useCallback(() => {
    const totalAmountInCents = getAmountInCents(formAmount);
    const quantity = Number(formInstallmentQuantity);

    if (!formDueDate || totalAmountInCents <= 0 || !Number.isFinite(quantity)) {
      setInstallmentPreview([]);
      return;
    }

    const normalizedQuantity = Math.min(
      MAX_INSTALLMENT_QUANTITY,
      Math.max(2, Math.trunc(quantity)),
    );
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
  }, [
    formAmount,
    formDueDate,
    formIssueDate,
    formInstallmentQuantity,
    formFirstInstallmentAsDownPayment,
  ]);

  useEffect(() => {
    if (formLaunchType !== "installment") {
      setInstallmentPreview([]);
      return;
    }

    generateInstallmentPreview();
  }, [formLaunchType, generateInstallmentPreview]);

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

  async function registerContractDueDateOnSchedule(
    contract: Contract | ContractSchedulePayload,
  ) {
    if (!contract.endDate) return false;

    const scheduleDate = getDateInputValue(contract.endDate);

    if (!scheduleDate) return false;

    const contractId = String(contract.id);
    const scheduleMarker = `contract-due:${contractId}`;
    const tenantName =
      contract.tenantName ||
      tenants.find((tenant) => String(tenant.id) === String(contract.tenantId))?.name ||
      "Inquilino nao informado";
    const propertyName =
      contract.propertyName ||
      properties.find((property) => String(property.id) === String(contract.propertyId))?.name ||
      "Bem/ativo nao informado";

    try {
      const currentScheduleItems = await getScheduleItems();
      const alreadyScheduled = currentScheduleItems.some((item) => {
        return (
          item.notes?.includes(scheduleMarker) ||
          (item.type === "Contrato" &&
            item.date.slice(0, 10) === scheduleDate &&
            item.customerName === tenantName &&
            item.propertyName === propertyName &&
            item.title === "Vencimento de contrato")
        );
      });

      if (alreadyScheduled) return true;

      await createScheduleItem({
        title: "Vencimento de contrato",
        customerName: tenantName,
        propertyName,
        date: scheduleDate,
        time: "08:00",
        type: "Contrato",
        status: "scheduled",
        priority: "high",
        responsibleName: "Administrativo",
        reminder: "1 dia antes",
        notes: [
          `Contrato: ${contractId}`,
          `Vencimento em ${formatDate(contract.endDate)}`,
          scheduleMarker,
        ].join("\n"),
      });

      return true;
    } catch (error) {
      console.warn("Nao foi possivel registrar o vencimento do contrato na agenda.", error);
      return false;
    }
  }

  function handleAfterContractCarnetGenerated(contractId: string | number | null | undefined) {
    const linkedContract = getContractById(contractId);

    if (linkedContract) {
      setPendingContractPrintRequest(linkedContract);
    }
  }

  function continueContractFlowAfterReceivableChargesSaved(
    contractId: string | number | null | undefined,
    carnetCharges: Charge[],
  ) {
    const linkedContract = getContractById(contractId);

    if (linkedContract && carnetCharges.length > 0) {
      setPendingContractCarnetRequest({
        contract: linkedContract,
        charges: carnetCharges,
      });
      return;
    }

    if (carnetCharges.length > 0) {
      void generatePaymentCarnet(carnetCharges);
    }

    handleAfterContractCarnetGenerated(contractId);
  }

  async function continueContractFlowAfterDownPayment(
    receivedCharge: Charge,
  ) {
    if (
      !pendingDownPaymentFlow ||
      String(pendingDownPaymentFlow.downPaymentChargeId) !== String(receivedCharge.id)
    ) {
      return;
    }

    const contractId = pendingDownPaymentFlow.contractId;
    setPendingDownPaymentFlow(null);

    if (pendingDownPaymentFlow.carnetCharges.length > 0) {
      const linkedContract = getContractById(contractId);

      if (linkedContract) {
        setPendingContractCarnetRequest({
          contract: linkedContract,
          charges: pendingDownPaymentFlow.carnetCharges,
        });
        return;
      }

      void generatePaymentCarnet(pendingDownPaymentFlow.carnetCharges);
    }

    await handleAfterContractCarnetGenerated(contractId);
  }

  function redirectToContractsPage() {
    window.location.href = "/contratos";
  }

  function closeContractPrintQuestion() {
    setPendingContractPrintRequest(null);
    redirectToContractsPage();
  }

  function closeContractScheduleNotice() {
    setPendingContractScheduleNotice(null);
    redirectToContractsPage();
  }

  function closeContractCarnetQuestion() {
    setPendingContractCarnetRequest(null);
  }

  function confirmContractCarnetQuestion() {
    if (!pendingContractCarnetRequest) return;

    void generatePaymentCarnet(pendingContractCarnetRequest.charges);
    setPendingContractPrintRequest(pendingContractCarnetRequest.contract);
    setPendingContractCarnetRequest(null);
  }

  async function confirmContractPrintQuestion() {
    if (!pendingContractPrintRequest) return;

    const contractToPrint = pendingContractPrintRequest;
    const wasContractPrintOpened = openContractPrintWindow(contractToPrint);

    if (!wasContractPrintOpened) return;

    const wasScheduleRegistered = await registerContractDueDateOnSchedule(contractToPrint);

    setPendingContractPrintRequest(null);
    setPendingContractScheduleNotice({
      title: wasScheduleRegistered ? "Agenda criada" : "Agenda não criada",
      description: wasScheduleRegistered
        ? "O vencimento do contrato foi registrado na agenda após a impressão."
        : "O contrato foi aberto para impressão, mas não foi possível registrar o vencimento na agenda automaticamente.",
      itemValue: contractToPrint.propertyName || "Contrato vinculado",
    });
  }

  function getContractPrintCompanySettings() {
    const defaultCompanySettings = {
      companyName: "Contrx",
      tradeName: "Contrx",
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
    const startDate = normalizeContractDateInput(startDateValue);
    const endDate = normalizeContractDateInput(endDateValue);

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

  function getConfiguredAssetContractTemplateContentForReceivable() {
    try {
      const parsedTemplates = getCachedPrintTemplates();

      if (!parsedTemplates) return null;
      const assetContractTemplate = (parsedTemplates as { assetContract?: unknown }).assetContract;
      let templateContent = "";

      if (
        assetContractTemplate &&
        typeof assetContractTemplate === "object" &&
        !Array.isArray(assetContractTemplate) &&
        typeof (assetContractTemplate as { content?: unknown }).content === "string"
      ) {
        templateContent = (assetContractTemplate as { content: string }).content;
      }

      const cleanTemplateContent = templateContent.trim();

      if (!cleanTemplateContent) return null;

      if (normalizeContractTemplateContent(cleanTemplateContent) === normalizeContractTemplateContent(DEFAULT_ASSET_CONTRACT_TEMPLATE)) {
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
    body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    const startDate = normalizeContractDateInput(startDateValue);
    const endDate = normalizeContractDateInput(endDateValue);

    if (!startDate || !endDate) return 1;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.max(Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1, 1);
  }

  function getContractRentDueDayForPrint(startDateValue: string) {
    const startDate = normalizeContractDateInput(startDateValue);

    if (!startDate) return "____";

    const [, , day] = startDate.split("-");

    return day || "____";
  }

  function normalizeContractDateInput(value?: string) {
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

  function formatContractDateForTemplate(value?: string) {
    const normalizedDate = normalizeContractDateInput(value);

    if (!normalizedDate) return "-";

    const [year, month, day] = normalizedDate.split("-");

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
    const propertyName = contract.propertyName || property?.name || "BEM/ATIVO NÃO INFORMADO";
    const assetCategory = property ? getAssetCategoryLabel(property.assetCategory) : "Bem/Ativo";
    const propertyAddress = formatContractPrintAddress(property || {});
    const isRealEstateContract = !property || property.assetCategory === "PROPERTY";
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
      assetCategory,
      propertyAddress: propertyAddress || "endereço não informado",
      startDate: formatContractDateForTemplate(contract.startDate),
      endDate: formatContractDateForTemplate(contract.endDate),
      entryTime: contract.isTemporaryRental ? contract.checkInTime || "____:____" : "",
      exitTime: contract.isTemporaryRental ? contract.checkOutTime || "____:____" : "",
      checkInTime: contract.isTemporaryRental ? contract.checkInTime || "____:____" : "",
      checkOutTime: contract.isTemporaryRental ? contract.checkOutTime || "____:____" : "",
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

    const templateContent = !isRealEstateContract
      ? getConfiguredAssetContractTemplateContentForReceivable() || DEFAULT_ASSET_CONTRACT_TEMPLATE
      : contract.isTemporaryRental
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

    void generatePaymentCarnet(carnetCharges);
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

  function printSelectedCarnets() {
    const carnetCharges = selectedCharges.filter(
      (charge) => !charge.isDownPayment,
    );

    if (carnetCharges.length === 0) {
      window.alert("Selecione ao menos uma cobrança para imprimir o carnê.");
      return;
    }

    void generatePaymentCarnet(carnetCharges);
  }

  function printSelectedReceipts() {
    const receiptItems = selectedCharges
      .map((charge) => {
        const paymentRecord = getChargePayment(charge.id);

        return paymentRecord ? { charge, paymentRecord } : null;
      })
      .filter((item): item is ReceiptPrintItem => Boolean(item));

    if (receiptItems.length === 0) {
      window.alert("Selecione contas já recebidas para imprimir recibos.");
      return;
    }

    if (receiptItems.length === 1) {
      generatePaymentReceipt(receiptItems[0].charge, receiptItems[0].paymentRecord);
      return;
    }

    generatePaymentReceiptBatch(receiptItems);
  }

  function receiveSelectedCharges() {
    const chargesToReceive = selectedPendingCharges;

    if (chargesToReceive.length === 0) {
      window.alert("Selecione contas pendentes ou vencidas para receber.");
      return;
    }

    openReceivePaymentModal(chargesToReceive[0], chargesToReceive);
  }

  function generatePaymentReceiptBatch(receiptItems: ReceiptPrintItem[]) {
    if (receiptItems.length === 0) return;

    const receiptWindow = window.open(
      "",
      "_blank",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
    );

    if (!receiptWindow) {
      setPaymentFormError(
        "Não foi possível abrir os recibos. Verifique se o navegador bloqueou pop-ups.",
      );
      return;
    }

    receiptWindow.document.open();

    const companySettings = getCompanySettingsForCarnet();
    const companyName =
      companySettings.tradeName || companySettings.companyName || "Contrx";
    const companyDocument = companySettings.document || "Não informado";
    const companyPhone = companySettings.phone || "Não informado";
    const companyEmail = companySettings.email || "Não informado";
    const receipts = receiptItems
      .map(({ charge, paymentRecord }) => {
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
        const receiptObservation = paymentRecord.note?.trim() || "";

        return `
          <section class="receipt">
            <header class="top">
              <div>
                <h1 class="title">Recibo</h1>
                <div class="subtitle">Comprovante de recebimento</div>
              </div>
              <div class="number">
                Nº <strong>${escapeHtml(receiptNumber || "CONTRX")}</strong><br />
                Emitido em: <strong>${escapeHtml(receiptDateTime)}</strong>
              </div>
            </header>

            <div class="reference">
              <div><span>Recebimento</span><strong>${formatDate(paymentRecord.paidAt)}</strong></div>
              <div><span>Referência</span><strong>${escapeHtml(chargeLabel)}</strong></div>
              <div><span>Vencimento</span><strong>${formatDate(charge.dueDate)}</strong></div>
            </div>

            <div class="amount-grid">
              <div class="amount-card highlight"><span>Valor original</span><strong>${formatCurrency(charge.amount)}</strong></div>
              <div class="amount-card"><span>Juros</span><strong>${formatCurrency(paymentRecord.interest)}</strong></div>
              <div class="amount-card discount"><span>Desconto</span><strong>${formatCurrency(paymentRecord.discount)}</strong></div>
            </div>

            <div class="total-box">
              <div><span>Total recebido</span><strong>${formatCurrency(paymentRecord.amountPaid)}</strong></div>
              <div class="confirmed">Pagamento confirmado</div>
            </div>

            <div class="payment-box">
              <div class="payment-row"><span>Forma(s) de pagamento</span><strong>${escapeHtml(paymentMethods)}</strong></div>
              <div class="payment-row"><span>Pagador</span><strong>${escapeHtml(charge.tenant)}</strong></div>
              <div class="payment-row"><span>Referência</span><strong>${escapeHtml(charge.property)}</strong></div>
              ${receiptObservation ? `<div class="payment-row"><span>Observação</span><strong>${escapeHtml(receiptObservation)}</strong></div>` : ""}
            </div>

            <p class="declaration">
              Declaramos o recebimento do valor acima descrito, referente à cobrança indicada neste comprovante.
              Este recibo é válido após a confirmação do pagamento.
            </p>

            <div class="signature-area">
              <div class="signature">${escapeHtml(companyName)}<small>Recebedor</small></div>
              <div class="signature">Assinatura / Conferência<small>Pagador</small></div>
            </div>

            <div class="footer">
              ${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)} · Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}
            </div>
          </section>
        `;
      })
      .join("");

    receiptWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Recibos de Recebimento</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; background: rgba(255,255,255,.97); border-bottom: 1px solid #d1d5db; }
            .toolbar button { border: 0; border-radius: 8px; padding: 10px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
            .print-button { background: #f97316; color: #ffffff; }
            .close-button { background: #f3f4f6; color: #111827; border: 1px solid #d1d5db !important; }
            .page { width: 184mm; margin: 16px auto; }
            .receipt { position: relative; background: #ffffff; border: 1px solid #cbd5e1; border-top: 5px solid #f97316; padding: 10mm; box-shadow: 0 18px 34px rgba(15,23,42,.14); break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
            .receipt::before { display: none; }
            .top { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; border-bottom: 1px solid #d9e0ea; padding-bottom: 8mm; }
            .title { margin: 0; font-size: 28px; line-height: 1; font-weight: 900; letter-spacing: 0; text-transform: uppercase; }
            .subtitle { margin-top: 5px; color: #c2410c; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; }
            .number { min-width: 165px; border: 1px solid #d9e0ea; background: #f8fafc; padding: 12px 14px; text-align: right; font-size: 10px; line-height: 1.55; }
            .number strong { font-size: 12px; }
            .reference { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8mm 0 0; }
            .reference div { border: 1px solid #d9e0ea; background: #f8fafc; padding: 10px 11px; }
            .reference span, .amount-card span { display: block; color: #6b7280; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .reference strong { display: block; margin-top: 5px; font-size: 12px; line-height: 1.25; }
            .amount-grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 8px; margin-top: 8px; overflow: visible; border: 0; }
            .amount-card { min-height: 58px; padding: 11px 12px; border: 1px solid #d9e0ea; }
            .amount-card:last-child { border-right: 1px solid #d9e0ea; }
            .amount-card strong { display: block; margin-top: 5px; font-size: 16px; line-height: 1.15; }
            .amount-card.highlight { background: #fff7ed; border-color: #fed7aa; }
            .amount-card.highlight strong { font-size: 22px; }
            .amount-card.discount strong { color: #b91c1c; }
            .total-box { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; margin-top: 8px; border: 1px solid #0f172a; background: #0f172a; color: #ffffff; padding: 13px 15px; }
            .total-box span { display: block; color: #fed7aa; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .total-box strong { display: block; margin-top: 3px; font-size: 25px; line-height: 1; font-weight: 900; }
            .confirmed { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; padding: 8px 11px; font-size: 10px; font-weight: 900; white-space: nowrap; text-transform: uppercase; letter-spacing: .04em; }
            .payment-box { margin-top: 8px; border: 1px solid #d9e0ea; }
            .payment-row { display: grid; grid-template-columns: 170px 1fr; border-bottom: 1px solid #e5eaf1; }
            .payment-row:last-child { border-bottom: 0; }
            .payment-row span, .payment-row strong { padding: 6px 8px; font-size: 10.5px; }
            .payment-row span { background: #f8fafc; font-weight: 900; border-right: 1px solid #e5eaf1; text-transform: uppercase; letter-spacing: .04em; }
            .payment-row strong { text-align: right; font-weight: 800; }
            .declaration { margin: 7mm 0 0; color: #334155; font-size: 10px; line-height: 1.55; font-weight: 700; }
            .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 22mm; margin-top: 13mm; }
            .signature { border-top: 1px solid #111827; padding-top: 5px; text-align: center; font-size: 10px; font-weight: 800; }
            .signature small { display: block; margin-top: 3px; color: #4b5563; font-weight: 700; }
            .footer { margin-top: 7mm; border-top: 1px solid #d9e0ea; padding-top: 4mm; color: #64748b; font-size: 8.5px; line-height: 1.35; text-align: center; }
            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none !important; }
              .page { width: 100%; margin: 0; }
              .receipt { width: 100%; border: 1px solid #cbd5e1; border-top: 5px solid #f97316; box-shadow: none; padding: 9mm; margin-bottom: 0; }
              .receipt + .receipt { margin-top: 8mm; page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" id="print-receipt-button">Imprimir recibos</button>
            <button class="close-button" type="button" onclick="window.close()">Fechar</button>
          </div>
          <main class="page">${receipts}</main>
          <script>
            document.getElementById("print-receipt-button").addEventListener("click", function () {
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
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

    receiptWindow.document.open();

    const companySettings = getCompanySettingsForCarnet();
    const companyName =
      companySettings.tradeName || companySettings.companyName || "Contrx";
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
            body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; background: rgba(255,255,255,.97); border-bottom: 1px solid #d1d5db; }
            .toolbar button { border: 0; border-radius: 8px; padding: 10px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
            .print-button { background: #f97316; color: #ffffff; }
            .close-button { background: #f3f4f6; color: #111827; border: 1px solid #d1d5db !important; }
            .page { width: 184mm; margin: 16px auto; }
            .receipt { position: relative; background: #ffffff; border: 1px solid #cbd5e1; border-top: 5px solid #f97316; padding: 10mm; box-shadow: 0 18px 34px rgba(15,23,42,.14); break-inside: avoid; page-break-inside: avoid; }
            .receipt::before { display: none; }
            .top { display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: start; border-bottom: 1px solid #d9e0ea; padding-bottom: 8mm; }
            .title { margin: 0; font-size: 28px; line-height: 1; font-weight: 900; letter-spacing: 0; text-transform: uppercase; }
            .subtitle { margin-top: 5px; color: #c2410c; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; }
            .number { min-width: 165px; border: 1px solid #d9e0ea; background: #f8fafc; padding: 12px 14px; text-align: right; font-size: 10px; line-height: 1.55; }
            .number strong { font-size: 12px; }
            .reference { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8mm 0 0; }
            .reference div { border: 1px solid #d9e0ea; background: #f8fafc; padding: 10px 11px; }
            .reference span { display: block; color: #6b7280; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .reference strong { display: block; margin-top: 5px; font-size: 12px; line-height: 1.25; }
            .amount-grid { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 8px; margin-top: 8px; overflow: visible; border: 0; }
            .amount-card { min-height: 58px; padding: 11px 12px; border: 1px solid #d9e0ea; }
            .amount-card:last-child { border-right: 1px solid #d9e0ea; }
            .amount-card span { display: block; color: #4b5563; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .amount-card strong { display: block; margin-top: 5px; font-size: 16px; line-height: 1.15; }
            .amount-card.highlight { background: #fff7ed; border-color: #fed7aa; }
            .amount-card.highlight strong { font-size: 22px; }
            .amount-card.discount strong { color: #b91c1c; }
            .total-box { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; margin-top: 8px; border: 1px solid #0f172a; background: #0f172a; color: #ffffff; padding: 13px 15px; }
            .total-box span { display: block; color: #fed7aa; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
            .total-box strong { display: block; margin-top: 3px; font-size: 25px; line-height: 1; font-weight: 900; }
            .confirmed { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; padding: 8px 11px; font-size: 10px; font-weight: 900; white-space: nowrap; text-transform: uppercase; letter-spacing: .04em; }
            .payment-box { margin-top: 8px; border: 1px solid #d9e0ea; }
            .payment-row { display: grid; grid-template-columns: 170px 1fr; border-bottom: 1px solid #e5eaf1; }
            .payment-row:last-child { border-bottom: 0; }
            .payment-row span, .payment-row strong { padding: 6px 8px; font-size: 10.5px; }
            .payment-row span { background: #f8fafc; font-weight: 900; border-right: 1px solid #e5eaf1; text-transform: uppercase; letter-spacing: .04em; }
            .payment-row strong { text-align: right; font-weight: 800; }
            .declaration { margin: 7mm 0 0; color: #334155; font-size: 10px; line-height: 1.55; font-weight: 700; }
            .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 22mm; margin-top: 13mm; }
            .signature { border-top: 1px solid #111827; padding-top: 5px; text-align: center; font-size: 10px; font-weight: 800; }
            .signature small { display: block; margin-top: 3px; color: #4b5563; font-weight: 700; }
            .footer { margin-top: 7mm; border-top: 1px solid #d9e0ea; padding-top: 4mm; color: #64748b; font-size: 8.5px; line-height: 1.35; text-align: center; }
            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              body { background: #ffffff; }
              .toolbar { display: none !important; }
              .page { width: 100%; margin: 0; }
              .receipt { width: 100%; border: 1px solid #cbd5e1; border-top: 5px solid #f97316; box-shadow: none; padding: 9mm; }
              .receipt + .receipt { margin-top: 8mm; page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <button class="print-button" type="button" id="print-receipt-button">Imprimir recibo</button>
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
                  Nº <strong>${escapeHtml(receiptNumber || "CONTRX")}</strong><br />
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
                <div class="payment-row"><span>Pagador</span><strong>${escapeHtml(charge.tenant)}</strong></div>
                <div class="payment-row"><span>Referência</span><strong>${escapeHtml(charge.property)}</strong></div>
                ${hasObservation ? `<div class="payment-row"><span>Observação</span><strong>${escapeHtml(receiptObservation)}</strong></div>` : ""}
              </div>

              <p class="declaration">
                Declaramos o recebimento do valor acima descrito, referente à cobrança indicada neste comprovante.
                Este recibo é válido após a confirmação do pagamento.
              </p>

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
            document.getElementById("print-receipt-button").addEventListener("click", function () {
              window.print();
            });
          </script>
        </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  async function saveManualCharge() {
    if (isChargeSaving) return;

    setIsChargeSaving(true);

    try {
      await saveManualChargeTransaction();
    } finally {
      setIsChargeSaving(false);
    }
  }

  async function saveManualChargeTransaction() {
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
          await replaceReceivedAccountPayment(editingChargeId, {
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
              : "Não foi possível atualizar o recebimento no backend.",
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

    const chargeProperty = property?.name || "Sem bem/ativo vinculado";
    const issueDate = new Date(`${formIssueDate}T00:00:00`).toISOString();

    if (formLaunchType === "single") {
      const savedCharge: Charge = {
        id: editingChargeId || createLocalId("manual"),
        contractId: formContractId || null,
        tenantId: tenant.id,
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
              : "Não foi possível salvar a cobrança no backend.",
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

      const carnetCharges = [
        {
          ...savedCharge,
          installmentNumber: 1,
          installmentTotal: 1,
          installmentGroupId: savedCharge.id,
        },
      ];

      closeCreateModal();
      continueContractFlowAfterReceivableChargesSaved(
        savedCharge.contractId,
        carnetCharges,
      );
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

    const installmentGroupId = createLocalId("installment");

    const newCharges: Charge[] = installmentPreview.map((installment) => ({
      id: `${installmentGroupId}-${installment.installmentNumber}`,
      contractId: formContractId || null,
      tenantId: tenant.id,
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
            : "Não foi possível salvar as parcelas no backend.",
        );
        return;
      }
    }

    const updatedManualCharges = [...manualCharges, ...newCharges];

    setManualCharges(updatedManualCharges);

    const downPaymentCharge = newCharges.find((charge) => charge.isDownPayment);

    const carnetCharges = newCharges.filter((charge) => !charge.isDownPayment);

    closeCreateModal();

    if (downPaymentCharge) {
      setPendingDownPaymentFlow({
        downPaymentChargeId: String(downPaymentCharge.id),
        contractId: formContractId || null,
        carnetCharges,
      });
      window.setTimeout(() => {
        openReceivePaymentModal(downPaymentCharge);
      }, 0);
      return;
    }

    if (carnetCharges.length > 0) {
      continueContractFlowAfterReceivableChargesSaved(
        formContractId,
        carnetCharges,
      );
      return;
    }

    handleAfterContractCarnetGenerated(formContractId);
  }

  const paymentModalCharges =
    paymentBatchCharges.length > 0
      ? paymentBatchCharges
      : chargePendingPaymentReceipt
        ? [chargePendingPaymentReceipt]
        : [];
  const isBatchPayment = paymentModalCharges.length > 1;
  const paymentModalOriginalAmount = paymentModalCharges.reduce(
    (total, charge) => total + charge.amount,
    0,
  );
  const paymentModalRemainingAmount = paymentModalCharges.reduce(
    (total, charge) => total + getChargeRemainingAmount(charge),
    0,
  );
  const paymentModalReferenceCharge = chargePendingPaymentReceipt
    ? {
        ...chargePendingPaymentReceipt,
        amount: paymentModalRemainingAmount,
        remainingAmount: paymentModalRemainingAmount,
      }
    : null;
  const paymentModalFinalAmount = normalizeAmount(paymentFinalAmount);
  const paymentModalBalanceAfterPayment = Math.max(
    paymentModalRemainingAmount - paymentModalFinalAmount,
    0,
  );
  const ownerPayoutNotice =
    !isBatchPayment && chargePendingPaymentReceipt
      ? getOwnerPayoutNotice(chargePendingPaymentReceipt)
      : null;
  const accountsReceivableThemeClass =
    themeMode === "graphite"
      ? "contrx-accounts-receivable-page-graphite"
      : isBlackTheme
        ? "contrx-accounts-receivable-page-black"
        : "contrx-accounts-receivable-page-light";

  return (
    <>
      <style jsx global>{`
        .contrx-accounts-receivable-page-light {
          color: #0f172a;
        }

        .contrx-accounts-receivable-page-light .bg-white,
        .contrx-accounts-receivable-page-light [class*="dark:bg-slate"],
        .contrx-accounts-receivable-page-light [class*="dark:from-slate"],
        .contrx-accounts-receivable-page-light [class*="dark:to-slate"] {
          background-color: #ffffff !important;
          background-image: none !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-50,
        .contrx-accounts-receivable-page-light .bg-slate-100 {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-light .bg-orange-50,
        .contrx-accounts-receivable-page-light .bg-orange-100 {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-receivable-page-light .bg-red-50,
        .contrx-accounts-receivable-page-light .bg-red-100 {
          background-color: #fef2f2 !important;
        }

        .contrx-accounts-receivable-page-light .bg-emerald-50,
        .contrx-accounts-receivable-page-light .bg-emerald-100 {
          background-color: #ecfdf5 !important;
        }

        .contrx-accounts-receivable-page-light .bg-amber-50,
        .contrx-accounts-receivable-page-light .bg-amber-100 {
          background-color: #fffbeb !important;
        }

        .contrx-accounts-receivable-page-light .text-slate-950,
        .contrx-accounts-receivable-page-light .text-slate-900,
        .contrx-accounts-receivable-page-light .text-slate-800,
        .contrx-accounts-receivable-page-light .text-slate-700,
        .contrx-accounts-receivable-page-light [class*="dark:text-slate-100"],
        .contrx-accounts-receivable-page-light [class*="dark:text-white"] {
          color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-light .text-slate-600,
        .contrx-accounts-receivable-page-light .text-slate-500,
        .contrx-accounts-receivable-page-light .text-slate-400,
        .contrx-accounts-receivable-page-light [class*="dark:text-slate-300"],
        .contrx-accounts-receivable-page-light [class*="dark:text-slate-400"],
        .contrx-accounts-receivable-page-light [class*="dark:text-slate-500"] {
          color: #475569 !important;
        }

        .contrx-accounts-receivable-page-light .text-orange-600,
        .contrx-accounts-receivable-page-light .text-orange-700 {
          color: #ea580c !important;
        }

        .contrx-accounts-receivable-page-light .text-red-600,
        .contrx-accounts-receivable-page-light .text-red-700 {
          color: #dc2626 !important;
        }

        .contrx-accounts-receivable-page-light .text-emerald-600,
        .contrx-accounts-receivable-page-light .text-emerald-700 {
          color: #047857 !important;
        }

        .contrx-accounts-receivable-page-light .border-slate-100,
        .contrx-accounts-receivable-page-light .border-slate-200,
        .contrx-accounts-receivable-page-light .border-slate-300,
        .contrx-accounts-receivable-page-light [class*="dark:border-slate"] {
          border-color: #e2e8f0 !important;
        }

        .contrx-accounts-receivable-page-light .border-orange-100,
        .contrx-accounts-receivable-page-light .border-orange-200,
        .contrx-accounts-receivable-page-light [class*="dark:border-orange"] {
          border-color: #fed7aa !important;
        }

        .contrx-accounts-receivable-page-light input,
        .contrx-accounts-receivable-page-light select,
        .contrx-accounts-receivable-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .contrx-accounts-receivable-page-light input::placeholder,
        .contrx-accounts-receivable-page-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .contrx-accounts-receivable-page-light table,
        .contrx-accounts-receivable-page-light tbody,
        .contrx-accounts-receivable-page-light tbody tr {
          background-color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light thead {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-receivable-page-light tbody tr:hover {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-light .shadow-sm,
        .contrx-accounts-receivable-page-light .shadow-md,
        .contrx-accounts-receivable-page-light .shadow-2xl {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10) !important;
        }

        .dark .contrx-accounts-receivable-page-black {
          color: #f8fafc;
        }

        .dark .contrx-accounts-receivable-page-black .bg-white {
          background-color: #0f172a !important;
        }

        .dark .contrx-accounts-receivable-page-black .bg-slate-50,
        .dark .contrx-accounts-receivable-page-black .bg-slate-100 {
          background-color: #111827 !important;
        }

        .dark .contrx-accounts-receivable-page-black .bg-orange-50,
        .dark .contrx-accounts-receivable-page-black .bg-orange-100 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .dark .contrx-accounts-receivable-page-black .bg-red-50,
        .dark .contrx-accounts-receivable-page-black .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.12) !important;
        }

        .dark .contrx-accounts-receivable-page-black .bg-emerald-50,
        .dark .contrx-accounts-receivable-page-black .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }

        .dark .contrx-accounts-receivable-page-black .bg-amber-50,
        .dark .contrx-accounts-receivable-page-black .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.14) !important;
        }

        .dark .contrx-accounts-receivable-page-black .text-slate-950,
        .dark .contrx-accounts-receivable-page-black .text-slate-900,
        .dark .contrx-accounts-receivable-page-black .text-slate-800,
        .dark .contrx-accounts-receivable-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .dark .contrx-accounts-receivable-page-black .text-slate-600,
        .dark .contrx-accounts-receivable-page-black .text-slate-500,
        .dark .contrx-accounts-receivable-page-black .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .dark .contrx-accounts-receivable-page-black .border-orange-100,
        .dark .contrx-accounts-receivable-page-black .border-orange-200,
        .dark .contrx-accounts-receivable-page-black .border-red-100,
        .dark .contrx-accounts-receivable-page-black .border-red-200,
        .dark .contrx-accounts-receivable-page-black .border-emerald-200,
        .dark .contrx-accounts-receivable-page-black .border-slate-100,
        .dark .contrx-accounts-receivable-page-black .border-slate-200,
        .dark .contrx-accounts-receivable-page-black .border-slate-300 {
          border-color: #334155 !important;
        }

        .dark .contrx-accounts-receivable-page-black input,
        .dark .contrx-accounts-receivable-page-black select,
        .dark .contrx-accounts-receivable-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }

        .dark .contrx-accounts-receivable-page-black input::placeholder,
        .dark .contrx-accounts-receivable-page-black textarea::placeholder {
          color: #64748b !important;
        }

        .dark .contrx-accounts-receivable-page-black table,
        .dark .contrx-accounts-receivable-page-black tbody,
        .dark .contrx-accounts-receivable-page-black tbody tr {
          background-color: #0f172a !important;
        }

        .dark .contrx-accounts-receivable-page-black thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .dark .contrx-accounts-receivable-page-black tbody tr:hover {
          background-color: #1e293b !important;
        }


        /* Contrx explicit theme override - Accounts Receivable
           Keeps this screen independent from a stale global .dark class. */
        .contrx-accounts-receivable-page-light,
        .contrx-accounts-receivable-page-light * {
          color-scheme: light !important;
        }

        .contrx-accounts-receivable-page-light .bg-white,
        .contrx-accounts-receivable-page-light .dark\:bg-white {
          background-color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-50,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-50 {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-100,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-100 {
          background-color: #f1f5f9 !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-800,
        .contrx-accounts-receivable-page-light .bg-slate-900,
        .contrx-accounts-receivable-page-light .bg-slate-950,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-700,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-800,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-900,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-950 {
          background-color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light .bg-gradient-to-r {
          background-image: linear-gradient(to right, #ecfdf5, #ffffff) !important;
        }

        .contrx-accounts-receivable-page-light .bg-orange-50,
        .contrx-accounts-receivable-page-light .dark\:bg-orange-950\/30,
        .contrx-accounts-receivable-page-light .dark\:bg-orange-900\/40 {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-receivable-page-light .bg-emerald-50,
        .contrx-accounts-receivable-page-light .dark\:bg-emerald-950\/30 {
          background-color: #ecfdf5 !important;
        }

        .contrx-accounts-receivable-page-light .bg-red-50,
        .contrx-accounts-receivable-page-light .dark\:bg-red-950\/30 {
          background-color: #fef2f2 !important;
        }

        .contrx-accounts-receivable-page-light .bg-amber-50,
        .contrx-accounts-receivable-page-light .dark\:bg-amber-950\/30 {
          background-color: #fffbeb !important;
        }

        .contrx-accounts-receivable-page-light .text-white,
        .contrx-accounts-receivable-page-light .text-slate-100,
        .contrx-accounts-receivable-page-light .dark\:text-white,
        .contrx-accounts-receivable-page-light .dark\:text-slate-100 {
          color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-light .text-slate-950,
        .contrx-accounts-receivable-page-light .text-slate-900,
        .contrx-accounts-receivable-page-light .text-slate-800,
        .contrx-accounts-receivable-page-light .text-slate-700,
        .contrx-accounts-receivable-page-light .dark\:text-slate-100,
        .contrx-accounts-receivable-page-light .dark\:text-slate-200 {
          color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-light .text-slate-600,
        .contrx-accounts-receivable-page-light .text-slate-500,
        .contrx-accounts-receivable-page-light .text-slate-400,
        .contrx-accounts-receivable-page-light .dark\:text-slate-300,
        .contrx-accounts-receivable-page-light .dark\:text-slate-400,
        .contrx-accounts-receivable-page-light .dark\:text-slate-500 {
          color: #64748b !important;
        }

        .contrx-accounts-receivable-page-light .text-orange-600,
        .contrx-accounts-receivable-page-light .text-orange-700,
        .contrx-accounts-receivable-page-light .dark\:text-orange-300,
        .contrx-accounts-receivable-page-light .dark\:text-orange-400 {
          color: #ea580c !important;
        }

        .contrx-accounts-receivable-page-light .text-emerald-700,
        .contrx-accounts-receivable-page-light .dark\:text-emerald-300 {
          color: #047857 !important;
        }

        .contrx-accounts-receivable-page-light .text-red-600,
        .contrx-accounts-receivable-page-light .text-red-700,
        .contrx-accounts-receivable-page-light .dark\:text-red-300 {
          color: #dc2626 !important;
        }

        .contrx-accounts-receivable-page-light .border-slate-100,
        .contrx-accounts-receivable-page-light .border-slate-200,
        .contrx-accounts-receivable-page-light .border-slate-300,
        .contrx-accounts-receivable-page-light .border-slate-700,
        .contrx-accounts-receivable-page-light .dark\:border-slate-700 {
          border-color: #e2e8f0 !important;
        }

        .contrx-accounts-receivable-page-light .ring-slate-100,
        .contrx-accounts-receivable-page-light .ring-slate-200,
        .contrx-accounts-receivable-page-light .ring-slate-700,
        .contrx-accounts-receivable-page-light .dark\:ring-slate-700 {
          --tw-ring-color: #e2e8f0 !important;
        }

        .contrx-accounts-receivable-page-light input,
        .contrx-accounts-receivable-page-light select,
        .contrx-accounts-receivable-page-light textarea {
          background-color: #ffffff !important;
          border-color: #cbd5e1 !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .contrx-accounts-receivable-page-light input::placeholder,
        .contrx-accounts-receivable-page-light textarea::placeholder {
          color: #94a3b8 !important;
        }

        .contrx-accounts-receivable-page-light table,
        .contrx-accounts-receivable-page-light tbody,
        .contrx-accounts-receivable-page-light tbody tr,
        .contrx-accounts-receivable-page-light .dark\:bg-slate-800 {
          background-color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light thead,
        .contrx-accounts-receivable-page-light .bg-orange-50 {
          background-color: #fff7ed !important;
        }

        .contrx-accounts-receivable-page-light tbody tr:hover,
        .contrx-accounts-receivable-page-light .hover\:bg-slate-50:hover,
        .contrx-accounts-receivable-page-light .dark\:hover\:bg-slate-800:hover,
        .contrx-accounts-receivable-page-light .dark\:hover\:bg-slate-700:hover {
          background-color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-light .divide-slate-100 > :not([hidden]) ~ :not([hidden]),
        .contrx-accounts-receivable-page-light .dark\:divide-slate-700 > :not([hidden]) ~ :not([hidden]) {
          border-color: #e2e8f0 !important;
        }

        .contrx-accounts-receivable-page-light .shadow-sm,
        .contrx-accounts-receivable-page-light .shadow-md,
        .contrx-accounts-receivable-page-light .shadow-lg,
        .contrx-accounts-receivable-page-light .shadow-xl,
        .contrx-accounts-receivable-page-light .shadow-2xl {
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.10) !important;
        }

        .contrx-accounts-receivable-page-light .bg-emerald-600,
        .contrx-accounts-receivable-page-light .bg-orange-500,
        .contrx-accounts-receivable-page-light .bg-red-500 {
          color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-black,
        .contrx-accounts-receivable-page-black * {
          color-scheme: dark !important;
        }

        .contrx-accounts-receivable-page-black .bg-white,
        .contrx-accounts-receivable-page-black .bg-slate-50,
        .contrx-accounts-receivable-page-black .bg-slate-100 {
          background-color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-black .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0f172a, #111827) !important;
        }

        .contrx-accounts-receivable-page-black .text-slate-950,
        .contrx-accounts-receivable-page-black .text-slate-900,
        .contrx-accounts-receivable-page-black .text-slate-800,
        .contrx-accounts-receivable-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-black .text-slate-600,
        .contrx-accounts-receivable-page-black .text-slate-500,
        .contrx-accounts-receivable-page-black .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .contrx-accounts-receivable-page-black input,
        .contrx-accounts-receivable-page-black select,
        .contrx-accounts-receivable-page-black textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }


        .contrx-accounts-receivable-page-light .bg-slate-900,
        .contrx-accounts-receivable-page-light .bg-emerald-600,
        .contrx-accounts-receivable-page-light .bg-orange-500,
        .contrx-accounts-receivable-page-light .bg-red-600,
        .contrx-accounts-receivable-page-light .bg-red-500,
        .contrx-accounts-receivable-page-light .bg-amber-600 {
          color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-900.text-white,
        .contrx-accounts-receivable-page-light button.bg-slate-900,
        .contrx-accounts-receivable-page-light button.bg-emerald-600,
        .contrx-accounts-receivable-page-light button.bg-orange-500,
        .contrx-accounts-receivable-page-light button.bg-red-600 {
          color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light .bg-slate-900:not(button):not(.text-white) {
          background-color: #ffffff !important;
        }

        .contrx-accounts-receivable-page-light .bg-gradient-to-r.from-slate-50,
        .contrx-accounts-receivable-page-light .bg-gradient-to-r.from-emerald-50,
        .contrx-accounts-receivable-page-light .bg-gradient-to-r.from-orange-50 {
          background-image: linear-gradient(to right, #f8fafc, #ffffff) !important;
        }

        .contrx-accounts-receivable-page-black .bg-slate-900,
        .contrx-accounts-receivable-page-black .dark\:bg-slate-900,
        .contrx-accounts-receivable-page-black .dark\:bg-slate-800 {
          background-color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-black .bg-slate-50,
        .contrx-accounts-receivable-page-black .bg-slate-100,
        .contrx-accounts-receivable-page-black .bg-white {
          background-color: #0f172a !important;
        }

        .contrx-accounts-receivable-page-black .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0f172a, #111827) !important;
        }

        .contrx-accounts-receivable-page-graphite,
        .contrx-accounts-receivable-page-graphite * {
          color-scheme: dark;
        }

        .contrx-accounts-receivable-page-graphite .bg-slate-900,
        .contrx-accounts-receivable-page-graphite .dark\:bg-slate-900,
        .contrx-accounts-receivable-page-graphite .dark\:bg-slate-800,
        .contrx-accounts-receivable-page-graphite .bg-slate-50,
        .contrx-accounts-receivable-page-graphite .bg-slate-100,
        .contrx-accounts-receivable-page-graphite .bg-white {
          background-color: #0d1b2e !important;
        }

        .contrx-accounts-receivable-page-graphite .bg-gradient-to-r {
          background-image: linear-gradient(to right, #0d1b2e, #162a44) !important;
        }

        .contrx-accounts-receivable-page-graphite .text-slate-950,
        .contrx-accounts-receivable-page-graphite .text-slate-900,
        .contrx-accounts-receivable-page-graphite .text-slate-800,
        .contrx-accounts-receivable-page-graphite .text-slate-700 {
          color: #f8fafc !important;
        }

        .contrx-accounts-receivable-page-graphite .text-slate-600,
        .contrx-accounts-receivable-page-graphite .text-slate-500,
        .contrx-accounts-receivable-page-graphite .text-slate-400 {
          color: #b6c6dc !important;
        }

        .contrx-accounts-receivable-page-graphite input,
        .contrx-accounts-receivable-page-graphite select,
        .contrx-accounts-receivable-page-graphite textarea {
          background-color: #07111f !important;
          border-color: #24405f !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }

      `}</style>

      <div
        data-contrx-theme={themeMode}
        className={`${accountsReceivableThemeClass} space-y-5`}
      >
        <div>
          <p className="text-sm font-semibold text-orange-600">Financeiro</p>

          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl">
            Contas a Receber
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            Acompanhe cobranças geradas automaticamente pelos contratos ativos.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
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

        {(selectedTenant || statusFilter !== DEFAULT_RECEIVABLE_STATUS_FILTER) && (
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

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
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
                  className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                >
                  Nova cobrança
                </button>

                <button
                  onClick={openReportModal}
                  className="rounded-xl bg-[#0f172a] px-5 py-2.5 text-sm font-bold text-[#ffffff] shadow-sm transition hover:bg-[#1e293b]"
                >
                  Relatório PDF
                </button>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  Buscar Por Pessoa
                </button>
              </div>
            </div>
          </div>

          {selectedCharges.length > 0 && (
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {selectedCharges.length} conta(s) selecionada(s)
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Pendentes para receber: {selectedPendingCharges.length} · Com recibo: {selectedPaidCharges.length}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={receiveSelectedCharges}
                    disabled={selectedPendingCharges.length === 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    Receber selecionadas
                  </button>
                  <button
                    type="button"
                    onClick={printSelectedCarnets}
                    className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
                  >
                    Imprimir carnês
                  </button>
                  <button
                    type="button"
                    onClick={printSelectedReceipts}
                    disabled={selectedPaidCharges.length === 0}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                  >
                    Imprimir recibos
                  </button>
                  <button
                    type="button"
                    onClick={clearChargeSelection}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-orange-50 dark:bg-orange-950/30">
                <tr>
                  <th className="w-12 px-5 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleChargesSelected}
                      onChange={toggleAllVisibleChargeSelection}
                      aria-label="Selecionar todas as contas visíveis"
                      className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    />
                  </th>

                  <th className="px-5 py-4 text-left text-sm font-black text-slate-900 dark:text-slate-100">
                    Bem/Ativo
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
                      colSpan={7}
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
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedChargeIds.includes(String(charge.id))}
                          onChange={() => toggleChargeSelection(String(charge.id))}
                          aria-label={`Selecionar conta de ${charge.tenant}`}
                          className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        />
                      </td>

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
                        <span className="block">
                          {formatCurrency(
                            charge.status === "Paid"
                              ? getChargePaidAmount(charge)
                              : getChargeRemainingAmount(charge),
                          )}
                        </span>
                        {hasPartialPayment(charge) && (
                          <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Recebido {formatCurrency(getChargePaidAmount(charge))}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getChargeStatusClassName(
                            charge,
                          )}`}
                        >
                          {getChargeStatusLabel(charge)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="relative inline-flex justify-center">
                          <button
                            type="button"
                            onClick={(event) => handleToggleChargeActions(charge, event)}
                            data-receivable-action-trigger
                            aria-expanded={openActionMenuChargeId === charge.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            Ações
                            <span className="text-xs">▼</span>
                          </button>

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

      {openActionMenuCharge && actionMenuPosition && (
        <div
          data-receivable-action-menu
          className="fixed z-[90] max-h-[calc(100vh-32px)] w-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 text-left shadow-2xl ring-1 ring-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700"
          style={{ top: actionMenuPosition.top, left: actionMenuPosition.left }}
        >
          <button
            type="button"
            onClick={() => {
              handleCloseChargeActions();
              openEditCharge(openActionMenuCharge);
            }}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Editar
          </button>

          {openActionMenuCharge.status !== "Paid" && (
            <button
              type="button"
              onClick={() => {
                handleCloseChargeActions();
                openReceivePaymentModal(openActionMenuCharge);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-orange-700 transition hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/30"
            >
              Receber
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handleCloseChargeActions();
              sendChargeWhatsAppMessage(openActionMenuCharge);
            }}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Enviar WhatsApp
          </button>

          <button
            type="button"
            onClick={() => {
              handleCloseChargeActions();
              reprintPaymentCarnet(openActionMenuCharge);
            }}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Reimprimir carne
          </button>

          {getChargePayment(openActionMenuCharge.id) && (
            <button
              type="button"
              onClick={() => {
                handleCloseChargeActions();
                reprintPaymentReceipt(openActionMenuCharge);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reimprimir recibo
            </button>
          )}

          {getChargePayment(openActionMenuCharge.id) && (
            <button
              type="button"
              onClick={() => {
                handleCloseChargeActions();
                openPaymentReversalConfirmation(openActionMenuCharge);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Estornar recebimentos
            </button>
          )}

          {openActionMenuCharge.status === "Paid" && (
            <button
              type="button"
              onClick={() => {
                handleCloseChargeActions();
                openEditCharge(openActionMenuCharge);
              }}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-amber-700 transition hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
            >
              Ajustar pagamento
            </button>
          )}
        </div>
      )}

      {isReportOpen && (
        <div className={`fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm ${accountsReceivableThemeClass}`}>
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
                    : "border-[#dbe4ef] bg-[#ffffff]"
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${accountsReceivableThemeClass}`}>
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
                    setCompanyStorageItem(
                      companyId,
                      "contrx_auto_open_search",
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
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm ${accountsReceivableThemeClass}`}>
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <div className="border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-xl shadow-lg shadow-orange-500/20 dark:shadow-orange-950/30">
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
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-4 ring-orange-100 dark:ring-orange-900/50"
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
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-4 ring-orange-100 dark:ring-orange-900/50"
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
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <select
                      value={formTenant}
                      disabled={isEditingPaidCharge}
                      onChange={(event) => {
                        setChargeFormError("");
                        setFormTenant(event.target.value);
                      }}
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
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
                  Bem/Ativo
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
                  className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                    isEditingPaidCharge
                      ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                      : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <option value="">Sem bem/ativo vinculado</option>
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
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500 dark:text-slate-400">
                      R$
                    </span>

                    <input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formAmount}
                      disabled={isEditingPaidCharge}
                      onChange={(event) => {
                        setChargeFormError("");
                        setFormAmount(formatCurrencyInput(event.target.value));
                      }}
                      onBlur={() => {
                        const amount = normalizeAmount(formAmount);

                        setFormAmount(amount > 0 ? formatAmountInput(amount) : "");
                      }}
                      className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 pl-11 text-sm font-black outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Data de lançamento
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={formIssueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormIssueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
                      isEditingPaidCharge
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                    Primeiro vencimento
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="date"
                    value={formDueDate}
                    disabled={isEditingPaidCharge}
                    onChange={(event) => {
                      setChargeFormError("");
                      setFormDueDate(event.target.value);
                    }}
                    className={`h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50 ${
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
                <div className="space-y-4 rounded-2xl border border-orange-100 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 p-4">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
                    <div className="space-y-3">
                      <div>
                        <label className={`mb-2 block text-sm font-bold ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#475569]"}`}>
                          Quantidade de parcelas
                          <span className="ml-1 text-red-500">*</span>
                        </label>

                        <input
                          type="number"
                          min={2}
                          max={MAX_INSTALLMENT_QUANTITY}
                          value={formInstallmentQuantity}
                          onChange={(event) => {
                            setChargeFormError("");
                            const nextQuantity = Number(event.target.value);

                            if (!event.target.value || !Number.isFinite(nextQuantity)) {
                              setFormInstallmentQuantity(event.target.value);
                              return;
                            }

                            setFormInstallmentQuantity(
                              String(
                                Math.min(
                                  MAX_INSTALLMENT_QUANTITY,
                                  Math.max(2, Math.trunc(nextQuantity)),
                                ),
                              ),
                            );
                          }}
                          className="h-12 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
                        />
                        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Limite de {MAX_INSTALLMENT_QUANTITY} parcelas.
                        </p>
                      </div>

                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        formFirstInstallmentAsDownPayment
                          ? "border-orange-300 bg-white text-orange-800 ring-2 ring-orange-100 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60"
                          : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                      }`}>
                        <input
                          type="checkbox"
                          checked={formFirstInstallmentAsDownPayment}
                          onChange={(event) => {
                            setChargeFormError("");
                            setFormFirstInstallmentAsDownPayment(event.target.checked);
                          }}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />

                        <span>
                          <strong className="block text-sm font-black">
                            Primeira parcela como entrada
                          </strong>
                          <small className="mt-1 block text-xs font-semibold leading-5">
                            Usa a data de lançamento e abre o recebimento da entrada após salvar.
                          </small>
                        </span>
                      </label>
                    </div>

                    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 ring-1 ring-orange-100 dark:ring-orange-900/50">
                      O sistema divide o valor total em parcelas iguais e gera
                      os vencimentos automaticamente de 30 em 30 dias. Quando a
                      primeira parcela for marcada como entrada, ela usa a data
                      de lançamento e as próximas parcelas seguem a sequência a
                      partir do primeiro vencimento.
                    </div>
                  </div>

                  {installmentPreview.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="hidden grid-cols-[90px_1fr_1fr] bg-slate-50 dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 dark:text-slate-500 md:grid">
                        <span>Parcela</span>
                        <span>Valor</span>
                        <span>Vencimento</span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {installmentPreview.map((installment) => (
                          <div
                            key={installment.id}
                            className="grid gap-3 px-4 py-3 md:grid-cols-[90px_1fr_1fr]"
                          >
                            <div className="flex items-center text-sm font-black text-slate-900 dark:text-slate-100">
                              {installment.isDownPayment ? (
                                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700 ring-1 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-800">
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
                              aria-label={`Valor da parcela ${installment.installmentNumber}`}
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
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
                              aria-label={`Vencimento da parcela ${installment.installmentNumber}`}
                              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 dark:ring-orange-900/50"
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
                        disabled={isChargeSaving}
                        onClick={() => openPaymentReversalConfirmation()}
                        className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Voltar para pagamento
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 md:ml-auto md:flex-row md:justify-end">
                  {!isEditingPaidCharge && (
                    <button
                      type="button"
                      disabled={isChargeSaving}
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
                    type="button"
                    disabled={isChargeSaving}
                    onClick={saveManualCharge}
                    className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isChargeSaving
                      ? "Salvando..."
                      : editingChargeId
                        ? "Salvar ajustes"
                        : "Salvar cobrança"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {chargePendingPaymentReceipt && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 ${accountsReceivableThemeClass}`}>
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <div className="border-b border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white shadow-sm">
                    R$
                  </div>

                  <div className="min-w-0">
                    <h2 className={`text-xl font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      {isBatchPayment ? "Receber cobranças selecionadas" : "Receber cobrança"}
                    </h2>

                    <p className={`mt-1 text-sm ${isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}`}>
                      Informe valor, forma de pagamento e confira o saldo antes de concluir.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeReceivePaymentModal}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition ${
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

            <div className={`flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4 sm:p-5 ${isBlackTheme ? "bg-[#0f172a]" : "bg-[#f8fafc]"}`}>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    {isBatchPayment ? "Cobranças selecionadas" : "Cobrança selecionada"}
                  </p>

                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${getReceiptStatusClassName(
                      paymentModalReferenceCharge || chargePendingPaymentReceipt,
                    )}`}
                  >
                    {isBatchPayment
                      ? `${paymentModalCharges.length} contas`
                      : getReceiptStatusLabel(chargePendingPaymentReceipt)}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 text-sm text-slate-700 dark:text-slate-300 md:grid-cols-2">
                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Inquilino:
                    </span>{" "}
                    {isBatchPayment ? "Vários selecionados" : chargePendingPaymentReceipt.tenant}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">Bem/Ativo:</span>{" "}
                    {isBatchPayment ? "Vários bens/ativos" : chargePendingPaymentReceipt.property}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Vencimento:
                    </span>{" "}
                    {isBatchPayment ? "Conforme contas selecionadas" : formatDate(chargePendingPaymentReceipt.dueDate)}
                  </p>

                  <p>
                    <span className="font-black text-slate-950 dark:text-white">
                      Saldo em aberto:
                    </span>{" "}
                    {formatCurrency(paymentModalRemainingAmount)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Original
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {formatCurrency(paymentModalOriginalAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Em aberto
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {formatCurrency(paymentModalRemainingAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-900/50 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                    Recebendo
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(paymentModalFinalAmount)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Restará
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {formatCurrency(paymentModalBalanceAfterPayment)}
                  </p>
                </div>
              </div>

              {ownerPayoutNotice && (
                <div
                  className={`rounded-2xl border p-4 shadow-sm ${
                    isBlackTheme
                      ? "border-amber-800 bg-amber-950/30 text-amber-100"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Gestao de repasse ativa
                  </p>
                  <p className="mt-2 text-sm font-bold">
                    Ao confirmar este recebimento, sera gerado um contas a pagar
                    de repasse para {ownerPayoutNotice.ownerName}.
                  </p>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-4">
                    <p>
                      <span className="font-black">Recebido:</span>{" "}
                      {formatCurrency(paymentModalFinalAmount)}
                    </p>
                    <p>
                      <span className="font-black">Taxa:</span>{" "}
                      {formatCurrency(ownerPayoutNotice.feeAmount)} (
                      {formatPercent(ownerPayoutNotice.feePercent)})
                    </p>
                    <p>
                      <span className="font-black">Repasse:</span>{" "}
                      {formatCurrency(ownerPayoutNotice.payoutAmount)}
                    </p>
                    <p>
                      <span className="font-black">Vencimento:</span>{" "}
                      {ownerPayoutNotice.payoutDay
                        ? `dia ${ownerPayoutNotice.payoutDay}`
                        : "data do recebimento"}
                    </p>
                  </div>
                </div>
              )}

              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  isBlackTheme
                    ? "border-[#334155] bg-[#020617]"
                    : "border-[#dbe4ef] bg-[#ffffff]"
                }`}
              >
                <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[0.18em] ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                      Valores do recebimento
                    </p>
                    <h3 className={`mt-1 text-base font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                      Juros, desconto e valor pago
                    </h3>
                  </div>

                  <div className={`rounded-2xl px-4 py-2 text-sm font-black ring-1 ${
                    isBlackTheme
                      ? "bg-[#0f172a] text-[#f8fafc] ring-[#334155]"
                      : "bg-[#f8fafc] text-[#0f172a] ring-[#dbe4ef]"
                  }`}>
                    Em aberto: {formatCurrency(paymentModalRemainingAmount)}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                            paymentModalReferenceCharge || chargePendingPaymentReceipt,
                            event.target.value,
                          )
                        }
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => changePaymentInterestMode(paymentModalReferenceCharge || chargePendingPaymentReceipt, "amount")}
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
                        onClick={() => changePaymentInterestMode(paymentModalReferenceCharge || chargePendingPaymentReceipt, "percentage")}
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
                            paymentModalReferenceCharge || chargePendingPaymentReceipt,
                            event.target.value,
                          )
                        }
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-4 text-sm font-black text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => changePaymentDiscountMode(paymentModalReferenceCharge || chargePendingPaymentReceipt, "amount")}
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
                        onClick={() => changePaymentDiscountMode(paymentModalReferenceCharge || chargePendingPaymentReceipt, "percentage")}
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

                  <div>
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label className={`block text-sm font-black ${isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}`}>
                        Valor final
                      </label>
                      <span className={`text-xs font-bold ${isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"}`}>
                        Pode ser parcial ou total
                      </span>
                    </div>
                    <input
                      placeholder="Ex: 250,00"
                      value={paymentFinalAmount}
                      onChange={(event) => {
                        const value = event.target.value;

                        setPaymentFormError("");
                        const formattedValue = formatCurrencyInput(value);

                        setPaymentFinalAmount(formattedValue);
                        updatePaymentEntriesFromFinalAmount(formattedValue);

                        if (paymentModalReferenceCharge) {
                          updatePaymentAdjustmentsFromFinalAmount(
                            paymentModalReferenceCharge,
                            formattedValue,
                          );
                        }
                      }}
                      onBlur={() => {
                        const amount = normalizeAmount(paymentFinalAmount);
                        const formattedAmount = amount > 0 ? formatAmountInput(amount) : "";

                        setPaymentFinalAmount(formattedAmount);
                        updatePaymentEntriesFromFinalAmount(formattedAmount);
                      }}
                      className="h-11 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-100 dark:placeholder:text-slate-500 dark:ring-emerald-900/50"
                    />
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
                      className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1fr_180px_auto] md:items-end"
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
                          onBlur={() => normalizePaymentEntryAmount(entry.id)}
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
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                    Total informado: {formatCurrency(getPaymentEntriesTotal())}
                  </div>

                  <div className={`rounded-xl border px-4 py-3 text-sm font-black ${getPaymentEntriesBalanceClassName()}`}>
                    {getPaymentEntriesBalanceLabel()}
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
              className={`flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between ${
                isBlackTheme
                  ? "border-[#334155] bg-[#0f172a]"
                  : "border-[#e2e8f0] bg-[#ffffff]"
              }`}
            >
              <div className="text-sm">
                <span className={isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}>
                  Receber agora:
                </span>{" "}
                <strong className={isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]"}>
                  {formatCurrency(paymentModalFinalAmount)}
                </strong>
                {paymentModalBalanceAfterPayment > 0.01 && (
                  <span className={isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"}>
                    {" "}· restará {formatCurrency(paymentModalBalanceAfterPayment)}
                  </span>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeReceivePaymentModal}
                disabled={Boolean(processingConfirmation)}
                className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-6 py-3 text-sm font-black text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmReceivePayment}
                disabled={Boolean(processingConfirmation)}
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 dark:shadow-emerald-950/30"
              >
                Confirmar recebimento
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPaymentConfirmationOpen && chargePendingPaymentReceipt && (
        <ConfirmationModal
          icon="OK"
          title="Confirmar recebimento?"
          description="Confira os dados antes de concluir. Se o valor for menor que o saldo, a cobrança ficará parcialmente recebida."
          itemLabel={isBatchPayment ? "Contas selecionadas" : "Cobrança selecionada"}
          itemValue={
            isBatchPayment
              ? `${paymentModalCharges.length} contas`
              : chargePendingPaymentReceipt.tenant
          }
          details={
            <>
              <p>
                Bem/Ativo:{" "}
                {isBatchPayment
                  ? "Vários bens/ativos"
                  : chargePendingPaymentReceipt.property}
              </p>
              <p>
                Vencimento:{" "}
                {isBatchPayment
                  ? "Conforme contas selecionadas"
                  : formatDate(chargePendingPaymentReceipt.dueDate)}
              </p>
              <p>Valor original: {formatCurrency(paymentModalOriginalAmount)}</p>
              <p>Saldo em aberto: {formatCurrency(paymentModalRemainingAmount)}</p>
              <p>Juros: {formatCurrency(normalizeAmount(paymentInterest))}</p>
              <p>Desconto: {formatCurrency(normalizeAmount(paymentDiscount))}</p>
              <p>Valor final: {formatCurrency(normalizeAmount(paymentFinalAmount))}</p>
              <div>
                <p className="font-black text-slate-950 dark:text-white">
                  Formas de pagamento:
                </p>
                <div className="mt-2 space-y-1">
                  {paymentEntries.map((entry) => (
                    <p key={entry.id}>
                      {getPaymentMethodLabel(entry.method)} - {formatCurrency(normalizeAmount(entry.amount))}
                    </p>
                  ))}
                </div>
              </div>
              {paymentNote.trim() && <p>Observação: {paymentNote.trim()}</p>}
            </>
          }
          confirmLabel="Confirmar recebimento"
          cancelLabel="Conferir novamente"
          tone="emerald"
          onCancel={closePaymentConfirmation}
          onConfirm={finishReceivePayment}
          isProcessing={processingConfirmation === "payment"}
          processingLabel="Registrando recebimento..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
        />
      )}

      {chargePendingDeletion && (
        <ConfirmationModal
          icon="!"
          title="Excluir cobrança?"
          description="Esta ação removerá a cobrança selecionada do contas a receber."
          itemLabel="Cobrança"
          itemValue={chargePendingDeletion.tenant}
          details={
            <>
              <p>Bem/Ativo: {chargePendingDeletion.property}</p>
              <p>Vencimento: {formatDate(chargePendingDeletion.dueDate)}</p>
              <p>Valor: {formatCurrency(chargePendingDeletion.amount)}</p>
            </>
          }
          confirmLabel="Excluir cobrança"
          danger
          onCancel={closeDeleteChargeConfirmation}
          onConfirm={confirmDeleteCharge}
          isProcessing={processingConfirmation === "delete"}
          processingLabel="Excluindo..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
          zIndex="z-[70]"
        />
      )}

      {chargePendingPaymentReversal && (
        <ConfirmationModal
          icon="↩"
          title="Voltar cobrança para pagamento?"
          description="O registro de pagamento será removido e a cobrança voltará para pendente ou vencida, conforme a data de vencimento."
          itemLabel="Cobrança selecionada"
          itemValue={chargePendingPaymentReversal.tenant}
          details={
            <>
              <p>Bem/Ativo: {chargePendingPaymentReversal.property}</p>
              <p>Vencimento: {formatDate(chargePendingPaymentReversal.dueDate)}</p>
              <p>Valor: {formatCurrency(chargePendingPaymentReversal.amount)}</p>
            </>
          }
          confirmLabel="Voltar para pagamento"
          tone="amber"
          onCancel={closePaymentReversalConfirmation}
          onConfirm={confirmPaymentReversal}
          isProcessing={processingConfirmation === "reversal"}
          processingLabel="Estornando..."
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
          zIndex="z-[70]"
        />
      )}

      {pendingContractCarnetRequest && (
        <ConfirmationModal
          icon="DOC"
          title="Imprimir carnê agora?"
          description="As parcelas deste contrato já existem no contas a receber. Imprima o carnê antes de seguir para o contrato."
          itemLabel="Contrato vinculado"
          itemValue={pendingContractCarnetRequest.contract.propertyName || "Não informado"}
          details={
            <>
              <p>Inquilino: {pendingContractCarnetRequest.contract.tenantName || "Não informado"}</p>
              <p>Parcelas: {pendingContractCarnetRequest.charges.length}</p>
              <p>
                Total:{" "}
                {formatCurrency(
                  pendingContractCarnetRequest.charges.reduce(
                    (total, charge) => total + charge.amount,
                    0,
                  ),
                )}
              </p>
            </>
          }
          confirmLabel="Imprimir carnê"
          cancelLabel="Ver contas"
          tone="orange"
          onCancel={closeContractCarnetQuestion}
          onConfirm={confirmContractCarnetQuestion}
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
          zIndex="z-[90]"
        />
      )}

      {pendingContractPrintRequest && (
        <ConfirmationModal
          icon="DOC"
          title="Imprimir contrato agora?"
          description="O carnê foi gerado. Agora abra o contrato vinculado para impressão; depois disso o vencimento será registrado na agenda."
          itemLabel="Contrato vinculado"
          itemValue={
            pendingContractPrintRequest.propertyName ||
            properties.find((property) => String(property.id) === String(pendingContractPrintRequest.propertyId))?.name ||
            "Não informado"
          }
          details={
            <>
              <p>
                Inquilino:{" "}
                {pendingContractPrintRequest.tenantName ||
                  tenants.find((tenant) => String(tenant.id) === String(pendingContractPrintRequest.tenantId))?.name ||
                  "Não informado"}
              </p>
              <p>
                Tipo:{" "}
                {pendingContractPrintRequest.isTemporaryRental
                  ? "Contrato temporário"
                  : "Contrato padrão"}
              </p>
              <p>Início: {formatContractDateForTemplate(pendingContractPrintRequest.startDate)}</p>
              <p>Fim: {formatContractDateForTemplate(pendingContractPrintRequest.endDate)}</p>
            </>
          }
          confirmLabel="Imprimir contrato"
          cancelLabel="Imprimir depois"
          tone="orange"
          onCancel={closeContractPrintQuestion}
          onConfirm={confirmContractPrintQuestion}
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
          zIndex="z-[90]"
        />
      )}

      {pendingContractScheduleNotice && (
        <ConfirmationModal
          icon="OK"
          title={pendingContractScheduleNotice.title}
          description={pendingContractScheduleNotice.description}
          itemLabel="Contrato vinculado"
          itemValue={pendingContractScheduleNotice.itemValue}
          confirmLabel="Voltar para contratos"
          cancelLabel="Fechar"
          tone="emerald"
          onCancel={closeContractScheduleNotice}
          onConfirm={closeContractScheduleNotice}
          isBlackTheme={isBlackTheme}
          themeClass={accountsReceivableThemeClass}
          zIndex="z-[95]"
        />
      )}

      <PersonCreateModal
        open={isTenantCreateOpen}
        companyId={companyId}
        people={tenants.map((tenant) => ({
          id: tenant.id,
          document: tenant.document || tenant.cpf || "",
        }))}
        onClose={closeTenantCreateModal}
        onCreated={handleTenantCreated}
      />
    </>
  );
}

function mapApiReceivableToCharge(account: ReceivableAccount): Charge {
  const amount = normalizeApiAmount(account.amount);
  const paidAmount = getReceivablePaidAmount(account);
  const settlementAmount = getReceivableSettlementAmount(account);
  const remainingAmount = Math.max(amount - settlementAmount, 0);

  return {
    id: account.id,
    contractId: account.contractId || null,
    tenantId: account.tenantId || null,
    property: account.propertyName,
    tenant: account.tenantName,
    dueDate: account.dueDate,
    amount,
    status: account.status === "PAID" ? "Paid" : "Pending",
    paidAmount,
    remainingAmount,
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
    id: payment.id,
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

function getReceivablePaidAmount(account: ReceivableAccount) {
  return (account.payments || []).reduce(
    (total, payment) => total + normalizeApiAmount(payment.amountPaid),
    0,
  );
}

function getReceivableSettlementAmount(account: ReceivableAccount) {
  return (account.payments || []).reduce(
    (total, payment) =>
      total +
      normalizeApiAmount(payment.amountPaid) +
      normalizeApiAmount(payment.discount) -
      normalizeApiAmount(payment.interest),
    0,
  );
}

function mapApiContractToReceivableContract(contract: ApiContract): Contract {
  return {
    id: contract.id,
    propertyId: contract.propertyId,
    propertyName: contract.propertyName || contract.property?.title || "",
    tenantId: contract.tenantId,
    tenantName: contract.tenantName || contract.tenant?.name || "",
    startDate: normalizeApiDateForReceivableContract(contract.startDate),
    endDate: normalizeApiDateForReceivableContract(contract.endDate),
    rentValue: contract.rentValue,
    status: contract.status,
    isTemporaryRental: contract.isTemporaryRental,
    checkInTime: contract.checkInTime || undefined,
    checkOutTime: contract.checkOutTime || undefined,
  };
}

function normalizeApiDateForReceivableContract(value?: string | null) {
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

function mapApiPropertyToReceivableProperty(property: ApiProperty): Property {
  return {
    id: property.id,
    name: property.title,
    assetCategory: property.assetCategory || "PROPERTY",
    ownerId: property.ownerId || null,
    ownerName: property.owner?.name || null,
    managementMode: property.managementMode || "OWNED",
    administrationFeePercentage: property.administrationFeePercentage
      ? Number(property.administrationFeePercentage)
      : 0,
    ownerPayoutDay: property.ownerPayoutDay || null,
    autoCreateOwnerPayable: property.autoCreateOwnerPayable !== false,
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

function getAssetCategoryLabel(value?: string | null) {
  const labels: Record<string, string> = {
    PROPERTY: "Imóvel",
    EQUIPMENT: "Equipamento",
    MACHINE: "Máquina",
    VEHICLE: "Veículo",
    TOOL: "Ferramenta",
    OTHER: "Outro bem",
  };

  return labels[String(value || "OTHER")] || "Outro bem";
}

function mapApiPersonToReceivableTenant(person: Person): Tenant {
  return {
    id: person.id,
    name: person.name,
    personType: person.type === "COMPANY" ? "Company" : "Individual",
    cpf: person.document,
    document: person.document,
    phone: person.phone || "",
    isTenant: person.isTenant !== false,
    state: person.state || "",
    city: person.city || "",
    street: person.address || "",
  };
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">{title}</p>

      <h2
        className={`mt-1 truncate text-xl font-black ${
          green ? "text-emerald-600" : red ? "text-red-600" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {value}
      </h2>
    </div>
  );
}

function ConfirmationModal({
  icon,
  title,
  description,
  itemLabel,
  itemValue,
  details,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger,
  tone = "orange",
  onCancel,
  onConfirm,
  isProcessing = false,
  processingLabel = "Processando...",
  isBlackTheme,
  themeClass,
  zIndex = "z-[80]",
}: {
  icon: string;
  title: string;
  description: string;
  itemLabel: string;
  itemValue: string;
  details?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  tone?: "orange" | "emerald" | "amber";
  onCancel: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  processingLabel?: string;
  isBlackTheme?: boolean;
  themeClass?: string;
  zIndex?: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 shadow-emerald-500/10"
      : tone === "amber"
        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 shadow-amber-500/10"
        : "bg-orange-50 dark:bg-orange-950/30 text-orange-600 shadow-orange-500/10";
  const confirmClass = danger
    ? "bg-red-600 hover:bg-red-700"
    : tone === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : tone === "amber"
        ? "bg-amber-600 hover:bg-amber-700"
        : "bg-orange-500 hover:bg-orange-600";

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm ${themeClass ?? (isBlackTheme ? "contrx-accounts-receivable-page-black" : "contrx-accounts-receivable-page-light")}`}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="p-6 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg ${danger ? "bg-red-50 text-red-600 shadow-red-500/10 dark:bg-red-950/30" : toneClass}`}>
            {icon}
          </div>

          <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-slate-100">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              {itemLabel}
            </p>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">
              {itemValue}
            </p>
            {details && (
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {details}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${confirmClass}`}
          >
            {isProcessing ? processingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
