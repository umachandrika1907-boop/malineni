import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiRequestError } from '../services/api';
import type { UserResponse } from '../types';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const currentUser = await api.auth.getMe();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setUser(null);
      if (err instanceof ApiRequestError && err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    api.auth
      .getMe()
      .then((currentUser) => {
        if (!ignore) {
          setUser(currentUser);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setUser(null);
          if (err instanceof ApiRequestError && err.status !== 401) {
            setError(err.message);
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.auth.login({ email, password });
      setUser(response.user);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    role = 'STUDENT',
    department?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      await api.auth.register({ email, password, role, department });
      const loginRes = await api.auth.login({ email, password });
      setUser(loginRes.user);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.auth.logout();
    } catch {
      // Ignore logout errors, still clear local user state
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshAuth,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
