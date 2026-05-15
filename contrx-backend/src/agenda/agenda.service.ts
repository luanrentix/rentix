import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CriarAgendaItemDto, companyId: string) {
    return this.prisma.scheduleItem.create({
      data: {
        companyId,
        title: data.title,
        customerName: data.customerName,
        propertyName: data.propertyName,
        date: new Date(`${data.date}T00:00:00`),
        time: data.time,
        type: data.type,
        status: data.status || 'scheduled',
        priority: data.priority || 'medium',
        responsibleName: data.responsibleName,
        reminder: data.reminder,
        notes: data.notes || null,
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
    await this.findOne(id, companyId);

    return this.prisma.scheduleItem.update({
      where: { id },
      data: {
        companyId,
        title: data.title,
        customerName: data.customerName,
        propertyName: data.propertyName,
        date: data.date ? new Date(`${data.date}T00:00:00`) : undefined,
        time: data.time,
        type: data.type,
        status: data.status,
        priority: data.priority,
        responsibleName: data.responsibleName,
        reminder: data.reminder,
        notes: data.notes,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.scheduleItem.delete({ where: { id } });
  }
}
