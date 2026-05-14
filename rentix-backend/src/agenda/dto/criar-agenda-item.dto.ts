export class CriarAgendaItemDto {
  companyId: string;
  title: string;
  customerName: string;
  propertyName: string;
  date: string;
  time: string;
  type: string;
  status?: string;
  priority?: string;
  responsibleName: string;
  reminder: string;
  notes?: string;
}
