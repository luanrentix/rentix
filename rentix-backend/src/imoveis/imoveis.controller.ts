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
import { CriarImovelDto } from './dto/criar-imovel.dto';
import { AtualizarImovelDto } from './dto/atualizar-imovel.dto';
import { ImoveisService } from './imoveis.service';

@Controller('imoveis')
export class ImoveisController {
  constructor(private readonly propertiesService: ImoveisService) {}

  @Post()
  create(@Body() createPropertyDto: CriarImovelDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.propertiesService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: AtualizarImovelDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}