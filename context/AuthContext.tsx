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
  verifySessionRequest,
} from '@/services/auth';
import { isSessionReplacedError } from '@/services/api';
import {
  getCompanyStorageItem,
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
const SESSION_REPLACED_MESSAGE =
  'Sua sessão foi encerrada porque este usuário entrou no Contrx em outro dispositivo. Para proteger seus dados, mantemos apenas um acesso ativo por usuário.';

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
        await verifySessionRequest();
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
    const sessionCheckInterval = window.setInterval(verifyCurrentSession, 60_000);

    return () => {
      window.removeEventListener('focus', verifyCurrentSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(sessionCheckInterval);
    };
  }, [token, user]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest({
      email,
      password,
    });

    localStorage.setItem(TOKEN_STORAGE_KEY, response.accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    if (response.user.subscriptionStatus === 'TRIAL') {
      localStorage.setItem('contrx_show_trial_login_notice', 'true');
    }

    isHandlingSessionReplacementRef.current = false;
    setToken(response.accessToken);
    setUser(response.user);

    const hasPendingOnboarding = getCompanyStorageItem(
      response.user.companyId,
      'contrx_onboarding_pending',
    ) === 'true';

    if (hasPendingOnboarding) {
      router.push('/configuracoes?onboarding=1');
    } else {
      router.push('/dashboard');
    }
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

    isHandlingSessionReplacementRef.current = false;
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
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
