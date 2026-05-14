import { CriarAgendaItemDto } from './criar-agenda-item.dto';

export class AtualizarAgendaItemDto implements Partial<CriarAgendaItemDto> {
  companyId?: string;
  title?: string;
  customerName?: string;
  propertyName?: string;
  date?: string;
  time?: string;
  type?: string;
  status?: string;
  priority?: string;
  responsibleName?: string;
  reminder?: string;
  notes?: string;
}
