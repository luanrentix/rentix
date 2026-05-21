import { Injectable, NotFoundException } from '@nestjs/common';

import { uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';

import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CriarAgendaItemDto, companyId: string) {
    const normalizedData = this.normalizeScheduleData(data);

    return this.prisma.scheduleItem.create({
      data: {
        companyId,
        title: normalizedData.title,
        customerName: normalizedData.customerName,
        propertyName: normalizedData.propertyName,
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

  findAll(companyId: string) {
    return this.prisma.scheduleItem.findMany({
      where: { companyId },
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

    return this.prisma.scheduleItem.update({
      where: { id },
      data: {
        title: normalizedData.title,
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
}
