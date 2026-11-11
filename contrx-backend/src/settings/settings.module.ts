import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  SettingsController,
  SettingsRuntimeController,
} from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsRuntimeController, SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
