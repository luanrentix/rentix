import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RequestLike = {
  ip?: string;
  ips?: string[];
  body?: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  route?: {
    path?: string;
  };
  originalUrl?: string;
};

const buckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 12;

function getHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getClientIp(request: RequestLike) {
  const forwardedFor = getHeaderValue(request.headers?.['x-forwarded-for']);
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();

  return forwardedIp || request.ips?.[0] || request.ip || 'unknown';
}

function getNormalizedBodyEmail(request: RequestLike) {
  const email = request.body?.email;

  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const now = Date.now();
    const routeKey = request.route?.path || request.originalUrl || 'unknown';
    const emailKey = getNormalizedBodyEmail(request);
    const key = `${getClientIp(request)}:${routeKey}:${emailKey}`;
    const currentBucket = buckets.get(key);

    cleanupExpiredBuckets(now);

    if (!currentBucket || currentBucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
      return true;
    }

    currentBucket.count += 1;

    if (currentBucket.count > MAX_REQUESTS) {
      throw new HttpException(
        'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
