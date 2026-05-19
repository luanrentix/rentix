function getApiBaseUrl() {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      return 'http://localhost:3001';
    }
  }

  return '';
}

const API_BASE_URL = getApiBaseUrl();

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const LEGACY_STORAGE_PREFIX = ['ren', 'tix'].join('');
const SESSION_REPLACED_EVENT = 'contrx-session-replaced';
const SESSION_REPLACED_NOTICE =
  'Sua sessão foi encerrada porque este usuário acessou o sistema em outro dispositivo.';

function getStoredToken() {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('contrx_token') ||
    localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_token`)
  );
}

export async function apiFetch<TResponse>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      'Backend nao configurado. Configure NEXT_PUBLIC_API_URL com a URL publica da API do Contrx no deploy do frontend.',
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
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new Error(
      `Nao foi possivel conectar a API em ${API_BASE_URL}. Verifique se o backend esta online e acessivel.`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      errorBody?.message || `Request failed with status ${response.status}`;

    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      String(errorMessage).toLowerCase().includes('outro dispositivo')
    ) {
      window.dispatchEvent(
        new CustomEvent(SESSION_REPLACED_EVENT, {
          detail: {
            message: SESSION_REPLACED_NOTICE,
          },
        }),
      );
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<TResponse>;
}

export { API_BASE_URL };
