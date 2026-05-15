import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
