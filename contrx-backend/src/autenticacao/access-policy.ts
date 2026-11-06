import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { userToolPermissions } from './dto/criar-usuario-empresa.dto';

export const accessActions = [
  'view',
  'create',
  'edit',
  'delete',
  'print',
  'export',
  'special',
] as const;
export function validateActionPermissions(value: string[] | null | undefined) {
  if (value == null) return Prisma.DbNull;
  const modules = new Set<string>(userToolPermissions);
  if (
    !Array.isArray(value) ||
    value.some((key) => {
      const parts = key.split(':');
      return (
        parts.length !== 2 ||
        !modules.has(parts[0]) ||
        !(accessActions as readonly string[]).includes(parts[1])
      );
    })
  )
    throw new BadRequestException('Permissões de ações inválidas.');
  return [...new Set(value)];
}
export function assertAccess(
  user:
    | { role?: string; permissions?: unknown; actionPermissions?: unknown }
    | undefined,
  module: string,
  action: string,
) {
  if (
    user &&
    ['SYSTEM_OWNER', 'DONO_SISTEMA', 'OWNER', 'ADMIN'].includes(user.role || '')
  )
    return;
  if (!Array.isArray(user?.permissions) || !user.permissions.includes(module))
    throw new ForbiddenException('Usuário sem permissão para esta ferramenta.');
  // NULL means legacy module permissions. An explicit empty array denies all actions.
  if (
    user.actionPermissions != null &&
    (!Array.isArray(user.actionPermissions) ||
      !user.actionPermissions.includes(`${module}:${action}`))
  )
    throw new ForbiddenException('Usuário sem permissão para esta ação.');
}
