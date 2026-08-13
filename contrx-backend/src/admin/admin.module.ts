import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SystemOwnerGuard } from './system-owner.guard';

import { RateLimitGuard } from '../autenticacao/guards/rate-limit.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, SystemOwnerGuard, RateLimitGuard],
})
export class AdminModule {}
