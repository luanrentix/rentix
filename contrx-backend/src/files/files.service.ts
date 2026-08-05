import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemFileType, SystemFileEntity } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadFile(
    companyId: string,
    entityType: SystemFileEntity,
    entityId: string,
    file: Express.Multer.File,
  ) {
    // Generate a unique filename while preserving extension
    const extension = path.extname(file.originalname);
    const filename = `${uuidv4()}${extension}`;

    // Ensure uploads directory exists for this company
    const uploadDir = path.join(process.cwd(), 'uploads', companyId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);

    // If using multer dest, file is already saved in tmp location, we need to move it
    fs.renameSync(file.path, filePath);

    let type: SystemFileType = 'OTHER';
    const mime = file.mimetype;
    if (mime.startsWith('image/')) type = 'IMAGE';
    else if (mime === 'application/pdf') type = 'PDF';

    const url = `/uploads/${companyId}/${filename}`;

    const systemFile = await this.prisma.systemFile.create({
      data: {
        companyId,
        entityType,
        entityId,
        url,
        type,
        size: file.size,
        originalName: file.originalname,
      },
    });

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

    const fileName = path.basename(file.url);
    const filePath = path.join(process.cwd(), 'uploads', companyId, fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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
