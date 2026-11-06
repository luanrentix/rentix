'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  AuthUser,
  CreateAccountRequest,
  createAccountRequest,
  loginRequest,
  loginCompanyUserRequest,
  logoutRequest,
  verifySessionRequest,
} from '@/services/auth';
import { isSessionReplacedError } from '@/services/api';
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
  loginCompanyUser: (companyCode: string, username: string, password: string) => Promise<void>;
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
const SESSION_REPLACED_MESSAGE =
  'Sua sessão foi encerrada. Entre novamente para continuar.';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isHandlingSessionReplacementRef = useRef(false);

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
      if (isHandlingSessionReplacementRef.current) return;
      isHandlingSessionReplacementRef.current = true;

      const detail = (event as CustomEvent<{ message?: string }>).detail;
      const message =
        detail?.message ||
        SESSION_REPLACED_MESSAGE;

      localStorage.setItem(AUTH_NOTICE_STORAGE_KEY, message);
      removeCompanyStorageItem(user?.companyId, 'contrx_onboarding_pending');
      clearStoredAuth();
      setToken(null);
      setUser(null);
      router.push('/login');
    }

    window.addEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced);

    return () => {
      window.removeEventListener(SESSION_REPLACED_EVENT, handleSessionReplaced);
    };
  }, [clearStoredAuth, router, user?.companyId]);

  useEffect(() => {
    if (!token || !user) return;

    let isCheckingSession = false;

    async function verifyCurrentSession() {
      if (isCheckingSession || document.visibilityState !== 'visible') return;

      try {
        isCheckingSession = true;
        const response = await verifySessionRequest();
        if (response.user && localStorage.getItem(TOKEN_STORAGE_KEY) === token) setUser(current => {
          if (!current) return current;
          const next = { ...current, ...response.user };
          if (JSON.stringify(next) === JSON.stringify(current)) return current;
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      } catch (error) {
        if (!isSessionReplacedError(error)) {
          console.warn('Não foi possível verificar a sessão atual.', error);
        }
      } finally {
        isCheckingSession = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void verifyCurrentSession();
      }
    }

    window.addEventListener('focus', verifyCurrentSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const sessionCheckInterval = window.setInterval(verifyCurrentSession, 15_000);

    return () => {
      window.removeEventListener('focus', verifyCurrentSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(sessionCheckInterval);
    };
  }, [token, user]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== TOKEN_STORAGE_KEY && event.key !== USER_STORAGE_KEY) return;
      const nextToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      const nextUser = localStorage.getItem(USER_STORAGE_KEY);
      try { setToken(nextToken); setUser(nextUser ? JSON.parse(nextUser) : null); } catch { clearStoredAuth(); setToken(null); setUser(null); }
      if (!nextToken) router.push('/login');
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [clearStoredAuth, router]);

  const finishLogin = useCallback(async (response: Awaited<ReturnType<typeof loginRequest>>) => {

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.removeItem('contrx_show_trial_login_notice');

    isHandlingSessionReplacementRef.current = false;
    setToken(response.accessToken);
    setUser(response.user);

    // Configuracao inicial pertence ao cadastro de empresa, nunca ao login.
    router.push('/inicio');
  }, [router]);

  const login = useCallback(async (email: string, password: string) => finishLogin(await loginRequest({ email, password })), [finishLogin]);
  const loginCompanyUser = useCallback(async (companyCode: string, username: string, password: string) => finishLogin(await loginCompanyUserRequest(companyCode, username, password)), [finishLogin]);

  const createAccount = useCallback(async (data: CreateAccountRequest) => {
    const response = await createAccountRequest(data);

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    setCompanyStorageItem(
      response.user.companyId,
      'contrx_onboarding_pending',
      'true',
    );

    isHandlingSessionReplacementRef.current = false;
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    void logoutRequest().catch(() => console.warn("Nao foi possivel confirmar o encerramento remoto da sessao."));
    clearStoredAuth();
    removeCompanyStorageItem(user?.companyId, 'contrx_onboarding_pending');

    isHandlingSessionReplacementRef.current = false;
    setToken(null);
    setUser(null);

    router.push('/login');
  }, [clearStoredAuth, router, user?.companyId]);

  const value = useMemo<AuthContextData>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      loginCompanyUser,
      createAccount,
      logout,
    }),
    [user, token, isLoading, login, loginCompanyUser, createAccount, logout],
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
