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

function getClientIp(request: RequestLike) {
  // Express resolves the address through the configured trusted proxy chain.
  // Never trust a client-supplied X-Forwarded-For prefix directly.
  return request.ip || 'unknown';
}

function getNormalizedBodyEmail(request: RequestLike) {
  const text = (value: unknown) =>
    typeof value === 'string' ? value.trim().toLowerCase().slice(0, 254) : '';
  return (
    text(request.body?.email) ||
    `${text(request.body?.companyCode)}:${text(request.body?.username)}`
  );
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
  protected readonly maxRequests: number = MAX_REQUESTS;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const now = Date.now();
    cleanupExpiredBuckets(now);
    // Bound memory consumption if clients rotate identities or URLs.
    if (buckets.size >= 20000) {
      throw new HttpException(
        'Muitas tentativas. Aguarde e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const routeKey = request.route?.path || request.originalUrl || 'unknown';
    const emailKey = getNormalizedBodyEmail(request);
    const ipKey = 'ip:' + getClientIp(request) + ':' + routeKey;
    const ipBucket = buckets.get(ipKey);
    if (!ipBucket || ipBucket.resetAt <= now)
      buckets.set(ipKey, { count: 1, resetAt: now + WINDOW_MS });
    else if (++ipBucket.count > 120)
      throw new HttpException(
        'Muitas tentativas. Aguarde e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
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

    if (currentBucket.count > this.maxRequests) {
      throw new HttpException(
        'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

@Injectable()
export class PublicShareRateLimitGuard extends RateLimitGuard {
  protected readonly maxRequests = 120;
}
