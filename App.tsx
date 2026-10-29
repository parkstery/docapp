import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './components/Dashboard';
import AppDetail from './components/AppDetail';
import LoginPage from './components/LoginPage';
import HelpPage from './components/HelpPage';
import PrivacyPage from './components/PrivacyPage';
import { Loader2, ShieldAlert } from 'lucide-react';
import { devLog } from './utils/devLog';
import { EditTabToSave } from './components/EditTabToSave';
import { isAllowedUser } from './constants/access';

// 허용 목록에 없는 계정으로 로그인한 경우
const AccessDenied: React.FC<{ email: string | null }> = ({ email }) => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full">
          <ShieldAlert className="text-red-600" size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-800">접근 권한이 없는 계정입니다</h1>
        <p className="text-sm text-slate-500 break-all">{email || '알 수 없는 계정'}</p>
        <button
          onClick={() => signOut()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          로그아웃 후 다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
};

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

  if (!isAllowedUser(user)) {
    devLog('[ProtectedRoute] 허용되지 않은 계정:', user.email);
    return <AccessDenied email={user.email} />;
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

        button[data-edit-save]:focus {
          outline: 2px solid #0f172a;
          outline-offset: 2px;
        }
      `}</style>
      <EditTabToSave />
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;