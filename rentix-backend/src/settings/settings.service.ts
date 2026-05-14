import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompany(companyId: string) {
    await this.validateCompany(companyId);

    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId },
    });

    return settings || this.getEmptySettings(companyId);
  }

  async upsert(data: UpsertSettingsDto, companyId: string) {
    await this.validateCompany(companyId);

    return this.prisma.appSettings.upsert({
      where: { companyId },
      create: {
        company: { connect: { id: companyId } },
        userSettings: this.toJsonValue(data.userSettings),
        companySettings: this.toJsonValue(data.companySettings),
        themeSettings: this.toJsonValue(data.themeSettings),
        printTemplates: this.toJsonValue(data.printTemplates),
      },
      update: {
        userSettings: this.toJsonValue(data.userSettings),
        companySettings: this.toJsonValue(data.companySettings),
        themeSettings: this.toJsonValue(data.themeSettings),
        printTemplates: this.toJsonValue(data.printTemplates),
      },
    });
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

  private getEmptySettings(companyId: string) {
    return {
      id: null,
      companyId,
      userSettings: null,
      companySettings: null,
      themeSettings: null,
      printTemplates: null,
      createdAt: null,
      updatedAt: null,
    };
  }

  private toJsonValue(value?: Record<string, unknown>) {
    return value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
  }
}
