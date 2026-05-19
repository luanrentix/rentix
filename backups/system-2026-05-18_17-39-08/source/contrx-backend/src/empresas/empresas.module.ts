import { Module } from '@nestjs/common';
import { AutenticacaoModule } from '../autenticacao/autenticacao.module';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';

@Module({
  imports: [AutenticacaoModule],
  providers: [EmpresasService],
  controllers: [EmpresasController],
})
export class EmpresasModule {}
