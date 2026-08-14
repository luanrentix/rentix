import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.extractMessage(exception.getResponse())
        : (exception as Error)?.message || 'Erro interno do servidor';

    const stack = (exception as Error)?.stack || null;
    const route = request.originalUrl || request.url || null;
    const method = request.method || null;
    const userAgent = (request.headers['user-agent'] as string) || null;
    const ipAddress =
      (request.headers['x-forwarded-for'] as string) || request.ip || null;

    const user = (request as any).user;
    const userEmail = user?.email || user?.usuario || null;
    const companyId = user?.companyId || user?.empresaId || null;

    let requestPayload: string | null = null;
    if (request.body && typeof request.body === 'object') {
      try {
        const body = { ...request.body };
        delete body.password;
        delete body.senha;
        delete body.token;
        delete body.accessToken;
        delete body.refreshToken;
        requestPayload = JSON.stringify(body).slice(0, 4000);
      } catch {
        requestPayload = null;
      }
    }

    const level = status >= 500 ? 'CRITICAL' : 'ERROR';

    try {
      await this.prisma.systemErrorLog.create({
        data: {
          companyId,
          level,
          message: String(message).slice(0, 2000),
          stack: stack ? String(stack).slice(0, 4000) : null,
          route,
          method,
          statusCode: status,
          userEmail,
          requestPayload,
          userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
          ipAddress: ipAddress ? String(ipAddress).slice(0, 100) : null,
        },
      });
    } catch (logErr) {
      this.logger.error(
        'Falha ao registrar log de erro no banco de dados:',
        logErr,
      );
    }

    if (status >= 500) {
      this.logger.error(
        `[${method || 'REQ'}] ${route || ''} - 500 Internal Error: ${message}`,
        stack,
      );
    }

    if (exception instanceof HttpException) {
      const resData = exception.getResponse();
      if (typeof resData === 'object' && resData !== null) {
        response.status(status).json(resData);
      } else {
        response.status(status).json({
          statusCode: status,
          message,
        });
      }
    } else {
      response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
      });
    }
  }

  private extractMessage(response: string | object): string {
    if (typeof response === 'string') return response;
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response
    ) {
      const msg = (response as any).message;
      return Array.isArray(msg) ? msg.join('; ') : String(msg);
    }
    return 'Erro na requisição';
  }
}
