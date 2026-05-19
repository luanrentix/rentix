import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.type';

type RequestWithUser = {
  user?: UsuarioAutenticado;
};

@Injectable()
export class CompanyAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    const allowedRoles = new Set([
      'ADMIN',
      'OWNER',
      'SYSTEM_OWNER',
      'DONO_SISTEMA',
    ]);

    if (!user?.role || !allowedRoles.has(user.role)) {
      throw new ForbiddenException('Acesso restrito ao administrador.');
    }

    return true;
  }
}
