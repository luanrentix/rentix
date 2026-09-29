import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';

import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarAgendaItemDto, companyId: string) {
    const normalizedData = this.normalizeScheduleData(data);

    await this.validatePerson(companyId, normalizedData.personId);
    await this.validateProperty(companyId, normalizedData.propertyId);

    return this.prisma.scheduleItem.create({
      data: {
        companyId,
        title: normalizedData.title,
        personId: normalizedData.personId || null,
        propertyId: normalizedData.propertyId || null,
        customerName: normalizedData.customerName || '',
        propertyName: normalizedData.propertyName || '',
        date: new Date(`${normalizedData.date}T00:00:00`),
        time: normalizedData.time,
        type: normalizedData.type,
        status: normalizedData.status || 'scheduled',
        priority: normalizedData.priority || 'medium',
        responsibleName: normalizedData.responsibleName,
        reminder: normalizedData.reminder,
        notes: normalizedData.notes || null,
      },
    });
  }

  findAll(companyId: string, startDate?: string, endDate?: string) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(`${startDate}T00:00:00`);
      }
      if (endDate) {
        where.date.lte = new Date(`${endDate}T23:59:59.999`);
      }
    }

    return this.prisma.scheduleItem.findMany({
      where,
      include: {
        person: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  findPendingReminders(companyId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    yesterday.setHours(0, 0, 0, 0);

    const nextDays = new Date();
    nextDays.setDate(nextDays.getDate() + 3);
    nextDays.setHours(23, 59, 59, 999);

    return this.prisma.scheduleItem.findMany({
      where: {
        companyId,
        status: 'scheduled',
        reminder: {
          not: 'Sem lembrete',
        },
        date: {
          gte: yesterday,
          lte: nextDays,
        },
      },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
  }

  async findOne(id: string, companyId: string) {
    const item = await this.prisma.scheduleItem.findFirst({
      where: { id, companyId },
    });

    if (!item) {
      throw new NotFoundException('Schedule item not found');
    }

    return item;
  }

  async update(id: string, data: AtualizarAgendaItemDto, companyId: string) {
    const normalizedData = this.normalizeScheduleData(data);

    await this.findOne(id, companyId);
    await this.validatePerson(companyId, normalizedData.personId);
    await this.validateProperty(companyId, normalizedData.propertyId);

    return this.prisma.scheduleItem.update({
      where: { id },
      data: {
        title: normalizedData.title,
        personId:
          normalizedData.personId === undefined
            ? undefined
            : normalizedData.personId || null,
        propertyId:
          normalizedData.propertyId === undefined
            ? undefined
            : normalizedData.propertyId || null,
        customerName: normalizedData.customerName,
        propertyName: normalizedData.propertyName,
        date: normalizedData.date
          ? new Date(`${normalizedData.date}T00:00:00`)
          : undefined,
        time: normalizedData.time,
        type: normalizedData.type,
        status: normalizedData.status,
        priority: normalizedData.priority,
        responsibleName: normalizedData.responsibleName,
        reminder: normalizedData.reminder,
        notes: normalizedData.notes,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.scheduleItem.delete({ where: { id } });
  }

  private normalizeScheduleData<
    TData extends CriarAgendaItemDto | AtualizarAgendaItemDto,
  >(data: TData) {
    return uppercaseFields(data, [
      'title',
      'customerName',
      'propertyName',
      'type',
      'responsibleName',
      'reminder',
      'notes',
    ]);
  }

  private async validatePerson(companyId: string, personId?: string | null) {
    if (!personId) return;

    const person = await this.prisma.person.findFirst({
      where: {
        id: personId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new BadRequestException('Pessoa nao encontrada para esta empresa.');
    }
  }

  private async validateProperty(
    companyId: string,
    propertyId?: string | null,
  ) {
    if (!propertyId) return;

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      throw new BadRequestException(
        'Bem/ativo nao encontrado para esta empresa.',
      );
    }
  }
}
