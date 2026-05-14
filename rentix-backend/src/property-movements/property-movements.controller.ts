import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { CriarPropertyMovementDto } from './dto/criar-property-movement.dto';
import { PropertyMovementsService } from './property-movements.service';

@Controller('property-movements')
export class PropertyMovementsController {
  constructor(private readonly propertyMovementsService: PropertyMovementsService) {}

  @Post()
  create(@Body() data: CriarPropertyMovementDto) {
    return this.propertyMovementsService.create(data);
  }

  @Get()
  findAll(
    @Query('companyId') companyId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.propertyMovementsService.findAll(companyId, propertyId);
  }
}
