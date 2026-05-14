'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthUser,
  CreateAccountRequest,
  createAccountRequest,
  loginRequest,
} from '@/services/auth';

type AuthContextData = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  createAccount: (data: CreateAccountRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextData | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'rentix_token';
const USER_STORAGE_KEY = 'rentix_user';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({
      email,
      password,
    });

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));

    setToken(response.accessToken);
    setUser(response.user);

    router.push('/dashboard');
  }, [router]);

  const createAccount = useCallback(async (data: CreateAccountRequest) => {
    const response = await createAccountRequest(data);

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.setItem('rentix_onboarding_pending', 'true');

    setToken(response.accessToken);
    setUser(response.user);

    router.push('/configuracoes?onboarding=1');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);

    setToken(null);
    setUser(null);

    router.push('/');
  }, [router]);

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      createAccount,
      logout,
    }),
    [user, token, isLoading, login, createAccount, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
