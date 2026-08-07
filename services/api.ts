function isLocalApiUrl(value: string) {
  try {
    const url = new URL(value);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return value.includes('localhost') || value.includes('127.0.0.1');
  }
}

function getApiBaseUrl() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const productionApiUrl = 'https://api.contrx.com.br';

  if (isBrowser) {
    const currentHost = window.location.hostname;
    const currentProtocol = window.location.protocol;
    const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';

    if (configuredApiUrl) {
      const cleanConfig = configuredApiUrl.replace(/\/$/, '');
      if (isLocalApiUrl(cleanConfig)) {
        try {
          const parsed = new URL(cleanConfig);
          const port = parsed.port ? `:${parsed.port}` : ':3001';
          return `${currentProtocol}//${currentHost}${port}`;
        } catch {
          return `${currentProtocol}//${currentHost}:3001`;
        }
      }
      return cleanConfig;
    }

    if (isLocalhost || currentHost.startsWith('192.168.') || currentHost.startsWith('10.')) {
      return `${currentProtocol}//${currentHost}:3001`;
    }
  }

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  return productionApiUrl;
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const LEGACY_STORAGE_PREFIX = ['ren', 'tix'].join('');
const SESSION_REPLACED_EVENT = 'contrx-session-replaced';
const SESSION_EXPIRED_NOTICE =
  'Sua sessao expirou ou nao e mais valida. Acesse novamente para continuar.';
const SESSION_REPLACED_NOTICE =
  'Sua sessão foi encerrada porque este usuário entrou no Contrx em outro dispositivo. Para proteger seus dados, mantemos apenas um acesso ativo por usuário.';
const READ_RETRY_DELAY_MS = 600;
const READ_RETRY_ATTEMPTS = 5;

export class SessionReplacedError extends Error {
  constructor(message = SESSION_REPLACED_NOTICE) {
    super(message);
    this.name = 'SessionReplacedError';
  }
}

export function isSessionReplacedError(error: unknown) {
  return error instanceof SessionReplacedError;
}

function normalizeMessage(message: string) {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isSessionReplacedMessage(message: string) {
  const normalizedMessage = normalizeMessage(message);

  return (
    normalizedMessage.includes('outro dispositivo') ||
    normalizedMessage.includes('sessao encerrada') ||
    normalizedMessage.includes('session replaced')
  );
}

function dispatchSessionReplaced(message = SESSION_REPLACED_NOTICE) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(SESSION_REPLACED_EVENT, {
      detail: {
        message,
      },
    }),
  );
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('contrx_token') ||
    localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_token`)
  );
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithReadRetry(
  url: string,
  init: RequestInit,
  attempts = READ_RETRY_ATTEMPTS,
) {
  const method = String(init.method || 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;

      if (!canRetry || attempt === attempts - 1) {
        throw error;
      }

      await delay(READ_RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

export async function apiFetch<TResponse>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error(
      'Backend nao configurado. Configure NEXT_PUBLIC_API_URL com a URL publica da API do Contrx.',
    );
  }

  const token = getStoredToken();

  const headers = new Headers(options.headers);

  // Não sobrescrever Content-Type se for FormData
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  } else {
    // Para FormData, o navegador precisa definir o Content-Type automaticamente com o boundary correto.
    headers.delete('Content-Type');
  }

  if (options.auth !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetchWithReadRetry(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Nao foi possivel conectar a API em ${apiBaseUrl}. Verifique se o backend esta online e acessivel.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      errorBody?.message || `Request failed with status ${response.status}`;

    if (response.status === 401 && options.auth !== false && token) {
      const sessionMessage = isSessionReplacedMessage(String(errorMessage))
        ? SESSION_REPLACED_NOTICE
        : SESSION_EXPIRED_NOTICE;

      dispatchSessionReplaced(sessionMessage);
      throw new SessionReplacedError(sessionMessage);
    }

    if (response.status >= 500 && !endpoint.includes('/admin/errors')) {
      import('./system-logs.service').then(({ reportSystemErrorLog }) => {
        reportSystemErrorLog({
          level: 'CRITICAL',
          module: endpoint.split('/')[1]?.toUpperCase() || 'API',
          message: String(errorMessage),
          httpMethod: options.method || 'GET',
          endpoint,
        }).catch(() => null);
      }).catch(() => null);
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<TResponse>;
}

export function getMediaUrl(urlInput: any): string {
  if (!urlInput) return '';
  let url =
    typeof urlInput === 'string'
      ? urlInput
      : urlInput.url || urlInput.filePath || urlInput.path || urlInput.fileUrl || urlInput.photo || urlInput.src || '';

  if (!url || typeof url !== 'string') return '';

  url = url.replace(/\\/g, '/');

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const baseUrl = getApiBaseUrl();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(baseUrl, { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export { getApiBaseUrl };

export const api = {
  get: async (endpoint: string) => {
    const data = await apiFetch(endpoint, { method: 'GET' });
    return { data };
  },
  post: async (endpoint: string, data: any, options: any = {}) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    const reqOptions: any = { 
      method: 'POST', 
      headers: options.headers || {},
      body: isFormData ? data : JSON.stringify(data)
    };
    const responseData = await apiFetch(endpoint, reqOptions);
    return { data: responseData };
  }
};
