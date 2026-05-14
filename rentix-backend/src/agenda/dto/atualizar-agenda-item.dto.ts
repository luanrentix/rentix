import { PartialType } from '@nestjs/mapped-types';
import { CriarAgendaItemDto } from './criar-agenda-item.dto';

export class AtualizarAgendaItemDto extends PartialType(CriarAgendaItemDto) {}
