import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { PessoasController } from './pessoas.controller';
import { PessoasService } from './pessoas.service';

@Module({
  imports: [PrismaModule],
  controllers: [PessoasController],
  providers: [PessoasService],
  exports: [PessoasService],
})
export class PessoasModule {}
