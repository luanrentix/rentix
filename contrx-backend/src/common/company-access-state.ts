import type { SubscriptionStatus } from '@prisma/client';

export type CompanyAccessStateSource = {
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt?: Date | null;
  trialExtendedUntil?: Date | null;
  subscriptionEndsAt?: Date | null;
};

export type CompanyAccessBlockReason =
  | 'COMPANY_INACTIVE'
  | 'TRIAL_EXPIRED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_SUSPENDED'
  | 'SUBSCRIPTION_CANCELED';

export type CompanyAccessState = {
  canAccess: boolean;
  status: SubscriptionStatus;
  reason: string;
  blockReason: CompanyAccessBlockReason | null;
  endsAt: Date | null;
  daysRemaining: number | null;
};

function getAccessEndsAt(company: CompanyAccessStateSource) {
  if (company.subscriptionStatus === 'ACTIVE') {
    return company.subscriptionEndsAt || null;
  }

  if (company.subscriptionStatus === 'TRIAL') {
    return company.trialExtendedUntil || company.trialEndsAt || null;
  }

  return (
    company.subscriptionEndsAt ||
    company.trialExtendedUntil ||
    company.trialEndsAt ||
    null
  );
}

function getDaysRemaining(endsAt: Date | null, now: Date) {
  if (!endsAt) return null;

  return Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000);
}

export function getCompanyAccessState(
  company: CompanyAccessStateSource,
  now = new Date(),
): CompanyAccessState {
  const endsAt = getAccessEndsAt(company);
  const daysRemaining = getDaysRemaining(endsAt, now);
  const isExpired = Boolean(endsAt && endsAt.getTime() < now.getTime());

  if (!company.isActive) {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Empresa inativa.',
      blockReason: 'COMPANY_INACTIVE',
      endsAt,
      daysRemaining,
    };
  }

  if (company.subscriptionStatus === 'SUSPENDED') {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Assinatura suspensa.',
      blockReason: 'SUBSCRIPTION_SUSPENDED',
      endsAt,
      daysRemaining,
    };
  }

  if (company.subscriptionStatus === 'CANCELED') {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Assinatura cancelada.',
      blockReason: 'SUBSCRIPTION_CANCELED',
      endsAt,
      daysRemaining,
    };
  }

  if (company.subscriptionStatus === 'EXPIRED') {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Acesso comercial vencido.',
      blockReason:
        endsAt && company.subscriptionEndsAt === endsAt
          ? 'SUBSCRIPTION_EXPIRED'
          : 'TRIAL_EXPIRED',
      endsAt,
      daysRemaining,
    };
  }

  if (company.subscriptionStatus === 'ACTIVE' && isExpired) {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Assinatura vencida.',
      blockReason: 'SUBSCRIPTION_EXPIRED',
      endsAt,
      daysRemaining,
    };
  }

  if (company.subscriptionStatus === 'TRIAL' && isExpired) {
    return {
      canAccess: false,
      status: company.subscriptionStatus,
      reason: 'Periodo de teste vencido.',
      blockReason: 'TRIAL_EXPIRED',
      endsAt,
      daysRemaining,
    };
  }

  return {
    canAccess: true,
    status: company.subscriptionStatus,
    reason: 'Acesso liberado.',
    blockReason: null,
    endsAt,
    daysRemaining,
  };
}
