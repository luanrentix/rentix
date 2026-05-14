import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '../types/usuario-autenticado.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado => {
    const request = context.switchToHttp().getRequest();

    return request.user;
  },
);
