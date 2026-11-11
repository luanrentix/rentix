import { ForbiddenException } from '@nestjs/common';

export function validateCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
  callback: (error: Error | null, allow?: boolean) => void,
) {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new ForbiddenException('Origem não autorizada por CORS.'), false);
}
