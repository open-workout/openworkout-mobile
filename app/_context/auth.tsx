import React, { createContext, useContext } from 'react';

interface AuthContextValue {
  userID: string;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  userID: 'local_user',
  isLoading: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ userID: 'local_user', isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
