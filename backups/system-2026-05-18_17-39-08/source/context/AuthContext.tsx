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
import {
  removeCompanyStorageItem,
  setCompanyStorageItem,
} from '@/services/company-storage';

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

const TOKEN_STORAGE_KEY = 'contrx_token';
const USER_STORAGE_KEY = 'contrx_user';
const LEGACY_STORAGE_PREFIX = ['ren', 'tix'].join('');
const LEGACY_TOKEN_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}_token`;
const LEGACY_USER_STORAGE_KEY = `${LEGACY_STORAGE_PREFIX}_user`;
const LOCAL_BACKUP_TOKEN = 'contrx-local-backup-token';
const AUTH_NOTICE_STORAGE_KEY = 'contrx_auth_notice';
const SESSION_REPLACED_EVENT = 'contrx-session-replaced';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const storedToken =
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_STORAGE_KEY);
    const storedUser =
      localStorage.getItem(USER_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_USER_STORAGE_KEY);

    if (storedToken === LOCAL_BACKUP_TOKEN) {
      clearStoredAuth();
      setIsLoading(false);
      return;
    }

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
        localStorage.setItem(TOKEN_STORAGE_KEY, storedToken);
        localStorage.setItem(USER_STORAGE_KEY, storedUser);
      } catch {
        clearStoredAuth();
      }
    }

    setIsLoading(false);
  }, [clearStoredAuth]);

  useEffect(() => {
    function handleSessionReplaced(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message =
        detail?.message ||
        'Sua sessão foi encerrada porque este usuário acessou o sistema em outro dispositivo.';

      localStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
      removeCompanyStorageItem(user?.companyId, 'contrx_onboarding_pending');
      clearStoredAuth();
      setToken(null);
      setUser(null);
      router.push('/');
    }

    window.addEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced);

    return () => {
      window.removeEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced);
    };
  }, [clearStoredAuth, router, user?.companyId]);

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
    setCompanyStorageItem(
      response.user.companyId,
      'contrx_onboarding_pending',
      'true',
    );

    setToken(response.accessToken);
    setUser(response.user);

    router.push('/configuracoes?onboarding=1');
  }, [router]);

  const logout = useCallback(() => {
    clearStoredAuth();
    removeCompanyStorageItem(user?.companyId, 'contrx_onboarding_pending');

    setToken(null);
    setUser(null);

    router.push('/');
  }, [clearStoredAuth, router, user?.companyId]);

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
