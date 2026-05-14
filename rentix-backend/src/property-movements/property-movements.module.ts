import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PropertyMovementsController } from './property-movements.controller';
import { PropertyMovementsService } from './property-movements.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyMovementsController],
  providers: [PropertyMovementsService],
})
export class PropertyMovementsModule {}
