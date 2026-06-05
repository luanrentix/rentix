import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserToolPermission } from '../dto/criar-usuario-empresa.dto';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.type';
import { TOOL_PERMISSION_KEY } from '../decorators/tool-permission.decorator';

type RequestWithUser = {
  user?: UsuarioAutenticado;
};

function isPrivilegedRole(role?: string | null) {
  return (
    role === 'SYSTEM_OWNER' ||
    role === 'DONO_SISTEMA' ||
    role === 'OWNER' ||
    role === 'ADMIN'
  );
}

function normalizePermissions(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (permission): permission is string => typeof permission === 'string',
      )
    : [];
}

@Injectable()
export class ToolPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermission = this.reflector.getAllAndOverride<
      UserToolPermission | undefined
    >(TOOL_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (isPrivilegedRole(user?.role)) {
      return true;
    }

    const permissions = normalizePermissions(user?.permissions);

    if (permissions.includes(requiredPermission)) {
      return true;
    }

    throw new ForbiddenException('Usuario sem permissao para esta ferramenta.');
  }
}
