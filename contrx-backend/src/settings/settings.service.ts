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
        userSettings: this.toRequiredJsonValue(normalizedData.userSettings),
        companySettings: this.toRequiredJsonValue(
          normalizedData.companySettings,
        ),
        themeSettings: this.toRequiredJsonValue(normalizedData.themeSettings),
        printTemplates: this.toRequiredJsonValue(normalizedData.printTemplates),
      },
      update: this.getSettingsUpdateData(normalizedData),
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

  private toRequiredJsonValue(value?: Record<string, unknown>) {
    return value === undefined
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);
  }

  private getSettingsUpdateData(data: UpsertSettingsDto) {
    const updateData: Prisma.AppSettingsUpdateInput = {};

    if (data.userSettings !== undefined) {
      updateData.userSettings = data.userSettings as Prisma.InputJsonValue;
    }

    if (data.companySettings !== undefined) {
      updateData.companySettings =
        data.companySettings as Prisma.InputJsonValue;
    }

    if (data.themeSettings !== undefined) {
      updateData.themeSettings = data.themeSettings as Prisma.InputJsonValue;
    }

    if (data.printTemplates !== undefined) {
      updateData.printTemplates = data.printTemplates as Prisma.InputJsonValue;
    }

    return updateData;
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
