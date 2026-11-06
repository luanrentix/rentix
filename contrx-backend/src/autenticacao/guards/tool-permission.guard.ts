import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserToolPermission } from '../dto/criar-usuario-empresa.dto';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.type';
import {
  TOOL_PERMISSION_KEY,
  TOOL_ACTION_KEY,
} from '../decorators/tool-permission.decorator';
import { assertAccess } from '../access-policy';

type RequestWithUser = {
  user?: UsuarioAutenticado;
};

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

    const action = this.reflector.getAllAndOverride<string>(TOOL_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    assertAccess(user, requiredPermission, action || 'view');
    return true;
  }
}
