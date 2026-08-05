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

@Controller('files')
@UseGuards(JwtGuardAutenticacao)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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
    return this.filesService.uploadFile(companyId, entityType, entityId, file);
  }

  @Get('entity/:entityType/:entityId')
  async listFiles(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('entityType') entityType: SystemFileEntity,
    @Param('entityId') entityId: string,
  ) {
    const companyId = user.companyId;
    return this.filesService.listFilesByEntity(companyId, entityType, entityId);
  }

  @Delete(':id')
  async deleteFile(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
  ) {
    const companyId = user.companyId;
    return this.filesService.deleteFile(id, companyId);
  }
}
