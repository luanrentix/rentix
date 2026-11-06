import type { ExecutionContext } from '@nestjs/common';
import { PublicShareRateLimitGuard, RateLimitGuard } from './rate-limit.guard';

function context(
  ip: string,
  headers: Record<string, string> = {},
  body: Record<string, unknown> = {},
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        headers,
        body,
        route: { path: '/fixture-login' },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('Rate limits behind a trusted reverse proxy', () => {
  it('does not allow spoofing X-Forwarded-For to reset login counters', () => {
    const guard = new RateLimitGuard();
    for (let i = 0; i < 12; i++)
      expect(
        guard.canActivate(
          context(
            '198.51.100.10',
            { 'x-forwarded-for': `192.0.2.${i}` },
            { email: 'fixture@example.invalid' },
          ),
        ),
      ).toBe(true);
    expect(() =>
      guard.canActivate(
        context(
          '198.51.100.10',
          { 'x-forwarded-for': '192.0.2.99' },
          { email: 'fixture@example.invalid' },
        ),
      ),
    ).toThrow();
    expect(
      guard.canActivate(
        context('198.51.100.11', {}, { email: 'fixture@example.invalid' }),
      ),
    ).toBe(true);
  });
  it('also limits total attempts when identities are rotated', () => {
    const guard = new RateLimitGuard();
    for (let i = 0; i < 120; i++)
      expect(
        guard.canActivate(
          context(
            '198.51.100.12',
            {},
            { email: `fixture-${i}@example.invalid` },
          ),
        ),
      ).toBe(true);
    expect(() =>
      guard.canActivate(
        context(
          '198.51.100.12',
          {},
          { email: 'fixture-extra@example.invalid' },
        ),
      ),
    ).toThrow();
  });
  it('handles malformed bodies without coercing objects into identity keys', () => {
    expect(
      new RateLimitGuard().canActivate(
        context(
          '198.51.100.13',
          {},
          { companyCode: { unknown: 1 }, username: ['test'] },
        ),
      ),
    ).toBe(true);
  });
  it('allows normal public-link use while bounding repeated reads', () => {
    const guard = new PublicShareRateLimitGuard();
    for (let i = 0; i < 120; i++)
      expect(guard.canActivate(context('198.51.100.14'))).toBe(true);
    expect(() => guard.canActivate(context('198.51.100.14'))).toThrow();
  });
});
