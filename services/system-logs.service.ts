import { apiFetch } from './api';

export type SystemErrorLogLevel = 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';

export type SystemErrorLog = {
  id: string;
  companyId?: string | null;
  companyName?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  level: SystemErrorLogLevel;
  module: string;
  message: string;
  stackTrace?: string | null;
  httpMethod?: string | null;
  endpoint?: string | null;
  requestPayload?: any;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
};

export type SystemErrorLogFilter = {
  level?: string;
  module?: string;
  period?: '24h' | '7d' | '30d' | 'all';
  search?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

export type SystemErrorLogSummary = {
  total24h: number;
  totalCritical: number;
  affectedModulesCount: number;
  topAffectedModule?: string | null;
};

export type CreateSystemErrorLogDto = {
  companyId?: string;
  userId?: string;
  level?: SystemErrorLogLevel;
  module: string;
  message: string;
  stackTrace?: string;
  httpMethod?: string;
  endpoint?: string;
  requestPayload?: any;
  userAgent?: string;
  ipAddress?: string;
};

// Captura e grava um log de erro no sistema
export async function reportSystemErrorLog(
  dto: CreateSystemErrorLogDto,
): Promise<boolean> {
  try {
    const payload = {
      ...dto,
      level: dto.level || 'ERROR',
      userAgent: dto.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : undefined),
    };

    await apiFetch('/admin/errors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return true;
  } catch {
    // Silencioso para não interromper a navegação em caso de falha de envio de log
    return false;
  }
}

// Busca a lista paginada e filtrada de logs de erros para o painel admin
export async function getAdminSystemErrorLogs(
  filter: SystemErrorLogFilter = {},
): Promise<{ logs: SystemErrorLog[]; total: number; pages: number; summary: SystemErrorLogSummary }> {
  const queryParams = new URLSearchParams();

  if (filter.level && filter.level !== 'all') queryParams.set('level', filter.level);
  if (filter.module && filter.module !== 'all') queryParams.set('module', filter.module);
  if (filter.period) queryParams.set('period', filter.period);
  if (filter.search) queryParams.set('search', filter.search);
  if (filter.companyId) queryParams.set('companyId', filter.companyId);
  if (filter.page) queryParams.set('page', String(filter.page));
  if (filter.limit) queryParams.set('limit', String(filter.limit));

  const queryString = queryParams.toString();
  const endpoint = `/admin/errors${queryString ? `?${queryString}` : ''}`;

  try {
    return await apiFetch<{
      logs: SystemErrorLog[];
      total: number;
      pages: number;
      summary: SystemErrorLogSummary;
    }>(endpoint);
  } catch {
    // Fallback gracioso se a rota do backend ainda não estiver ativa ou retornar erro
    return {
      logs: [],
      total: 0,
      pages: 1,
      summary: {
        total24h: 0,
        totalCritical: 0,
        affectedModulesCount: 0,
        topAffectedModule: null,
      },
    };
  }
}

// Busca detalhes completos de um log específico
export async function getAdminSystemErrorLogById(id: string): Promise<SystemErrorLog | null> {
  try {
    return await apiFetch<SystemErrorLog>(`/admin/errors/${id}`);
  } catch {
    return null;
  }
}

// Expurga logs antigos do sistema
export async function purgeAdminSystemErrorLogs(daysOld = 30): Promise<boolean> {
  try {
    await apiFetch(`/admin/errors/purge`, {
      method: 'POST',
      body: JSON.stringify({ daysOld }),
    });

    return true;
  } catch {
    return false;
  }
}
