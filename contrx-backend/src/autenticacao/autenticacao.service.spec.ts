import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ServiceUnavailableException } from '@nestjs/common';
import { AutenticacaoService } from './autenticacao.service';
import { PrismaService } from '../prisma/prisma.service';

type PasswordResetUpdateArgs = {
  where: {
    id: string;
  };
  data: {
    passwordResetTokenHash: unknown;
    passwordResetExpiresAt: unknown;
  };
};

type PasswordResetUserLookup = {
  id: string;
  isActive: boolean;
};

describe('AutenticacaoService', () => {
  let service: AutenticacaoService;
  let prisma: {
    user: {
      findUnique: jest.Mock<Promise<PasswordResetUserLookup | null>, [unknown]>;
      update: jest.Mock<Promise<unknown>, [PasswordResetUpdateArgs]>;
    };
  };
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };
    delete process.env.CONTRX_EXPOSE_PASSWORD_RESET_TOKEN;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    prisma = {
      user: {
        findUnique: jest.fn<
          Promise<PasswordResetUserLookup | null>,
          [unknown]
        >(),
        update: jest.fn<Promise<unknown>, [PasswordResetUpdateArgs]>(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutenticacaoService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AutenticacaoService>(AutenticacaoService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not expose password reset tokens by default outside production', async () => {
    await expect(
      service.requestPasswordReset({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('only exposes password reset tokens when explicitly enabled', async () => {
    process.env.CONTRX_EXPOSE_PASSWORD_RESET_TOKEN = 'true';
    process.env.CONTRX_FRONTEND_URL = 'http://localhost:3000';
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({});

    const response = await service.requestPasswordReset({
      email: 'USER@example.com',
    });

    expect(response.resetToken).toEqual(expect.any(String));
    expect(response.resetUrl).toContain('/login?resetToken=');
    expect(response.resetUrl).toContain('email=user%40example.com');

    const updateCall = prisma.user.update.mock.calls[0]?.[0] as
      | PasswordResetUpdateArgs
      | undefined;

    expect(updateCall?.where).toEqual({ id: 'user-1' });
    expect(typeof updateCall?.data.passwordResetTokenHash).toBe('string');
    expect(updateCall?.data.passwordResetExpiresAt).toBeInstanceOf(Date);
  });
});
