import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../types/usuario-autenticado.type';

type RequestWithUser = {
  user?: UsuarioAutenticado;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new UnauthorizedException('Usuario nao autenticado.');
    }

    return request.user;
  },
);
