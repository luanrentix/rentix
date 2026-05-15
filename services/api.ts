const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '');

type RequestOptions = RequestInit & {
  auth?: boolean;
};

const LEGACY_STORAGE_PREFIX = ['ren', 'tix'].join('');

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
      'Backend nao configurado. Configure NEXT_PUBLIC_API_URL com a URL publica da API para usar o Contrx.',
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

    throw new Error(
      errorBody?.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json() as Promise<TResponse>;
}

export { API_BASE_URL };
