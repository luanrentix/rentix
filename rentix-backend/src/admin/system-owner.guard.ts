import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Injectable()
export class SystemOwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user as UsuarioAutenticado | undefined;

    if (user?.role !== 'SYSTEM_OWNER') {
      throw new ForbiddenException('Acesso restrito ao dono do sistema.');
    }

    return true;
  }
}
