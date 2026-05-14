const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not configured.');
}

type RequestOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<TResponse>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('rentix_token') : null;

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
      `Unable to connect to backend API at ${API_BASE_URL}. Verify that the backend server is running.`,
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
