import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContratosService } from './contratos.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { AtualizarContratoDto } from './dto/atualizar-contrato.dto';

@Controller('contratos')
export class ContratosController {
  constructor(private readonly contractsService: ContratosService) {}

  @Post()
  create(@Body() createContractDto: CriarContratoDto) {
    return this.contractsService.create(createContractDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.contractsService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: AtualizarContratoDto,
  ) {
    return this.contractsService.update(id, updateContractDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contractsService.remove(id);
  }
}
