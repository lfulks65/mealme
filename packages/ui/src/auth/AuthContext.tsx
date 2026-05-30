import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  resetPasswordState: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  // Check stored session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // In a real app, check secure storage for an existing session
        // For now, just set loading to false
        setIsLoading(false);
      } catch {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In a real app, this would call your auth API
      if (email && password) {
        setUser({
          id: '1',
          name: email.split('@')[0],
          email,
        });
      } else {
        throw new Error('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (name && email && password) {
        setUser({
          id: '1',
          name,
          email,
        });
      } else {
        throw new Error('All fields are required');
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!email) {
        throw new Error('Please enter your email');
      }
      // In a real app, this would send a reset email
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would use Expo AuthSession or NextAuth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUser({
        id: 'google-1',
        name: 'Google User',
        email: 'user@gmail.com',
      });
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would use Expo AppleAuthentication or NextAuth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUser({
        id: 'apple-1',
        name: 'Apple User',
        email: 'user@icloud.com',
      });
    } catch (err: any) {
      setError(err.message || 'Apple sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPasswordState = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        signInWithGoogle,
        signInWithApple,
        resetPasswordState,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
