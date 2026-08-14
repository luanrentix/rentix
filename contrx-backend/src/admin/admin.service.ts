import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { getCompanyAccessState } from '../common/company-access-state';
import { PrismaService } from '../prisma/prisma.service';
import type { ResetTestDataModule } from './dto/reset-test-data.dto';
import type { UpdateAdminCompanyDto } from './dto/update-admin-company.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import type { CreateErrorLogDto } from './dto/create-error-log.dto';

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function parseTrialEndDate(value: string) {
  return new Date(`${value.slice(0, 10)}T23:59:59.999`);
}

function parseEndDate(value: string) {
  return new Date(`${value.slice(0, 10)}T23:59:59.999`);
}

function getStringValue(source: unknown, key: string) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return '';
  }

  const value = (source as Record<string, unknown>)[key];

  return typeof value === 'string' ? value.trim() : '';
}

function getConfiguredCompanyPhone(settings: unknown) {
  return getStringValue(settings, 'phone');
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getResumo() {
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalSettings,
      usersByRole,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.appSettings.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      }),
    ]);

    return {
      totalCompanies,
      activeCompanies,
      inactiveCompanies: totalCompanies - activeCompanies,
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalSettings,
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        total: item._count.role,
      })),
    };
  }

  async findUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        company: {
          select: {
            id: true,
            tradeName: true,
            companyName: true,
            email: true,
            phone: true,
            isActive: true,
            subscriptionStatus: true,
            trialStartsAt: true,
            trialEndsAt: true,
            trialExtendedUntil: true,
            subscriptionEndsAt: true,
            settings: {
              select: {
                companySettings: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      const { settings, ...company } = user.company;
      const configuredPhone = getConfiguredCompanyPhone(
        settings?.companySettings,
      );

      return {
        ...user,
        company: {
          ...company,
          phone: configuredPhone || company.phone,
          accessState: getCompanyAccessState(company),
        },
      };
    });
  }

  async findCompanies() {
    const companies = await this.prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        tradeName: true,
        companyName: true,
        document: true,
        phone: true,
        email: true,
        isActive: true,
        subscriptionStatus: true,
        trialStartsAt: true,
        trialEndsAt: true,
        trialExtendedUntil: true,
        subscriptionEndsAt: true,
        settings: {
          select: {
            companySettings: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            people: true,
            properties: true,
            contracts: true,
          },
        },
      },
    });

    return companies.map((company) => {
      const { settings, ...companyData } = company;
      const configuredPhone = getConfiguredCompanyPhone(
        settings?.companySettings,
      );

      return {
        ...companyData,
        phone: configuredPhone || companyData.phone,
        accessState: getCompanyAccessState(companyData),
      };
    });
  }

  findCompanyCommercialHistory(companyId: string) {
    return this.prisma.commercialHistory.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
  }

  async reprocessCommercialExpirations(currentUserId?: string) {
    const now = new Date();
    const companies = await this.prisma.company.findMany({
      where: {
        subscriptionStatus: {
          in: ['TRIAL', 'ACTIVE'],
        },
      },
      select: {
        id: true,
        tradeName: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        trialExtendedUntil: true,
        subscriptionEndsAt: true,
      },
    });

    const expiredCompanies = companies.filter((company) => {
      const expiresAt =
        company.subscriptionStatus === 'ACTIVE'
          ? company.subscriptionEndsAt
          : company.trialExtendedUntil || company.trialEndsAt;

      return Boolean(expiresAt && expiresAt.getTime() < now.getTime());
    });

    for (const company of expiredCompanies) {
      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          subscriptionStatus: 'EXPIRED',
        },
      });

      await this.prisma.commercialHistory.create({
        data: {
          companyId: company.id,
          userId: currentUserId,
          action: 'AUTO_EXPIRED',
          description: `${company.tradeName || 'Empresa'} marcada como vencida automaticamente.`,
          metadata: toPrismaJson({
            previous: company,
            processedAt: now,
          }),
        },
      });
    }

    return {
      processed: companies.length,
      expired: expiredCompanies.length,
    };
  }

  async updateUser(
    currentUserId: string,
    userId: string,
    data: UpdateAdminUserDto,
  ) {
    if (data.role === undefined && data.isActive === undefined) {
      throw new BadRequestException('Informe ao menos uma alteração.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    if (userId === currentUserId) {
      if (data.isActive === false) {
        throw new ForbiddenException(
          'Voce nao pode inativar seu proprio usuario master.',
        );
      }

      if (data.role && data.role !== 'SYSTEM_OWNER') {
        throw new ForbiddenException(
          'Voce nao pode remover seu proprio perfil master.',
        );
      }
    }

    if (existingUser.role === 'SYSTEM_OWNER' && data.isActive === false) {
      const activeSystemOwners = await this.prisma.user.count({
        where: {
          role: 'SYSTEM_OWNER',
          isActive: true,
        },
      });

      if (activeSystemOwners <= 1) {
        throw new ForbiddenException(
          'Mantenha pelo menos um dono do sistema ativo.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            tradeName: true,
            companyName: true,
            email: true,
            phone: true,
            isActive: true,
            subscriptionStatus: true,
            trialStartsAt: true,
            trialEndsAt: true,
            trialExtendedUntil: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });
  }

  async updateCompany(
    companyId: string,
    data: UpdateAdminCompanyDto,
    currentUserId?: string,
  ) {
    if (
      data.isActive === undefined &&
      data.trialExtensionDays === undefined &&
      data.trialEndsAt === undefined &&
      data.subscriptionStatus === undefined &&
      data.subscriptionEndsAt === undefined
    ) {
      throw new BadRequestException('Informe ao menos uma alteração.');
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        trialEndsAt: true,
        trialExtendedUntil: true,
        trialStartsAt: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    if (!existingCompany) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    const shouldExtendTrial = data.trialExtensionDays !== undefined;
    const shouldSetTrialEndDate = data.trialEndsAt !== undefined;
    const shouldSetSubscriptionEndDate = data.subscriptionEndsAt !== undefined;
    const shouldActivateSubscription = data.subscriptionStatus === 'ACTIVE';
    const shouldUseTrialStatus = data.subscriptionStatus === 'TRIAL';
    const shouldDisableCompany =
      data.subscriptionStatus === 'SUSPENDED' ||
      data.subscriptionStatus === 'CANCELED';
    const subscriptionEndsAt = shouldSetSubscriptionEndDate
      ? parseEndDate(data.subscriptionEndsAt as string)
      : existingCompany.subscriptionEndsAt || addDays(new Date(), 30);
    const trialExtensionBase =
      existingCompany.trialExtendedUntil ||
      existingCompany.trialEndsAt ||
      new Date();
    const trialExtensionStartsAt =
      trialExtensionBase.getTime() > Date.now()
        ? trialExtensionBase
        : new Date();

    const updateData = {
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.subscriptionStatus !== undefined
        ? { subscriptionStatus: data.subscriptionStatus }
        : {}),
      ...(shouldSetSubscriptionEndDate ? { subscriptionEndsAt } : {}),
      ...(shouldActivateSubscription
        ? {
            isActive: data.isActive ?? true,
            subscriptionEndsAt,
          }
        : {}),
      ...(shouldUseTrialStatus
        ? {
            isActive: data.isActive ?? true,
            trialStartsAt: existingCompany.trialStartsAt || new Date(),
            trialEndsAt: existingCompany.trialEndsAt || addDays(new Date(), 30),
            trialExtendedUntil: null,
            subscriptionEndsAt: null,
          }
        : {}),
      ...(shouldDisableCompany ? { isActive: false } : {}),
      ...(shouldExtendTrial
        ? {
            isActive: true,
            subscriptionStatus: 'TRIAL' as const,
            trialStartsAt: existingCompany.trialStartsAt || new Date(),
            trialExtendedUntil: addDays(
              trialExtensionStartsAt,
              data.trialExtensionDays as number,
            ),
            subscriptionEndsAt: null,
          }
        : {}),
      ...(shouldSetTrialEndDate
        ? {
            subscriptionStatus: 'TRIAL' as const,
            trialStartsAt: existingCompany.trialStartsAt || new Date(),
            trialEndsAt: parseTrialEndDate(data.trialEndsAt as string),
            trialExtendedUntil: null,
            subscriptionEndsAt: null,
          }
        : {}),
    };

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        id: true,
        tradeName: true,
        companyName: true,
        document: true,
        phone: true,
        email: true,
        isActive: true,
        subscriptionStatus: true,
        trialStartsAt: true,
        trialEndsAt: true,
        trialExtendedUntil: true,
        subscriptionEndsAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            people: true,
            properties: true,
            contracts: true,
          },
        },
      },
    });

    const action = shouldExtendTrial
      ? 'TRIAL_EXTENDED'
      : shouldSetTrialEndDate
        ? 'TRIAL_END_UPDATED'
        : data.subscriptionStatus
          ? 'STATUS_UPDATED'
          : shouldSetSubscriptionEndDate
            ? 'SUBSCRIPTION_END_UPDATED'
            : data.isActive !== undefined
              ? 'COMPANY_ACTIVE_UPDATED'
              : 'COMPANY_UPDATED';

    await this.prisma.commercialHistory.create({
      data: {
        companyId,
        userId: currentUserId,
        action,
        description:
          data.note ||
          this.buildCommercialHistoryDescription(action, updatedCompany),
        metadata: toPrismaJson({
          request: data,
          previous: existingCompany,
          current: {
            subscriptionStatus: updatedCompany.subscriptionStatus,
            trialEndsAt: updatedCompany.trialEndsAt,
            trialExtendedUntil: updatedCompany.trialExtendedUntil,
            subscriptionEndsAt: updatedCompany.subscriptionEndsAt,
            isActive: updatedCompany.isActive,
          },
        }),
      },
    });

    return {
      ...updatedCompany,
      accessState: getCompanyAccessState(updatedCompany),
    };
  }

  private buildCommercialHistoryDescription(
    action: string,
    company: { tradeName: string; subscriptionStatus: string },
  ) {
    const companyName = company.tradeName || 'Empresa';

    if (action === 'TRIAL_EXTENDED') {
      return `${companyName} teve o teste prorrogado.`;
    }

    if (action === 'TRIAL_END_UPDATED') {
      return `${companyName} teve a data de vencimento do teste atualizada.`;
    }

    if (action === 'STATUS_UPDATED') {
      return `${companyName} teve o status comercial alterado para ${company.subscriptionStatus}.`;
    }

    return `${companyName} teve o controle comercial atualizado.`;
  }

  async resetTestData(
    operatorCompanyId: string,
    currentUserId: string,
    modules: ResetTestDataModule[],
    targetCompanyId?: string,
  ) {
    const companyId = targetCompanyId || operatorCompanyId;
    const selectedModules = new Set(modules);
    const deletedRecords: Partial<Record<ResetTestDataModule, number>> = {};

    await this.prisma.$transaction(async (tx) => {
      const shouldResetPeople = selectedModules.has('people');
      const shouldResetProperties =
        shouldResetPeople || selectedModules.has('properties');
      const shouldResetContracts =
        shouldResetPeople ||
        shouldResetProperties ||
        selectedModules.has('contracts');
      const shouldResetReceivables =
        shouldResetContracts || selectedModules.has('accountsReceivable');
      const shouldResetPayables =
        shouldResetPeople || selectedModules.has('accountsPayable');

      if (shouldResetReceivables) {
        const receivableAccounts = await tx.contaReceber.findMany({
          where: { companyId },
          select: { id: true },
        });
        const receivableAccountIds = receivableAccounts.map(
          (account) => account.id,
        );

        if (receivableAccountIds.length > 0) {
          await tx.pagamentoRecebido.deleteMany({
            where: { chargeId: { in: receivableAccountIds } },
          });
        }

        const deletedReceivables = await tx.contaReceber.deleteMany({
          where: { companyId },
        });
        deletedRecords.accountsReceivable = deletedReceivables.count;
      }

      if (shouldResetPayables) {
        const payableAccounts = await tx.contaPagar.findMany({
          where: { companyId },
          select: { id: true },
        });
        const payableAccountIds = payableAccounts.map((account) => account.id);

        if (payableAccountIds.length > 0) {
          await tx.pagamentoRealizado.deleteMany({
            where: { expenseId: { in: payableAccountIds } },
          });
        }

        const deletedPayables = await tx.contaPagar.deleteMany({
          where: { companyId },
        });
        deletedRecords.accountsPayable = deletedPayables.count;
      }

      if (shouldResetContracts) {
        const deletedContracts = await tx.contract.deleteMany({
          where: { companyId },
        });
        deletedRecords.contracts = deletedContracts.count;
      }

      if (shouldResetProperties) {
        await tx.propertyMovement.deleteMany({ where: { companyId } });
        const deletedProperties = await tx.property.deleteMany({
          where: { companyId },
        });
        deletedRecords.properties = deletedProperties.count;
      } else if (selectedModules.has('contracts')) {
        await tx.propertyMovement.deleteMany({
          where: {
            companyId,
            type: {
              in: [
                'ContractCreated',
                'ContractUpdated',
                'ContractCanceled',
                'ContractDeleted',
                'ContractRenewed',
                'ContractFinished',
              ],
            },
          },
        });
      }

      if (shouldResetPeople) {
        const deletedPeople = await tx.person.deleteMany({
          where: { companyId },
        });
        deletedRecords.people = deletedPeople.count;
      }

      if (selectedModules.has('schedule')) {
        const deletedScheduleItems = await tx.scheduleItem.deleteMany({
          where: { companyId },
        });
        deletedRecords.schedule = deletedScheduleItems.count;
      }

      if (selectedModules.has('masterPanel')) {
        const deletedMasterPanelUsers = await tx.user.deleteMany({
          where: {
            companyId,
            id: { not: currentUserId },
            role: { not: 'SYSTEM_OWNER' },
          },
        });
        deletedRecords.masterPanel = deletedMasterPanelUsers.count;
      }
    });

    return {
      success: true,
      modules,
      deletedRecords,
    };
  }

  async createErrorLog(data: CreateErrorLogDto, companyId?: string) {
    const rawRoute = data.route || (data as any).endpoint || null;
    const rawMethod = data.method || (data as any).httpMethod || null;
    const rawStack = data.stack || (data as any).stackTrace || null;
    const rawPayload =
      typeof data.requestPayload === 'object'
        ? JSON.stringify(data.requestPayload).slice(0, 4000)
        : data.requestPayload || null;

    return this.prisma.systemErrorLog.create({
      data: {
        companyId: companyId || data.companyId || null,
        level: data.level || 'ERROR',
        message: data.message || 'Erro não especificado',
        stack: rawStack,
        route: rawRoute,
        method: rawMethod,
        statusCode: data.statusCode || 500,
        userEmail: data.userEmail || null,
        requestPayload: rawPayload,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
      },
    });
  }

  async findErrorLogs(
    query: {
      level?: string;
      module?: string;
      period?: string;
      search?: string;
      companyId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 15, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SystemErrorLogWhereInput = {};

    if (query.companyId && query.companyId !== 'all') {
      where.companyId = query.companyId;
    }

    if (query.level && query.level !== 'all') {
      where.level = query.level.toUpperCase();
    }

    if (query.period && query.period !== 'all') {
      const now = new Date();
      if (query.period === '24h') {
        where.createdAt = {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        };
      } else if (query.period === '7d') {
        where.createdAt = {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
      } else if (query.period === '30d') {
        where.createdAt = {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
      }
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { route: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { stack: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawLogs, total, total24h, totalCritical, allLogsForSummary] =
      await Promise.all([
        this.prisma.systemErrorLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            company: { select: { tradeName: true, companyName: true } },
          },
        }),
        this.prisma.systemErrorLog.count({ where }),
        this.prisma.systemErrorLog.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        this.prisma.systemErrorLog.count({
          where: {
            OR: [{ statusCode: { gte: 500 } }, { level: 'CRITICAL' }],
          },
        }),
        this.prisma.systemErrorLog.findMany({
          select: { route: true },
          take: 500,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

    const moduleCounts: Record<string, number> = {};
    for (const log of allLogsForSummary) {
      const mod = this.deriveModuleName(log.route);
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    }

    const affectedModulesCount = Object.keys(moduleCounts).length;
    let topAffectedModule: string | null = null;
    let maxCount = 0;

    for (const [modName, count] of Object.entries(moduleCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topAffectedModule = modName;
      }
    }

    const pages = Math.ceil(total / limit) || 1;

    const logs = rawLogs.map((log) => ({
      id: log.id,
      companyId: log.companyId,
      companyName: log.company?.tradeName || log.company?.companyName || null,
      userId: null,
      userName: null,
      userEmail: log.userEmail,
      level: log.level as any,
      module: this.deriveModuleName(log.route),
      message: log.message,
      stackTrace: log.stack,
      httpMethod: log.method,
      endpoint: log.route,
      requestPayload: log.requestPayload,
      userAgent: log.userAgent,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      statusCode: log.statusCode,
    }));

    return {
      logs,
      total,
      pages,
      summary: {
        total24h,
        totalCritical,
        affectedModulesCount,
        topAffectedModule,
      },
    };
  }

  private deriveModuleName(route?: string | null): string {
    if (!route) return 'Sistema';
    const cleanRoute = route.toLowerCase();
    if (cleanRoute.includes('/contas-receber')) return 'Contas a Receber';
    if (cleanRoute.includes('/contas-pagar')) return 'Contas a Pagar';
    if (cleanRoute.includes('/imoveis')) return 'Bens e Ativos';
    if (cleanRoute.includes('/contratos')) return 'Contratos';
    if (cleanRoute.includes('/pessoas')) return 'Pessoas';
    if (cleanRoute.includes('/autenticacao') || cleanRoute.includes('/login'))
      return 'Autenticação';
    if (cleanRoute.includes('/financeiro')) return 'Financeiro';
    if (cleanRoute.includes('/files')) return 'Arquivos';
    if (cleanRoute.includes('/admin')) return 'Painel Admin';
    if (cleanRoute.includes('/bancos')) return 'Bancos';
    if (cleanRoute.includes('/agenda')) return 'Agenda';
    if (cleanRoute.includes('/chamados')) return 'Chamados';
    return 'Geral';
  }

  async deleteErrorLog(id: string) {
    await this.prisma.systemErrorLog.delete({ where: { id } });
    return { success: true };
  }

  async purgeErrorLogs(daysOld = 30) {
    if (daysOld <= 0) {
      await this.prisma.systemErrorLog.deleteMany({});
    } else {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      await this.prisma.systemErrorLog.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });
    }
    return { success: true };
  }
}
