import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { uppercaseRecordFields } from '../common/text-normalization';
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
    const normalizedData = this.normalizeSettingsData(data);

    return this.prisma.appSettings.upsert({
      where: { companyId },
      create: {
        company: { connect: { id: companyId } },
        userSettings: this.toJsonValue(normalizedData.userSettings),
        companySettings: this.toJsonValue(normalizedData.companySettings),
        themeSettings: this.toJsonValue(normalizedData.themeSettings),
        printTemplates: this.toJsonValue(normalizedData.printTemplates),
      },
      update: {
        userSettings: this.toJsonValue(normalizedData.userSettings),
        companySettings: this.toJsonValue(normalizedData.companySettings),
        themeSettings: this.toJsonValue(normalizedData.themeSettings),
        printTemplates: this.toJsonValue(normalizedData.printTemplates),
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
    return value === undefined
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);
  }

  private normalizeSettingsData(data: UpsertSettingsDto): UpsertSettingsDto {
    return {
      ...data,
      userSettings: uppercaseRecordFields(data.userSettings, ['name']),
      companySettings: uppercaseRecordFields(data.companySettings, [
        'companyName',
        'tradeName',
        'document',
        'stateRegistration',
        'municipalRegistration',
        'zipCode',
        'address',
        'number',
        'neighborhood',
        'city',
        'state',
      ]),
    };
  }
}
