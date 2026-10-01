import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemFileType, SystemFileEntity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadFile(
    companyId: string,
    entityType: SystemFileEntity,
    entityId: string,
    file: Express.Multer.File,
  ) {
    let type: SystemFileType = 'OTHER';
    const mime = file.mimetype || 'application/octet-stream';
    if (mime.startsWith('image/')) type = 'IMAGE';
    else if (mime === 'application/pdf') type = 'PDF';
    else if (
      mime.includes('document') ||
      mime.includes('word') ||
      mime.includes('sheet') ||
      mime.includes('excel')
    ) {
      type = 'DOCUMENT';
    }

    let fileBuffer: Buffer;
    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      fileBuffer = fs.readFileSync(file.path);
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
    } else {
      throw new Error('Arquivo não encontrado para processamento.');
    }

    // Salvar permanentemente no banco de dados Supabase como Data URL (Base64)
    // Garantindo que nunca se perca em deploy, reinício ou migração de VPS
    const base64Content = fileBuffer.toString('base64');
    const dataUrl = `data:${mime};base64,${base64Content}`;

    const systemFile = await this.prisma.systemFile.create({
      data: {
        companyId,
        entityType,
        entityId,
        url: dataUrl,
        type,
        size: file.size,
        originalName: file.originalname,
      },
    });

    // Sincronizar com Pessoa (Foto de perfil / principal)
    if (entityType === 'PERSON' && type === 'IMAGE') {
      await this.prisma.person
        .update({
          where: { id: entityId },
          data: { photo: dataUrl },
        })
        .catch(() => null);
    }

    // Sincronizar com Bem/Ativo (Galeria de fotos do imóvel)
    if (entityType === 'PROPERTY' && type === 'IMAGE') {
      try {
        const prop = await this.prisma.property.findUnique({
          where: { id: entityId },
          select: { photos: true },
        });

        let currentPhotos: string[] = [];
        if (prop?.photos) {
          try {
            const parsed = JSON.parse(prop.photos);
            if (Array.isArray(parsed)) currentPhotos = parsed.filter(Boolean);
            else if (typeof parsed === 'string' && parsed)
              currentPhotos = [parsed];
          } catch {
            if (typeof prop.photos === 'string' && prop.photos) {
              currentPhotos = [prop.photos];
            }
          }
        }

        currentPhotos.push(dataUrl);

        await this.prisma.property.update({
          where: { id: entityId },
          data: { photos: JSON.stringify(currentPhotos) },
        });
      } catch {
        /* ignore */
      }
    }

    return systemFile;
  }

  async getFile(id: string, companyId: string) {
    const file = await this.prisma.systemFile.findFirst({
      where: { id, companyId },
    });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async deleteFile(id: string, companyId: string) {
    const file = await this.prisma.systemFile.findFirst({
      where: { id, companyId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Se for foto de imóvel, remove da coluna fotos sincronizada
    if (file.entityType === 'PROPERTY') {
      try {
        const prop = await this.prisma.property.findUnique({
          where: { id: file.entityId },
          select: { photos: true },
        });

        if (prop?.photos) {
          let currentPhotos: string[] = [];
          try {
            const parsed = JSON.parse(prop.photos);
            if (Array.isArray(parsed)) currentPhotos = parsed.filter(Boolean);
          } catch {
            /* ignore */
          }
          currentPhotos = currentPhotos.filter((p) => p !== file.url);
          await this.prisma.property.update({
            where: { id: file.entityId },
            data: { photos: JSON.stringify(currentPhotos) },
          });
        }
      } catch {
        /* ignore */
      }
    }

    // Se for foto de pessoa, limpa se for a mesma
    if (file.entityType === 'PERSON') {
      try {
        const person = await this.prisma.person.findUnique({
          where: { id: file.entityId },
          select: { photo: true },
        });
        if (person?.photo === file.url) {
          await this.prisma.person.update({
            where: { id: file.entityId },
            data: { photo: null },
          });
        }
      } catch {
        /* ignore */
      }
    }

    // Se houver arquivo em disco legado
    if (file.url && file.url.startsWith('/uploads/')) {
      try {
        const fileName = path.basename(file.url);
        const filePath = path.join(
          process.cwd(),
          'uploads',
          companyId,
          fileName,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        /* ignore */
      }
    }

    await this.prisma.systemFile.delete({
      where: { id },
    });

    return { success: true };
  }

  async listFilesByEntity(
    companyId: string,
    entityType: SystemFileEntity,
    entityId: string,
  ) {
    return this.prisma.systemFile.findMany({
      where: { companyId, entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
