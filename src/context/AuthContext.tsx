import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  buildSessionFromToken,
  getTokenFromResponse,
  postAuthRequest,
  type PendingSignup,
  type Session,
} from '../lib/auth';

interface AuthContextValue {
  session: Session | null;
  pendingSignup: PendingSignup | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  startSignUp: (fullName: string, email: string, password: string) => Promise<void>;
  resendOtp: () => Promise<void>;
  verifyOtpAndRegister: (code: string) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await postAuthRequest('/login', { email, password });
      const token = getTokenFromResponse(response);
      if (!token) throw new Error('Token not received from server');
      const nextSession = buildSessionFromToken(token, { email });
      if (!nextSession) throw new Error('Invalid token payload');
      setSession(nextSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startSignUp = useCallback(async (fullName: string, email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await postAuthRequest('/sendOtp', { email });
      setPendingSignup({ fullName, email, password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async () => {
    if (!pendingSignup) return;
    setError(null);
    try {
      await postAuthRequest('/sendOtp', { email: pendingSignup.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend OTP');
      throw err;
    }
  }, [pendingSignup]);

  const verifyOtpAndRegister = useCallback(
    async (code: string) => {
      if (!pendingSignup) {
        setError('Signup session expired');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await postAuthRequest('/verifyOtp', { email: pendingSignup.email, otp: code });
        const registerResponse = await postAuthRequest('/signUp', {
          fullName: pendingSignup.fullName,
          email: pendingSignup.email,
          password: pendingSignup.password,
          role: 'user',
        });
        const token = getTokenFromResponse(registerResponse);
        if (!token) throw new Error('Registration succeeded but no token returned');
        const nextSession = buildSessionFromToken(token, {
          email: pendingSignup.email,
          name: pendingSignup.fullName,
        });
        if (!nextSession) throw new Error('Invalid token payload');
        setSession(nextSession);
        setPendingSignup(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OTP verification failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pendingSignup],
  );

  const signOut = useCallback(() => {
    setSession(null);
    setPendingSignup(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ session, pendingSignup, loading, error, signIn, startSignUp, resendOtp, verifyOtpAndRegister, signOut, clearError }),
    [session, pendingSignup, loading, error, signIn, startSignUp, resendOtp, verifyOtpAndRegister, signOut, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
