import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findByCompany(@Query('companyId') companyId?: string) {
    return this.settingsService.findByCompany(companyId);
  }

  @Put()
  upsert(@Body() data: UpsertSettingsDto) {
    return this.settingsService.upsert(data);
  }
}
