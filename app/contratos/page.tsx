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
};

type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

type ContractDisplayStatus = ContractStatus | "Expiring";

type ContractFilterStatus = "All" | ContractStatus | "Expiring";

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
  type: "ContractCreated" | "ContractUpdated" | "ContractCanceled" | "ContractDeleted";
  description: string;
  createdAt: string;
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
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
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusReasonError, setStatusReasonError] = useState("");

  const isEditing = editingContractId !== null;

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
    setFormError("");
    setEditingContractId(null);
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
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

    if (isTemporaryRental && (!checkInTime || !checkOutTime)) {
      setFormError("Informe a hora de entrada e a hora de saída para contrato de locação temporária.");
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

  function handleOpenPrintableContract(contract: Contract) {
    if (!contract.isTemporaryRental) {
      alert("O modelo de impressão disponível no momento é para contrato de locação temporária.");
      return;
    }

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
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              Contratos
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400 dark:text-slate-500">
              Gerencie os contratos de locação e mantenha o financeiro integrado.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-50 dark:bg-orange-500/100 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 dark:shadow-orange-950/30 transition hover:bg-orange-600"
          >
            + Novo contrato
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <SummaryCard icon="📄" title="Contratos ativos" value={activeContracts} detail="Inclui vencendo" />
          <SummaryCard icon="⏳" title="Vencendo" value={expiringContracts} detail={`Até ${EXPIRING_CONTRACT_DAYS_LIMIT} dias`} />
          <SummaryCard icon="💰" title="Receita mensal" value={formatCurrency(monthlyRevenue)} detail="Contratos ativos" />
        </div>

        <div className="rounded-3xl border border-orange-100 dark:border-orange-500/20 bg-white dark:bg-slate-900 dark:bg-slate-950 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-700 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                Contratos cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
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
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as ContractFilterStatus)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
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
              <thead className="bg-orange-50 dark:bg-orange-500/10">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Imóvel</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Inquilino</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Início</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Fim</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Valor</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Tipo</th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700 dark:text-slate-200">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredContracts.map((contract) => {
                  const displayStatus = getDisplayContractStatus(contract);

                  return (
                    <tr
                      key={contract.id}
                      className={`transition hover:bg-slate-50 dark:hover:bg-slate-800/80 dark:bg-slate-800 dark:bg-slate-700 ${
                        displayStatus === "Deleted"
                          ? "bg-slate-50 dark:bg-slate-800 dark:bg-slate-700 opacity-70"
                          : displayStatus === "Expiring"
                            ? "bg-amber-50 dark:bg-amber-500/10/60"
                            : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        {contract.propertyName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {contract.tenantName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {formatDate(contract.startDate)}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-1">
                          <span>{formatDate(contract.endDate)}</span>
                          {displayStatus === "Expiring" && (
                            <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                              Vence em {getDaysUntilDate(contract.endDate)} dia(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrency(contract.rentValue)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            contract.isTemporaryRental
                              ? "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300"
                              : "bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
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
                              <span className="max-w-[220px] text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                                Motivo: {contract.statusReason}
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenPrintableContract(contract)}
                            className="rounded-xl bg-orange-50 dark:bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-600 dark:text-orange-400 transition hover:bg-orange-100 dark:hover:bg-orange-500/20 dark:bg-orange-500/20"
                          >
                            Gerar contrato
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditContract(contract)}
                            className="rounded-xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredContracts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                      Nenhum contrato encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {printableContract && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 dark:border-orange-500/20 bg-white dark:bg-slate-900 dark:bg-slate-950 shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500 dark:text-orange-400">
                    Contrato temporário
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                    Visualização do contrato
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Confira o documento antes de gerar PDF ou imprimir.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleClosePrintableContract}
                    className="rounded-2xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Fechar
                  </button>

                  <button
                    type="button"
                    onClick={handleGeneratePrintableContractPdf}
                    className="rounded-2xl bg-slate-900 dark:bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-md shadow-slate-100 dark:shadow-black/40 transition hover:bg-slate-800 dark:bg-slate-700"
                  >
                    Gerar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPrintableContract}
                    className="rounded-2xl bg-orange-50 dark:bg-orange-500/100 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 dark:shadow-orange-950/30 transition hover:bg-orange-600"
                  >
                    Imprimir
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 p-4">
                <iframe
                  ref={printableContractFrameRef}
                  title="Visualização do contrato temporário"
                  srcDoc={buildTemporaryRentalContractHtml(
                    printableContract,
                    properties.find((property) => String(property.id) === String(printableContract.propertyId)),
                    tenants.find((tenant) => String(tenant.id) === String(printableContract.tenantId)),
                    false
                  )}
                  className="h-[72vh] w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 shadow-sm"
                />
              </div>
            </div>
          </div>
        )}

        {pendingStatusChange && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2rem] border border-red-100 dark:border-red-500/20 bg-white dark:bg-slate-900 dark:bg-slate-950 p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 dark:bg-red-500/10 text-3xl">
                {pendingStatusChange.nextStatus === "Deleted" ? "🗑️" : "🚫"}
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                  {pendingStatusChange.nextStatus === "Deleted"
                    ? "Motivo da exclusão"
                    : "Motivo do cancelamento"}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  Ao confirmar, as parcelas em aberto vinculadas a este contrato serão removidas do Contas a Receber para manter o financeiro consistente.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:bg-slate-700 px-4 py-3">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {pendingStatusChange.contract.propertyName || "Contrato"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                  {pendingStatusChange.contract.tenantName || "Inquilino não informado"}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
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
                  className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                />

                {statusReasonError && (
                  <div className="mt-3 rounded-2xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300">
                    {statusReasonError}
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancelStatusReason}
                  className="rounded-2xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 px-5 py-4 text-sm font-black text-slate-700 dark:text-slate-200 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmStatusReason}
                  className="rounded-2xl bg-red-50 dark:bg-red-500/100 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 dark:shadow-red-950/30 transition hover:bg-red-600"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 dark:border-orange-500/20 bg-white dark:bg-slate-900 dark:bg-slate-950 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                    {isEditing ? "Editar contrato" : "Novo contrato"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    Preencha os dados do contrato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-xl font-black text-slate-600 dark:text-slate-300 transition hover:bg-red-50 dark:hover:bg-red-500/10 dark:bg-red-500/10 hover:text-red-600 dark:text-red-300"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitContract}>
                <div className="p-8">
                  {formError && (
                    <div className="mb-6 rounded-2xl border border-red-100 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm font-black text-red-600 dark:text-red-300">
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Imóvel">
                      <select
                        value={propertyId}
                        onChange={(event) => handlePropertyChange(event.target.value)}
                        required
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
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
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
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
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
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
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
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
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                      />
                    </FormField>

                    <FormField label="Status">
                      <select
                        value={contractStatus}
                        onChange={(event) => setContractStatus(event.target.value as ContractStatus)}
                        required
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                      >
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                        <option value="Canceled">Cancelado</option>
                        <option value="Finished">Finalizado</option>
                        <option value="Deleted">Excluído</option>
                      </select>
                    </FormField>
                  </div>

                  <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 dark:border-orange-500/20 bg-orange-50 dark:bg-orange-500/10/40 px-5 py-4 transition hover:bg-orange-50 dark:hover:bg-orange-500/10 dark:bg-orange-500/10">
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
                      <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                        Este contrato é de locação temporária
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500">
                        Use esta opção para contratos de curto prazo. Esta marcação será utilizada na impressão e no modelo do contrato.
                      </p>
                    </div>
                  </label>

                  {isTemporaryRental && (
                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                      <FormField label="Hora de entrada (check-in)">
                        <input
                          type="time"
                          value={checkInTime}
                          onChange={(event) => {
                            setCheckInTime(event.target.value);
                            setFormError("");
                          }}
                          required={isTemporaryRental}
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                        />
                      </FormField>

                      <FormField label="Hora de saída (check-out)">
                        <input
                          type="time"
                          value={checkOutTime}
                          onChange={(event) => {
                            setCheckOutTime(event.target.value);
                            setFormError("");
                          }}
                          required={isTemporaryRental}
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                        />
                      </FormField>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-950 px-8 py-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 px-6 py-4 text-sm font-black text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-50 dark:bg-orange-500/100 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 dark:shadow-orange-950/30 transition hover:bg-orange-600"
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
      <label className="mb-2 block text-sm font-black text-slate-700 dark:text-slate-200">
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
    <div className="rounded-3xl border border-orange-100 dark:border-orange-500/20 bg-white dark:bg-slate-900 dark:bg-slate-950 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-xl text-orange-600 dark:text-orange-400">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{value}</h3>
      <p className="mt-3 text-sm font-bold text-orange-600 dark:text-orange-400">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractDisplayStatus }) {
  const statusConfig = {
    Active: { label: "Ativo", className: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" },
    Expiring: { label: "Vencendo", className: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    Inactive: { label: "Inativo", className: "bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
    Canceled: { label: "Cancelado", className: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300" },
    Finished: { label: "Finalizado", className: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300" },
    Deleted: { label: "Excluído", className: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200" },
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
  const endDate = new Date(`${value}T23:59:59`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  today.setHours(0, 0, 0, 0);

  return Math.ceil((endDate.getTime() - today.getTime()) / millisecondsPerDay);
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
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });
  const contractDays = getContractDurationInDays(contract.startDate, contract.endDate);
  const checkInTime = contract.checkInTime || "____:____";
  const checkOutTime = contract.checkOutTime || "____:____";
  const currentDate = new Date();
  const locationText = property?.city && property?.state ? `${property.city}/${property.state}` : "______/__";
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const propertyName = contract.propertyName || property?.name || "IMÓVEL NÃO INFORMADO";
  const totalAmount = formatCurrency(contract.rentValue);
  const templateData = {
    companyName: landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    entryTime: checkInTime,
    exitTime: checkOutTime,
    checkInTime,
    checkOutTime,
    contractDays: String(contractDays),
    amount: totalAmount,
    rentValue: totalAmount,
    contractCity: locationText,
    currentDate: formatLongDateForPrint(currentDate),
    pixKey: "",
    contractDefaultNotes: "",
  };
  const configuredTemplateContent = getConfiguredTemporaryContractTemplateContent();

  if (configuredTemplateContent) {
    return buildConfiguredTemporaryContractHtml(configuredTemplateContent, templateData, showToolbar);
  }

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
    .content { font-size: 12.5px; line-height: 1.55; }
    h1 { margin: 0 0 18px; text-align: center; font-size: 16px; line-height: 1.35; text-transform: uppercase; }
    h2 { margin: 16px 0 8px; font-size: 13px; text-transform: uppercase; }
    p { margin: 0 0 8px; }
    .section-title { font-weight: 800; text-transform: uppercase; }
    .clause { margin-top: 12px; }
    .signature-area { margin-top: 54px; page-break-inside: avoid; }
    .signature-label { margin: 30px 0 96px; font-size: 14px; font-weight: 800; text-transform: uppercase; }
    .signature-line { width: 82%; margin: 0 auto 6px; border-top: 1px solid #111827; }
    .signature-name { text-align: center; font-weight: 800; }
    .witness-block { margin-top: 96px; }
    .witness-line { width: 45%; border-top: 1px solid #111827; }
    .witness-info { margin-top: 8px; font-weight: 800; line-height: 1.45; }
    .muted { color: #475569; }
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
      <div class="content">
        <h1>Instrumento Particular de Contrato de Locação Imobiliária Temporária</h1>

        <p><span class="section-title">I - LOCADOR:</span></p>
        <p><strong>${escapeHtml(landlordName)}</strong>, pessoa jurídica de direito privado, inscrita no CPF/CNPJ nº <strong>${escapeHtml(landlordDocument || "não informado")}</strong>${companySettings.stateRegistration ? `, inscrição estadual nº <strong>${escapeHtml(companySettings.stateRegistration)}</strong>` : ""}, com endereço em <strong>${escapeHtml(landlordAddress || "endereço não informado")}</strong>, doravante denominada <strong>LOCADOR</strong>.</p>
        <p>E-mail: ${escapeHtml(companySettings.email || "não informado")}</p>
        <p>Telefone: ${escapeHtml(companySettings.phone || "não informado")}</p>

        <p><span class="section-title">II - LOCATÁRIO:</span></p>
        <p><strong>${escapeHtml(tenantName)}</strong>, brasileiro(a), estado civil não informado, profissão não informada, inscrito(a) no CPF/CNPJ nº <strong>${escapeHtml(tenantDocument || "não informado")}</strong>, Carteira de Identidade nº __________, residente e domiciliado(a) em <strong>${escapeHtml(tenantAddress || "endereço não informado")}</strong>, doravante denominado(a) <strong>LOCATÁRIO</strong>.</p>
        <p>E-mail: ${escapeHtml(tenant?.email || "não informado")}</p>

        <p><span class="section-title">III - OBJETO DA LOCAÇÃO:</span></p>
        <p><strong>${escapeHtml(propertyName)}</strong>${propertyAddress ? `, localizado em ${escapeHtml(propertyAddress)}` : ", endereço não informado"}.</p>

        <p><span class="section-title">IV - PRAZO DE VIGÊNCIA:</span> O prazo de locação é de <strong>${contractDays}</strong> dia(s), com entrada (check-in) em <strong>${escapeHtml(formatDate(contract.startDate))}</strong> às <strong>${escapeHtml(checkInTime)}</strong> e saída (check-out) em <strong>${escapeHtml(formatDate(contract.endDate))}</strong> às <strong>${escapeHtml(checkOutTime)}</strong>, sem prorrogação automática.</p>

        <p><span class="section-title">V - ATIVIDADE OBRIGATÓRIA:</span> Durante o período de locação, o locatário compromete-se a utilizar o imóvel exclusivamente para fins recreativos e de lazer, respeitando todas as normas legais e regulamentações aplicáveis. O locatário deverá zelar pela conservação do imóvel e de suas instalações, garantindo sua limpeza e manutenção adequadas. Qualquer dano causado durante o período de locação será de responsabilidade do locatário, que se compromete a ressarcir integralmente o locador pelos prejuízos decorrentes.</p>

        <p><span class="section-title">VI - ALUGUEL PELO PERÍODO:</span> igual a <strong>${escapeHtml(totalAmount)}</strong>.</p>

        <p><span class="section-title">VII - PAGAMENTO DO ALUGUEL:</span> Pela execução do objeto deste contrato, o LOCATÁRIO pagará ao LOCADOR o valor total de <strong>${escapeHtml(totalAmount)}</strong>, conforme forma de pagamento acordada entre as partes.</p>
        <p>A liberação das chaves está condicionada à quitação integral de todas as parcelas.</p>
        <p>Parágrafo Segundo: O pagamento será efetuado por meio de [PIX/DINHEIRO/TRANSFERÊNCIA], conforme dados a serem informados pelo LOCADOR.</p>

        <p><span class="section-title">VIII - CONDIÇÕES ESPECIAIS:</span></p>
        <p>Não há.</p>

        <p>Pelo presente instrumento, as partes acima identificadas e qualificadas têm entre si justas e acertadas o presente <strong>INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO</strong>, que se regerá pelas cláusulas e condições abaixo pactuadas.</p>

        <div class="clause">
          <h2>Cláusula Primeira - Da Vistoria e Conservação</h2>
          <p>1.1. O imóvel é entregue em perfeitas condições de higiene e conservação.</p>
          <p>1.2. O LOCATÁRIO tem o prazo de 2 (duas) horas após a entrada para conferir o local e reportar qualquer dano preexistente por escrito, com fotos ou vídeos.</p>
          <p>1.3. Caso não haja manifestação no prazo acima, entende-se que o imóvel e seus utensílios foram recebidos em perfeito estado.</p>
          <p>1.4. O LOCATÁRIO deverá restituir o imóvel nas mesmas condições em que o recebeu, sob pena de arcar com os custos de reparo ou reposição de itens danificados.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Segunda - Do Objeto e Destinação</h2>
          <p>2.1. O objeto deste contrato é a locação temporária do imóvel identificado neste instrumento.</p>
          <p>2.2. O imóvel destina-se exclusivamente para fins recreativos e de lazer, conforme detalhado no preâmbulo.</p>
          <p>2.3. É proibido ao LOCATÁRIO sublocar, ceder, emprestar ou transferir a locação a terceiros, total ou parcialmente, sem autorização prévia e por escrito do LOCADOR.</p>
          <p>2.4. Após o recebimento das chaves, o LOCATÁRIO assume a posse temporária e a responsabilidade total pela guarda e conservação do imóvel e seus bens.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Terceira - Da Utilização e Finalidade</h2>
          <p>3.1. O imóvel deve ser utilizado exclusivamente para fins recreativos e de lazer.</p>
          <p>3.2. É proibida a realização de eventos com venda de ingressos, atividades comerciais ou festas abertas ao público sem autorização prévia por escrito do LOCADOR.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Quarta - Do Prazo e da Desocupação</h2>
          <p>4.1. A locação é firmada por curto prazo, com início em ${escapeHtml(formatDate(contract.startDate))} às ${escapeHtml(checkInTime)} e término em ${escapeHtml(formatDate(contract.endDate))} às ${escapeHtml(checkOutTime)}.</p>
          <p>4.2. Findo o prazo estipulado, o contrato se encerra automaticamente, devendo o LOCATÁRIO desocupar o imóvel e entregar as chaves, independente de aviso prévio.</p>
          <p>4.3. Caso o LOCATÁRIO deseje prorrogar a estadia, deverá consultar a disponibilidade e valores com o LOCADOR com antecedência, sendo necessária a formalização de novo ajuste por escrito.</p>
          <p>4.4. O atraso na desocupação do imóvel após o horário de término sujeitará o LOCATÁRIO à multa por hora excedente, sem prejuízo das demais penalidades.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Quinta - Do Valor e Pacote Escolhido</h2>
          <p>5.1. O valor da locação temporária é de ${escapeHtml(totalAmount)}, referente ao período contratado.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Sexta - Das Obrigações e Regras de Convivência</h2>
          <p>6.1. O LOCADOR deverá entregar o imóvel em bom estado de conservação e limpeza.</p>
          <p>6.2. O LOCATÁRIO deverá utilizar o imóvel apenas para os fins contratados, responsabilizando-se por danos ocorridos durante a locação, exceto desgaste natural de uso.</p>
          <p>6.3. O LOCATÁRIO deverá respeitar os limites de hóspedes e convidados definidos previamente pelas partes.</p>
          <p>6.4. Animais de estimação somente serão permitidos mediante autorização do LOCADOR, respondendo o LOCATÁRIO por higiene e eventuais danos.</p>
          <p>6.5. O LOCATÁRIO deve respeitar o sossego dos vizinhos, sendo proibidos ruídos excessivos, especialmente em horário noturno.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Sétima - Das Comunicações e Notificações</h2>
          <p>7.1. As partes concordam que comunicações urgentes poderão ser realizadas por WhatsApp ou e-mail, utilizando os contatos fornecidos neste contrato.</p>
          <p>7.2. Para notificações formais, as partes elegem os endereços declarados neste instrumento.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Oitava - Da Ausência de Garantia e Condição de Acesso</h2>
          <p>8.1. Esta locação é celebrada sem as modalidades de garantia previstas na Lei 8.245/91.</p>
          <p>8.2. O acesso ao imóvel e a entrega das chaves só ocorrerão mediante a quitação integral do valor total da locação e eventuais taxas acordadas.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Nona - Do Inadimplemento, Cancelamento e Multas</h2>
          <p>9.1. O descumprimento de qualquer cláusula deste contrato sujeitará o infrator à multa de 20% sobre o valor total do contrato, sem prejuízo da responsabilidade por eventuais danos materiais comprovados.</p>
          <p>9.2. O atraso no pagamento sujeitará o LOCATÁRIO à multa moratória, juros e eventual cancelamento da reserva.</p>
          <p>9.3. Em caso de desistência por iniciativa do LOCATÁRIO após a assinatura, não haverá devolução de valor já pago, salvo acordo escrito entre as partes.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Décima - Da Rescisão</h2>
          <p>10.1. O descumprimento de cláusula contratual autoriza a rescisão imediata do instrumento, sem prejuízo da cobrança de perdas e danos.</p>
          <p>10.2. Caso o LOCATÁRIO encerre a locação antes do horário previsto, não haverá reembolso proporcional do valor contratado.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Décima Primeira - Da Assinatura Eletrônica e Comunicações Digitais</h2>
          <p>11.1. As partes reconhecem como válida a assinatura deste contrato em formato eletrônico, conforme legislação vigente.</p>
          <p>11.2. Os e-mails e números de WhatsApp informados são considerados canais oficiais de comunicação.</p>
        </div>

        <div class="clause">
          <h2>Cláusula Décima Segunda - Foro</h2>
          <p>12.1. As partes elegem o foro da comarca do local do imóvel para dirimir dúvidas ou litígios oriundos deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.</p>
        </div>

        <p style="margin-top: 28px;">${escapeHtml(locationText)}, ${escapeHtml(formatLongDateForPrint(currentDate))}.</p>

        <div class="signature-area">
          <p class="signature-label">LOCADOR:</p>
          <div class="signature-line"></div>
          <div class="signature-name">${escapeHtml(landlordName)}</div>

          <p class="signature-label">LOCATÁRIO:</p>
          <div class="signature-line"></div>
          <div class="signature-name">${escapeHtml(tenantName)}</div>

          <div class="witness-block">
            <p class="signature-label">TESTEMUNHA</p>
            <div class="witness-line"></div>
            <div class="witness-info">
              Nome: ______________________________<br />
              CPF: ______________________________<br />
              Email: ______________________________
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`;
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
