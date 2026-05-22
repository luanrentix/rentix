const PUBLIC_API_BASE_URL = 'https://contrx.onrender.com';

function getApiBaseUrl() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  function isLocalApiUrl(value: string) {
    try {
      const url = new URL(value);

      return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    } catch {
      return value.includes('localhost') || value.includes('127.0.0.1');
    }
  }

  if (configuredApiUrl) {
    if (isLocalhost || !isLocalApiUrl(configuredApiUrl)) {
      return configuredApiUrl.replace(/\/$/, '');
    }
  }

  if (isLocalhost) {
    return 'http://localhost:3001';
  }

  if (isBrowser) {
    return PUBLIC_API_BASE_URL;
  }

  return '';
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
      'Backend nao configurado. Configure NEXT_PUBLIC_API_URL na Vercel com a URL publica da API do Contrx no Render.',
    );
  }

  const token = getStoredToken();

  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

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

    throw new Error(errorMessage);
  }

  return response.json() as Promise<TResponse>;
}

export { getApiBaseUrl };
