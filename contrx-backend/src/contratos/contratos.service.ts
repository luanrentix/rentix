import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Contract,
  ContractStatus,
  FinancialAccountStatus,
  Prisma,
} from '@prisma/client';
import { toUpperText, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { AtualizarContratoDto } from './dto/atualizar-contrato.dto';
import {
  MotivoContratoDto,
  RenovarContratoDto,
} from './dto/acoes-contrato.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContractDto: CriarContratoDto, companyId: string) {
    const normalizedContractDto = this.normalizeContractData(createContractDto);
    const data = {
      ...normalizedContractDto,
      companyId,
    };

    await this.validateContractRelations(
      data.companyId,
      data.propertyId,
      data.tenantId,
    );
    this.validateContractInput(data.startDate, data.endDate, data.rentValue);

    await this.ensurePropertyHasNoActiveContract(
      data.companyId,
      data.propertyId,
    );

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: this.buildCreateData(data),
        include: this.defaultInclude,
      });

      await this.syncRelatedRecordsAfterContractChange(tx, contract);

      return contract;
    });
  }

  async findAll(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId é obrigatório.');
    }

    return this.prisma.contract.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: this.defaultInclude,
    });
  }

  async findOne(id: string, companyId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
      include: this.defaultInclude,
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    return contract;
  }

  async update(
    id: string,
    updateContractDto: AtualizarContratoDto,
    companyId: string,
  ) {
    const currentContract = await this.prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!currentContract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    const nextCompanyId = companyId;
    const nextPropertyId =
      updateContractDto.propertyId ?? currentContract.propertyId;
    const nextTenantId = updateContractDto.tenantId ?? currentContract.tenantId;
    const nextStartDate =
      updateContractDto.startDate ?? this.formatDateForInput(currentContract.startDate);
    const nextEndDate =
      updateContractDto.endDate ?? this.formatDateForInput(currentContract.endDate);
    const nextRentValue =
      updateContractDto.rentValue ?? Number(currentContract.rentValue || 0);

    await this.validateCompany(nextCompanyId);
    this.validateContractInput(nextStartDate, nextEndDate, nextRentValue);

    if (
      nextPropertyId !== currentContract.propertyId ||
      nextTenantId !== currentContract.tenantId
    ) {
      await this.validateContractRelations(
        nextCompanyId,
        nextPropertyId,
        nextTenantId,
      );
    }

    if (
      nextPropertyId !== currentContract.propertyId ||
      nextCompanyId !== currentContract.companyId
    ) {
      await this.ensurePropertyHasNoActiveContract(
        nextCompanyId,
        nextPropertyId,
        currentContract.id,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const contract = await tx.contract.update({
        where: { id },
        data: this.buildUpdateData(updateContractDto),
        include: this.defaultInclude,
      });

      await this.syncRelatedRecordsAfterContractChange(tx, contract);

      return contract;
    });
  }

  async cancel(id: string, data: MotivoContratoDto, companyId: string) {
    const reason = this.normalizeRequiredReason(data.reason);
    await this.ensureContractExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await this.deletePendingReceivablesFromContract(tx, id, companyId);

      const contract = await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.CANCELED,
          deletedAt: null,
          statusReason: reason,
          statusReasonType: 'CANCELED',
          statusReasonAt: new Date(),
        },
        include: this.defaultInclude,
      });

      await this.cancelContractDueScheduleItem(tx, contract);

      return contract;
    });
  }

  async softDelete(id: string, data: MotivoContratoDto, companyId: string) {
    const reason = this.normalizeRequiredReason(data.reason);
    await this.ensureContractExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await this.deletePendingReceivablesFromContract(tx, id, companyId);

      const contract = await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.DELETED,
          deletedAt: new Date(),
          statusReason: reason,
          statusReasonType: 'DELETED',
          statusReasonAt: new Date(),
        },
        include: this.defaultInclude,
      });

      await this.cancelContractDueScheduleItem(tx, contract);

      return contract;
    });
  }

  async finish(id: string, data: MotivoContratoDto, companyId: string) {
    const reason = this.normalizeRequiredReason(data.reason);
    await this.ensureContractExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await this.deleteFuturePendingReceivablesFromContract(tx, id, companyId);

      const contract = await tx.contract.update({
        where: { id },
        data: {
          status: ContractStatus.FINISHED,
          finishedAt: new Date(),
          finishReason: reason,
          statusReason: reason,
          statusReasonType: null,
          statusReasonAt: new Date(),
        },
        include: this.defaultInclude,
      });

      await this.completeContractDueScheduleItem(tx, contract);

      return contract;
    });
  }

  async renew(id: string, data: RenovarContratoDto, companyId: string) {
    const currentContract = await this.ensureContractExists(id, companyId);
    const nextEndDate = this.parseDate(data.endDate, 'Data final invalida.');
    const nextRentValue = Number(data.rentValue || 0);

    if (nextEndDate <= currentContract.endDate) {
      throw new BadRequestException(
        'A nova data final precisa ser maior que a data final atual.',
      );
    }

    if (!Number.isFinite(nextRentValue) || nextRentValue <= 0) {
      throw new BadRequestException('Valor de aluguel invalido.');
    }

    const renewedAt = new Date();
    const renewalRecord = {
      renewedAt: renewedAt.toISOString(),
      previousEndDate: this.formatDateForInput(currentContract.endDate),
      newEndDate: this.formatDateForInput(nextEndDate),
      previousRentValue: Number(currentContract.rentValue || 0),
      newRentValue: nextRentValue,
      notes: data.notes ? toUpperText(data.notes) : undefined,
    };
    const renewalHistory = Array.isArray(currentContract.renewalHistory)
      ? currentContract.renewalHistory
      : [];

    return this.prisma.$transaction(async (tx) => {
      const renewedContract = await tx.contract.update({
        where: { id },
        data: {
          endDate: nextEndDate,
          rentValue: new Prisma.Decimal(nextRentValue),
          status: ContractStatus.ACTIVE,
          renewedAt,
          renewalHistory: [...renewalHistory, renewalRecord],
          finishedAt: null,
          finishReason: null,
        },
        include: this.defaultInclude,
      });

      await this.syncOpenReceivablesFromContract(tx, renewedContract);
      await this.upsertContractDueScheduleItem(tx, renewedContract);

      return renewedContract;
    });
  }

  async remove(id: string, companyId: string) {
    return this.softDelete(
      id,
      { reason: 'Contrato excluido pelo endpoint legado.' },
      companyId,
    );
  }

  private get defaultInclude() {
    return {
      property: true,
      tenant: true,
      company: true,
    };
  }

  private async ensureContractExists(id: string, companyId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    return contract;
  }

  private async validateCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new BadRequestException('Empresa nao encontrada.');
    }
  }

  private normalizeRequiredReason(reason?: string | null) {
    const cleanReason = reason ? toUpperText(reason) : '';

    if (cleanReason.length < 5) {
      throw new BadRequestException(
        'Informe um motivo com pelo menos 5 caracteres.',
      );
    }

    return cleanReason;
  }

  private async deletePendingReceivablesFromContract(
    tx: Prisma.TransactionClient,
    contractId: string,
    companyId: string,
  ) {
    const pendingAccounts = await tx.contaReceber.findMany({
      where: {
        contractId,
        companyId,
        status: FinancialAccountStatus.PENDING,
      },
      select: { id: true },
    });
    const pendingAccountIds = pendingAccounts.map((account) => account.id);

    if (pendingAccountIds.length === 0) return;

    await tx.pagamentoRecebido.deleteMany({
      where: { chargeId: { in: pendingAccountIds } },
    });
    await tx.contaReceber.deleteMany({
      where: { id: { in: pendingAccountIds } },
    });
  }

  private async deleteFuturePendingReceivablesFromContract(
    tx: Prisma.TransactionClient,
    contractId: string,
    companyId: string,
  ) {
    const futureAccounts = await tx.contaReceber.findMany({
      where: {
        contractId,
        companyId,
        status: FinancialAccountStatus.PENDING,
        dueDate: { gte: this.getTodayStart() },
      },
      select: { id: true },
    });
    const futureAccountIds = futureAccounts.map((account) => account.id);

    if (futureAccountIds.length === 0) return;

    await tx.pagamentoRecebido.deleteMany({
      where: { chargeId: { in: futureAccountIds } },
    });
    await tx.contaReceber.deleteMany({
      where: { id: { in: futureAccountIds } },
    });
  }

  private async syncOpenReceivablesFromContract(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    const receivableSchedule = this.getContractReceivableSchedule(contract);
    const linkedAccounts = await tx.contaReceber.findMany({
      where: {
        contractId: contract.id,
        companyId: contract.companyId,
      },
      orderBy: { installmentNumber: 'asc' },
    });
    const paidAccounts = linkedAccounts.filter(
      (account) => account.status === FinancialAccountStatus.PAID,
    );
    const openAccounts = linkedAccounts.filter(
      (account) => account.status !== FinancialAccountStatus.PAID,
    );
    const openReceivableSchedule = receivableSchedule.slice(
      paidAccounts.length,
    );
    const installmentGroupId = `${contract.id}-installments`;

    await Promise.all(
      openAccounts
        .slice(0, openReceivableSchedule.length)
        .map((account, index) => {
          const installment = openReceivableSchedule[index];

          return tx.contaReceber.update({
            where: { id: account.id },
            data: {
              tenant: { connect: { id: contract.tenantId } },
              propertyName: contract.propertyName || '',
              tenantName: contract.tenantName || '',
              issueDate: contract.startDate,
              dueDate: installment.dueDate,
              amount: new Prisma.Decimal(installment.amount),
              manual: false,
              installmentNumber: installment.installmentNumber,
              installmentTotal: installment.installmentTotal,
              installmentGroupId,
              isDownPayment: false,
            },
          });
        }),
    );

    const extraOpenAccounts = openAccounts.slice(openReceivableSchedule.length);
    const extraOpenAccountIds = extraOpenAccounts.map((account) => account.id);

    if (extraOpenAccountIds.length > 0) {
      await tx.pagamentoRecebido.deleteMany({
        where: { chargeId: { in: extraOpenAccountIds } },
      });
      await tx.contaReceber.deleteMany({
        where: { id: { in: extraOpenAccountIds } },
      });
    }

    const missingSchedule = openReceivableSchedule.slice(openAccounts.length);

    await Promise.all(
      missingSchedule.map((installment) =>
        tx.contaReceber.create({
          data: {
            company: { connect: { id: contract.companyId } },
            contract: { connect: { id: contract.id } },
            tenant: { connect: { id: contract.tenantId } },
            propertyName: contract.propertyName || '',
            tenantName: contract.tenantName || '',
            issueDate: contract.startDate,
            dueDate: installment.dueDate,
            amount: new Prisma.Decimal(installment.amount),
            status: FinancialAccountStatus.PENDING,
            manual: false,
            installmentNumber: installment.installmentNumber,
            installmentTotal: installment.installmentTotal,
            installmentGroupId,
            isDownPayment: false,
          },
        }),
      ),
    );
  }

  private async syncRelatedRecordsAfterContractChange(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    if (contract.status === ContractStatus.CANCELED) {
      await this.deletePendingReceivablesFromContract(
        tx,
        contract.id,
        contract.companyId,
      );
      await this.cancelContractDueScheduleItem(tx, contract);
      return;
    }

    if (contract.status === ContractStatus.DELETED) {
      await this.deletePendingReceivablesFromContract(
        tx,
        contract.id,
        contract.companyId,
      );
      await this.cancelContractDueScheduleItem(tx, contract);
      return;
    }

    if (contract.status === ContractStatus.FINISHED) {
      await this.deleteFuturePendingReceivablesFromContract(
        tx,
        contract.id,
        contract.companyId,
      );
      await this.completeContractDueScheduleItem(tx, contract);
      return;
    }

    if (contract.status === ContractStatus.ACTIVE) {
      await this.syncOpenReceivablesFromContract(tx, contract);
      await this.upsertContractDueScheduleItem(tx, contract);
    }
  }

  private getContractDueScheduleMarker(contractId: string) {
    return `contract-due:${contractId}`;
  }

  private async findContractDueScheduleItem(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    const scheduleMarker = this.getContractDueScheduleMarker(contract.id);

    return tx.scheduleItem.findFirst({
      where: {
        companyId: contract.companyId,
        OR: [
          { notes: { contains: scheduleMarker } },
          {
            title: 'Vencimento de contrato',
            type: 'Contrato',
            customerName: contract.tenantName || '',
            propertyName: contract.propertyName || '',
          },
        ],
      },
    });
  }

  private async upsertContractDueScheduleItem(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    const existingScheduleItem = await this.findContractDueScheduleItem(
      tx,
      contract,
    );
    const scheduleMarker = this.getContractDueScheduleMarker(contract.id);
    const notes = [
      `Contrato: ${contract.id}`,
      `Vencimento em ${this.formatDateForDisplay(contract.endDate)}`,
      scheduleMarker,
    ].join('\n');
    const data = {
      title: 'Vencimento de contrato',
      customerName: contract.tenantName || 'Inquilino nao informado',
      propertyName: contract.propertyName || 'Imovel nao informado',
      date: contract.endDate,
      time: existingScheduleItem?.time || '08:00',
      type: 'Contrato',
      status: 'scheduled',
      priority: 'high',
      responsibleName:
        existingScheduleItem?.responsibleName || 'Administrativo',
      reminder: existingScheduleItem?.reminder || '1 dia antes',
      notes,
    };

    if (existingScheduleItem) {
      await tx.scheduleItem.update({
        where: { id: existingScheduleItem.id },
        data,
      });
      return;
    }

    await tx.scheduleItem.create({
      data: {
        companyId: contract.companyId,
        ...data,
      },
    });
  }

  private async cancelContractDueScheduleItem(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    const existingScheduleItem = await this.findContractDueScheduleItem(
      tx,
      contract,
    );

    if (!existingScheduleItem || existingScheduleItem.status === 'canceled') {
      return;
    }

    await tx.scheduleItem.update({
      where: { id: existingScheduleItem.id },
      data: {
        status: 'canceled',
        notes: this.appendScheduleNote(
          existingScheduleItem.notes,
          `Contrato ${contract.status === ContractStatus.DELETED ? 'excluido' : 'cancelado'} em ${this.formatDateForDisplay(new Date())}.`,
        ),
      },
    });
  }

  private async completeContractDueScheduleItem(
    tx: Prisma.TransactionClient,
    contract: Contract,
  ) {
    const existingScheduleItem = await this.findContractDueScheduleItem(
      tx,
      contract,
    );

    if (!existingScheduleItem || existingScheduleItem.status === 'completed') {
      return;
    }

    await tx.scheduleItem.update({
      where: { id: existingScheduleItem.id },
      data: {
        status: 'completed',
        notes: this.appendScheduleNote(
          existingScheduleItem.notes,
          `Contrato finalizado em ${this.formatDateForDisplay(new Date())}.`,
        ),
      },
    });
  }

  private appendScheduleNote(currentNotes: string | null, nextNote: string) {
    const cleanCurrentNotes = currentNotes?.trim() || '';

    if (cleanCurrentNotes.includes(nextNote)) {
      return cleanCurrentNotes;
    }

    return [cleanCurrentNotes, nextNote].filter(Boolean).join('\n');
  }

  private getContractReceivableSchedule(contract: Contract) {
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

    const installmentQuantity = this.getContractInstallmentQuantity(
      contract.startDate,
      contract.endDate,
    );
    const firstDueDate = this.addMonthsToDate(contract.startDate, 1);

    return Array.from({ length: installmentQuantity }, (_, index) => ({
      dueDate: this.addMonthsToDate(firstDueDate, index),
      amount: Number(contract.rentValue || 0),
      installmentNumber: index + 1,
      installmentTotal: installmentQuantity,
    }));
  }

  private getContractInstallmentQuantity(startDate: Date, endDate: Date) {
    const monthDifference =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      endDate.getMonth() -
      startDate.getMonth();

    return Math.max(monthDifference, 1);
  }

  private addMonthsToDate(date: Date, monthsToAdd: number) {
    const nextDate = new Date(date);

    nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

    return nextDate;
  }

  private async validateContractRelations(
    companyId: string,
    propertyId: string,
    tenantId: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Empresa nao encontrada.');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
      },
    });

    if (!property) {
      throw new BadRequestException('Imovel nao encontrado.');
    }

    if (!property.isActive) {
      throw new BadRequestException('Imovel inativo nao pode ser alugado.');
    }

    const tenant = await this.prisma.person.findFirst({
      where: {
        id: tenantId,
        companyId,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Inquilino nao encontrado.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Inquilino inativo nao pode ser usado.');
    }

    if (!tenant.isTenant) {
      throw new BadRequestException(
        'Esta pessoa nao esta marcada como inquilino.',
      );
    }
  }

  private async ensurePropertyHasNoActiveContract(
    companyId: string,
    propertyId: string,
    ignoredContractId?: string,
  ) {
    const existingContract = await this.prisma.contract.findFirst({
      where: {
        companyId,
        propertyId,
        status: {
          in: [ContractStatus.ACTIVE],
        },
        endDate: {
          gte: this.getTodayStart(),
        },
        id: ignoredContractId ? { not: ignoredContractId } : undefined,
      },
    });

    if (existingContract) {
      throw new BadRequestException('Este imovel ja possui contrato ativo.');
    }
  }

  private buildCreateData(
    createContractDto: CriarContratoDto,
  ): Prisma.ContractCreateInput {
    return {
      company: { connect: { id: createContractDto.companyId } },
      property: { connect: { id: createContractDto.propertyId } },
      tenant: { connect: { id: createContractDto.tenantId } },
      propertyName: createContractDto.propertyName || null,
      tenantName: createContractDto.tenantName || null,
      startDate: this.parseDate(
        createContractDto.startDate,
        'Data inicial invalida.',
      ),
      endDate: this.parseDate(
        createContractDto.endDate,
        'Data final invalida.',
      ),
      rentValue: new Prisma.Decimal(createContractDto.rentValue),
      status: createContractDto.status ?? ContractStatus.ACTIVE,
      deletedAt: this.parseOptionalDate(createContractDto.deletedAt),
      statusReason: createContractDto.statusReason || null,
      statusReasonType: createContractDto.statusReasonType ?? null,
      statusReasonAt: this.parseOptionalDate(createContractDto.statusReasonAt),
      isTemporaryRental: createContractDto.isTemporaryRental ?? false,
      checkInTime: createContractDto.checkInTime || null,
      checkOutTime: createContractDto.checkOutTime || null,
      renewedAt: this.parseOptionalDate(createContractDto.renewedAt),
      renewalHistory:
        createContractDto.renewalHistory === undefined
          ? Prisma.JsonNull
          : createContractDto.renewalHistory,
      finishedAt: this.parseOptionalDate(createContractDto.finishedAt),
      finishReason: createContractDto.finishReason || null,
    };
  }

  private validateContractInput(
    startDateValue: string,
    endDateValue: string,
    rentValue: unknown,
  ) {
    const startDate = this.parseDate(startDateValue, 'Data inicial invalida.');
    const endDate = this.parseDate(endDateValue, 'Data final invalida.');
    const normalizedRentValue = Number(rentValue || 0);

    if (endDate < startDate) {
      throw new BadRequestException(
        'A data final nao pode ser menor que a data inicial.',
      );
    }

    if (!Number.isFinite(normalizedRentValue) || normalizedRentValue <= 0) {
      throw new BadRequestException('Valor de aluguel invalido.');
    }
  }

  private buildUpdateData(
    updateContractDto: AtualizarContratoDto,
  ): Prisma.ContractUpdateInput {
    const normalizedData = this.normalizeContractData(updateContractDto);

    return {
      property: normalizedData.propertyId
        ? { connect: { id: normalizedData.propertyId } }
        : undefined,
      tenant: normalizedData.tenantId
        ? { connect: { id: normalizedData.tenantId } }
        : undefined,
      propertyName:
        normalizedData.propertyName !== undefined
          ? normalizedData.propertyName || null
          : undefined,
      tenantName:
        normalizedData.tenantName !== undefined
          ? normalizedData.tenantName || null
          : undefined,
      startDate:
        normalizedData.startDate !== undefined
          ? this.parseDate(
              normalizedData.startDate,
              'Data inicial invalida.',
            )
          : undefined,
      endDate:
        normalizedData.endDate !== undefined
          ? this.parseDate(normalizedData.endDate, 'Data final invalida.')
          : undefined,
      rentValue:
        normalizedData.rentValue !== undefined
          ? new Prisma.Decimal(normalizedData.rentValue)
          : undefined,
      status: normalizedData.status,
      deletedAt:
        normalizedData.deletedAt !== undefined
          ? this.parseOptionalDate(normalizedData.deletedAt)
          : undefined,
      statusReason:
        normalizedData.statusReason !== undefined
          ? normalizedData.statusReason || null
          : undefined,
      statusReasonType:
        normalizedData.statusReasonType !== undefined
          ? normalizedData.statusReasonType
          : undefined,
      statusReasonAt:
        normalizedData.statusReasonAt !== undefined
          ? this.parseOptionalDate(normalizedData.statusReasonAt)
          : undefined,
      isTemporaryRental: normalizedData.isTemporaryRental,
      checkInTime:
        normalizedData.checkInTime !== undefined
          ? normalizedData.checkInTime || null
          : undefined,
      checkOutTime:
        normalizedData.checkOutTime !== undefined
          ? normalizedData.checkOutTime || null
          : undefined,
      renewedAt:
        normalizedData.renewedAt !== undefined
          ? this.parseOptionalDate(normalizedData.renewedAt)
          : undefined,
      renewalHistory:
        normalizedData.renewalHistory !== undefined
          ? normalizedData.renewalHistory
          : undefined,
      finishedAt:
        normalizedData.finishedAt !== undefined
          ? this.parseOptionalDate(normalizedData.finishedAt)
          : undefined,
      finishReason:
        normalizedData.finishReason !== undefined
          ? normalizedData.finishReason || null
          : undefined,
    };
  }

  private normalizeContractData<
    TData extends CriarContratoDto | AtualizarContratoDto,
  >(data: TData) {
    return uppercaseFields(data, [
      'propertyName',
      'tenantName',
      'statusReason',
      'finishReason',
    ]);
  }

  private parseDate(value: string, errorMessage: string) {
    const parsedDate = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsedDate;
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) return null;

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Data invalida.');
    }

    return parsedDate;
  }

  private formatDateForInput(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatDateForDisplay(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${day}/${month}/${year}`;
  }

  private getTodayStart() {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    return today;
  }
}
