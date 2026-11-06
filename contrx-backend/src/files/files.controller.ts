import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  UseGuards,
  Get,
  Param,
  Delete,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { SystemFileEntity } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { assertAccess } from '../autenticacao/access-policy';

@Controller('files')
@UseGuards(JwtGuardAutenticacao)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  private async authorize(
    user: UsuarioAutenticado,
    entityType: SystemFileEntity,
    entityId: string,
    action: string,
  ) {
    const where = { id: entityId, companyId: user.companyId };
    let module: string;
    let exists: unknown;
    if (entityType === 'PERSON') {
      module = 'people';
      exists = await this.prisma.person.findFirst({
        where,
        select: { id: true },
      });
    } else if (entityType === 'PROPERTY') {
      module = 'properties';
      exists = await this.prisma.property.findFirst({
        where,
        select: { id: true },
      });
    } else if (entityType === 'CONTRACT') {
      module = 'contracts';
      exists = await this.prisma.contract.findFirst({
        where,
        select: { id: true },
      });
    } else if (entityType === 'COMPANY') {
      module = 'settings';
      exists = entityId === user.companyId;
    } else {
      module = 'sales';
      exists =
        (await this.prisma.salesProduct.findFirst({
          where,
          select: { id: true },
        })) ||
        (await this.prisma.salesCustomer.findFirst({
          where,
          select: { id: true },
        }));
    }
    if (!exists)
      throw new NotFoundException('Cadastro não encontrado nesta empresa.');
    assertAccess(user, module, action);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: UsuarioAutenticado,
    @Body('entityType') entityType: SystemFileEntity,
    @Body('entityId') entityId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB limit
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const companyId = user.companyId;
    await this.authorize(user, entityType, entityId, 'edit');
    return this.filesService.uploadFile(companyId, entityType, entityId, file);
  }

  @Get('entity/:entityType/:entityId')
  async listFiles(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('entityType') entityType: SystemFileEntity,
    @Param('entityId') entityId: string,
  ) {
    const companyId = user.companyId;
    await this.authorize(user, entityType, entityId, 'view');
    return this.filesService.listFilesByEntity(companyId, entityType, entityId);
  }

  @Delete(':id')
  async deleteFile(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
  ) {
    const companyId = user.companyId;
    const file = await this.filesService.getFile(id, companyId);
    await this.authorize(user, file.entityType, file.entityId, 'delete');
    return this.filesService.deleteFile(id, companyId);
  }
}
