import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import {
  SettingsController,
  SettingsRuntimeController,
} from './settings.controller';
import { SettingsService } from './settings.service';

describe('Configuração de inicialização de usuários', () => {
  const employee = {
    id: 'employee',
    name: 'Ana',
    email: '',
    companyId: 'company-a',
    role: 'USER',
    permissions: ['sales'],
    actionPermissions: ['sales:view'],
  };
  function fixture() {
    const prisma = {
      company: { findUnique: jest.fn().mockResolvedValue({ id: 'company-a' }) },
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companyId: 'company-a',
          userSettings: { name: 'Administrador' },
          companySettings: {
            ramoAtividade: 'CONFECCOES',
            tradeName: 'Loja A',
            logo: 'logo',
            salesCardAdministrators: [{ id: 'internal' }],
            privateCredential: 'secret',
          },
          themeSettings: {
            mode: 'light',
            accent: 'violet',
            privateKey: 'secret',
          },
          printTemplates: { privateTemplate: 'template' },
        }),
      },
    };
    return {
      prisma,
      service: new SettingsService(prisma as unknown as PrismaService),
    };
  }
  function context(
    controller: typeof SettingsController | typeof SettingsRuntimeController,
    handler: 'findByCompany' | 'upsert' = 'findByCompany',
  ) {
    return {
      getClass: () => controller,
      getHandler: () =>
        controller.prototype[handler as keyof typeof controller.prototype],
      switchToHttp: () => ({ getRequest: () => ({ user: employee }) }),
    } as unknown as ExecutionContext;
  }
  it('permite inicialização sem conceder acesso administrativo', () => {
    const guard = new ToolPermissionGuard(new Reflector());
    expect(guard.canActivate(context(SettingsRuntimeController))).toBe(true);
    expect(() => guard.canActivate(context(SettingsController))).toThrow(
      ForbiddenException,
    );
    expect(() =>
      guard.canActivate(context(SettingsController, 'upsert')),
    ).toThrow(ForbiddenException);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SettingsRuntimeController),
    ).toContain(JwtGuardAutenticacao);
  });
  it('usa a empresa autenticada e retorna somente apresentação e tema', async () => {
    const { prisma, service } = fixture();
    const controller = new SettingsRuntimeController(service);
    const result = await controller.findByCompany(employee);
    expect(prisma.appSettings.findUnique).toHaveBeenCalledWith({
      where: { companyId: 'company-a' },
    });
    expect(result).toEqual({
      companyId: 'company-a',
      companySettings: {
        ramoAtividade: 'CONFECCOES',
        tradeName: 'Loja A',
        logo: 'logo',
      },
      themeSettings: { mode: 'light', accent: 'violet' },
    });
  });
  it('aceita empresa sem configurações e recusa empresa inexistente', async () => {
    const { prisma, service } = fixture();
    prisma.appSettings.findUnique.mockResolvedValue(null);
    expect(await service.findRuntimeByCompany('company-a')).toEqual({
      companyId: 'company-a',
      companySettings: {},
      themeSettings: {},
    });
    prisma.company.findUnique.mockResolvedValue(null);
    await expect(
      service.findRuntimeByCompany('inexistente'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
