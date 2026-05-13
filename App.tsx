import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AppDetail from './components/AppDetail';
import LoginPage from './components/LoginPage';
import HelpPage from './components/HelpPage';
import PrivacyPage from './components/PrivacyPage';
import { Loader2 } from 'lucide-react';
import { devLog } from './utils/devLog';

// 인증이 필요한 라우트 보호 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  devLog('[ProtectedRoute] 인증 상태 확인:', { user: user?.email || 'null', loading });

  if (loading) {
    devLog('[ProtectedRoute] 로딩 중...');
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
    devLog('[ProtectedRoute] 사용자 없음, 로그인 페이지로 리다이렉트');
    return <Navigate to="/login" replace />;
  }

  devLog('[ProtectedRoute] 인증된 사용자, 콘텐츠 표시');
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  devLog('[AppRoutes] 인증 상태:', { user: user?.email || 'null', loading, path: window.location.hash });

  if (loading) {
    devLog('[AppRoutes] 로딩 중...');
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
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
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
  devLog('[App] 컴포넌트 렌더링 시작');
  
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
        table.report-table-separators > thead > tr > th,
        table.report-table-separators > tbody > tr > td {
          box-sizing: border-box !important;
          vertical-align: middle !important;
          padding: 10px 12px !important;
        }
        table.report-table-separators > thead > tr > th:not(:last-child),
        table.report-table-separators > tbody > tr > td:not(:last-child) {
          padding-right: 14px !important;
        }
        table.report-table-separators .report-col-tight {
          padding-left: 6px !important;
          padding-right: 6px !important;
        }
        table.report-table-separators .report-col-center {
          text-align: center !important;
        }
        table.report-table-separators > tbody > tr > td.report-col-no-num {
          text-align: right !important;
        }
        table.report-table-separators > thead {
          background-color: #c0c0c0 !important;
        }
        table.report-table-separators > thead > tr > th {
          text-align: center !important;
          background-color: #c0c0c0 !important;
        }
        table.report-table-separators > tbody > tr > td:not(.report-col-center):not(.report-col-actions):not(.report-col-no-num) {
          text-align: left !important;
        }
        table.report-table-separators > tbody > tr > td.report-col-actions {
          text-align: right !important;
        }
        table.report-table-separators > tbody > tr > td[colspan] {
          text-align: center !important;
        }

        /* 통합 검색에서 선택된 행 강조 */
        @keyframes rowHighlightPulse {
          0%   { background-color: #fcd34d; }
          50%  { background-color: #fde68a; }
          100% { background-color: #fef3c7; }
        }
        .row-highlighted,
        .row-highlighted > td,
        table.report-table-separators > tbody > tr.row-highlighted > td {
          background-color: #fef3c7 !important;
        }
        .row-highlighted {
          box-shadow: inset 4px 0 0 0 #d97706, inset 0 -2px 0 0 #f59e0b, inset 0 2px 0 0 #f59e0b !important;
          animation: rowHighlightPulse 0.55s ease-out 2;
          outline: none !important;
          scroll-margin-top: 96px;
          scroll-margin-bottom: 24px;
        }
        .row-highlighted:focus,
        .row-highlighted:focus-visible {
          outline: none !important;
        }
      `}</style>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;