import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ResetTestDataModule } from './dto/reset-test-data.dto';
import type { UpdateAdminCompanyDto } from './dto/update-admin-company.dto';
import type { UpdateAdminUserDto } from './dto/update-admin-user.dto';

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

  findUsers() {
    return this.prisma.user.findMany({
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
        company: {
          select: {
            id: true,
            tradeName: true,
            companyName: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  }

  findCompanies() {
    return this.prisma.company.findMany({
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
            isActive: true,
          },
        },
      },
    });
  }

  async updateCompany(companyId: string, data: UpdateAdminCompanyDto) {
    if (data.isActive === undefined) {
      throw new BadRequestException('Informe ao menos uma alteração.');
    }

    const existingCompany = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!existingCompany) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    return this.prisma.company.update({
      where: { id: companyId },
      data: {
        isActive: data.isActive,
      },
      select: {
        id: true,
        tradeName: true,
        companyName: true,
        document: true,
        phone: true,
        email: true,
        isActive: true,
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
  }

  async resetTestData(
    companyId: string,
    currentUserId: string,
    modules: ResetTestDataModule[],
  ) {
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
            id: { not: currentUserId },
            email: { not: 'adm@contrx.com' },
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
}
