import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInWithGoogle, logout } from '../services/authService';
import { devLog } from '../utils/devLog';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devLog('[AuthContext] 컴포넌트 마운트됨');
    devLog('[AuthContext] 인증 상태 리스너 설정 시작');
    
    try {
      const unsubscribe = onAuthStateChange((user) => {
        devLog('[AuthContext] 인증 상태 변경:', user?.email || '로그아웃', user ? '로그인됨' : '로그아웃됨');
        setUser(user);
        setLoading(false);
      });

      devLog('[AuthContext] 인증 상태 리스너 설정 완료');

      return () => {
        devLog('[AuthContext] 인증 상태 리스너 해제');
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error: any) {
      console.error('[AuthContext] 인증 상태 리스너 설정 실패:', error);
      console.error('[AuthContext] 에러 상세:', error.message, error.stack);
      setLoading(false);
    }
  }, []);

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('[AuthContext] 로그인 실패:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch (error: any) {
      console.error('[AuthContext] 로그아웃 실패:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
