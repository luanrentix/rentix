import { ArgumentsHost, ForbiddenException } from '@nestjs/common';
import { validateCorsOrigin } from './cors-origin';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { PrismaService } from '../prisma/prisma.service';

describe('CORS origin rejection', () => {
  const allowed = ['https://contrx.com.br'];
  it.each([undefined, 'https://contrx.com.br'])(
    'accepts allowed origin %s',
    (origin) => {
      const callback = jest.fn();
      validateCorsOrigin(origin, allowed, callback);
      expect(callback).toHaveBeenCalledWith(null, true);
    },
  );
  it.each([
    'https://api.contrx.com.br',
    'https://contrx.com.br.attacker.test',
    'null',
  ])('rejects unauthorized origin %s with 403', (origin) => {
    const callback = jest.fn();
    validateCorsOrigin(origin, allowed, callback);
    const [error, allow] = callback.mock.calls[0];
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getStatus()).toBe(403);
    expect(allow).toBe(false);
  });
  it('does not persist a CORS denial as a critical internal failure', async () => {
    const create = jest.fn();
    const prisma = { systemErrorLog: { create } } as unknown as PrismaService;
    const response = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          originalUrl: '/graphql',
          method: 'POST',
          headers: {},
          body: { query: '{ __schema { types { name } } }' },
        }),
      }),
    } as unknown as ArgumentsHost;
    const callback = jest.fn();
    validateCorsOrigin('https://api.contrx.com.br', allowed, callback);
    await new AllExceptionsFilter(prisma).catch(
      callback.mock.calls[0][0],
      host,
    );
    expect(response.status).toHaveBeenCalledWith(403);
    expect(create).not.toHaveBeenCalled();
  });
});
