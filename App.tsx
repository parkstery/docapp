import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AppDetail from './components/AppDetail';
import LoginPage from './components/LoginPage';
import HelpPage from './components/HelpPage';
import PrivacyPage from './components/PrivacyPage';
import { Loader2 } from 'lucide-react';

// 인증이 필요한 라우트 보호 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('[ProtectedRoute] 인증 상태 확인:', { user: user?.email || 'null', loading });

  if (loading) {
    console.log('[ProtectedRoute] 로딩 중...');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600" size={32} />
          <p className="mt-4 text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] 사용자 없음, 로그인 페이지로 리다이렉트');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] 인증된 사용자, 콘텐츠 표시');
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  console.log('[AppRoutes] 인증 상태:', { user: user?.email || 'null', loading, path: window.location.hash });

  if (loading) {
    console.log('[AppRoutes] 로딩 중...');
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-indigo-600" size={32} />
          <p className="mt-4 text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/help" element={<HelpPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route 
        path="/login" 
        element={
          user ? (
            <>
              {console.log('[AppRoutes] 로그인 페이지 접근, 이미 로그인됨, 대시보드로 리다이렉트')}
              <Navigate to="/" replace />
            </>
          ) : (
            <>
              {console.log('[AppRoutes] 로그인 페이지 표시')}
              <LoginPage />
            </>
          )
        } 
      />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/app/:id" 
        element={
          <ProtectedRoute>
            <AppDetail />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  console.log('[App] 컴포넌트 렌더링 시작');
  
  return (
    <AuthProvider>
      <style>{`
        .report-table-separators {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .report-table-separators thead th:not(:last-child),
        .report-table-separators tbody td:not(:last-child) {
          border-right: 1px solid #000 !important;
        }
      `}</style>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;