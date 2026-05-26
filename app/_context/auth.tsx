import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '';
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '';
const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ?? '';
const AUTH0_CONNECTION = 'Username-Password-Authentication';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

const ACCESS_TOKEN_KEY = 'auth0_access_token';

interface AuthContextValue {
  accessToken: string | null;
  userID: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string, email?: string) => Promise<string>;
  logout: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue>({
  accessToken: null,
  userID: null,
  isLoading: true,
  login: async () => {},
  signup: async () => '',
  logout: async () => {},
  apiFetch: () => Promise.reject(new Error('Not authenticated')),
});

function parseJwtSub(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.sub ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY).then((stored) => {
      if (stored) {
        setAccessToken(stored);
        setUserID(parseJwtSub(stored));
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        username,
        password,
        client_id: AUTH0_CLIENT_ID,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
        connection: AUTH0_CONNECTION,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error_description ?? 'Login failed');
    }
    const data = await res.json();
    const token = data.access_token;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
    setUserID(parseJwtSub(token));
  }, []);

  const signup = useCallback(async (username: string, password: string, email?: string): Promise<string> => {
    const res = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        email: email ?? `${username.toLowerCase()}@users.openworkout.app`,
        username,
        password,
        connection: AUTH0_CONNECTION,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      if (err.code === 'invalid_signup') {
        throw new Error('USERNAME_TAKEN');
      }
      const description = typeof err.description === 'string'
        ? err.description
        : err.message ?? 'Signup failed';
      throw new Error(description);
    }
    const loginRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'password',
        username,
        password,
        client_id: AUTH0_CLIENT_ID,
        audience: AUTH0_AUDIENCE,
        scope: 'openid profile email',
        connection: AUTH0_CONNECTION,
      }),
    });
    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(err.error_description ?? 'Login failed');
    }
    const data = await loginRes.json();
    const token = data.access_token;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    setAccessToken(token);
    setUserID(parseJwtSub(token));
    return token;
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setUserID(null);
  }, []);

  const apiFetch = useCallback((path: string, options: RequestInit = {}): Promise<Response> => {
    const { headers: extraHeaders, ...rest } = options;
    return fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders as Record<string, string>),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ accessToken, userID, isLoading, login, signup, logout, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
