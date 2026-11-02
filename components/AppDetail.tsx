import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, FileText, MessageSquare, StickyNote, ClipboardList, AlertTriangle, Image as ImageIcon, Loader2, ScrollText, Search } from 'lucide-react';
import { storage } from '../services/storage';
import { AppProject } from '../types';
import { PlanningView, ReportView, PromptView, MemoView, NoteView, IssueView, ScreenshotView } from './TabViews';
import { FreeDocView } from './FreeDocView';
import ProjectSearchModal from './ProjectSearchModal';
import { TabNavContext, useTabHistory } from '../hooks/useTabHistory';

type Tab = 'planning' | 'reports' | 'prompts' | 'memos' | 'free' | 'notes' | 'issues' | 'screenshots';

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightItemId, setHighlightItemId] = useState<string | null>(null);
  const [highlightSeq, setHighlightSeq] = useState(0);
  const { activeTab, goTab, goBack, goForward, canGoForward, contextValue } = useTabHistory<Tab>('planning', () => navigate('/'));

  useEffect(() => {
    const fetchApp = async () => {
      if (id) {
        setLoading(true);
        const found = await storage.getApp(id);
        if (found) {
          setApp(found);
        } else {
          navigate('/');
        }
        setLoading(false);
      }
    };
    fetchApp();
  }, [id, navigate]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400 gap-2">
      <Loader2 className="animate-spin" /> 로딩 중...
    </div>
  );

  if (!app) return <div>App not found</div>;

  const tabs = [
    { id: 'planning', label: '기획서', icon: BookOpen },
    { id: 'reports', label: '보고서', icon: FileText },
    { id: 'prompts', label: 'BARN', icon: MessageSquare },
    { id: 'memos', label: '참고', icon: StickyNote },
    { id: 'free', label: 'TASK', icon: ScrollText },
    { id: 'notes', label: '메모', icon: ClipboardList },
    { id: 'issues', label: '트러블슈팅', icon: AlertTriangle },
    { id: 'screenshots', label: '스크린샷', icon: ImageIcon },
  ];

  const navButtons = (
    <div className="flex items-center shrink-0">
      <button
        type="button"
        onClick={goBack}
        title="뒤로"
        aria-label="뒤로"
        className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
      >
        <ArrowLeft size={20} />
      </button>
      <button
        type="button"
        onClick={goForward}
        disabled={!canGoForward}
        title="앞으로"
        aria-label="앞으로"
        className="p-2 hover:bg-slate-100 rounded-full text-slate-500 disabled:text-slate-300 disabled:hover:bg-transparent disabled:cursor-default"
      >
        <ArrowRight size={20} />
      </button>
    </div>
  );

  const versionBadge = (
    <span className="shrink-0 text-xs font-normal px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">v{app.version}</span>
  );

  return (
    <div className="flex h-screen bg-slate-50 flex-col lg:flex-row">
      {/* 왼쪽 목차(TOC): 프로젝트 정보 · 통합 검색 · 문서 종류 (넓은 화면) */}
      <aside className="hidden lg:flex w-56 bg-white border-r flex-col flex-shrink-0 min-h-0">
        <header className="px-2 pt-2 pb-3 border-b">
          {navButtons}
          <div className="px-2 mt-1 min-w-0">
            <h1 className="font-bold text-base text-slate-800 flex items-center gap-2 min-w-0" title={app.name}>
              <span className="truncate">{app.name}</span>
              {versionBadge}
            </h1>
            <p className="text-xs text-slate-400 truncate">{app.platform} Development</p>
          </div>
        </header>
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300"
          >
            <Search size={16} className="shrink-0" />
            통합 검색
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 min-h-0 overflow-y-auto" aria-label="문서 종류">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => goTab(tab.id as Tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-0 pl-2 pr-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <Icon size={18} className="shrink-0" />
                </span>
                <span
                  className={`mx-2 h-5 w-px shrink-0 self-center ${isActive ? 'bg-indigo-200' : 'bg-slate-200'}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-left leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="text-xs text-slate-400 text-center">
            DevManager Pro. <br/>&copy; 2026 Liveonsoft
          </div>
        </div>
      </aside>

      {/* 좁은 화면: 한 줄 머리글 + 문서 종류 가로 막대 */}
      <div className="lg:hidden flex-shrink-0 bg-white border-b shadow-sm z-10">
        <header className="px-2 sm:px-4 py-1.5 flex items-center gap-1 sm:gap-2">
          {navButtons}
          <h1 className="flex-1 min-w-0 font-bold text-base text-slate-800 flex items-center gap-2" title={app.name}>
            <span className="truncate">{app.name}</span>
            {versionBadge}
          </h1>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            title="통합 검색"
            aria-label="통합 검색"
            className="shrink-0 p-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Search size={18} />
          </button>
        </header>
        <nav className="px-2 py-1.5 overflow-x-auto border-t" aria-label="문서 종류">
          <div className="flex items-center gap-1.5 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTab(tab.id as Tab)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-50 text-primary'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <ProjectSearchModal
        appId={app.id}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={(tabId, docId) => {
          goTab(tabId as Tab, () => {
            setHighlightItemId(docId);
            setHighlightSeq((n) => n + 1);
          });
        }}
      />

      {/* 오른쪽 내용 영역: 남은 폭·높이를 모두 사용 */}
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-2 sm:p-4 bg-slate-50">
        <TabNavContext.Provider value={contextValue}>
          <div className="h-full">
            {activeTab === 'planning' && (
              <PlanningView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'reports' && (
              <ReportView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'prompts' && (
              <PromptView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'memos' && (
              <MemoView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'free' && (
              <FreeDocView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'notes' && (
              <NoteView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'issues' && (
              <IssueView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
            {activeTab === 'screenshots' && (
              <ScreenshotView appId={app.id} highlightId={highlightItemId} highlightSeq={highlightSeq} />
            )}
          </div>
        </TabNavContext.Provider>
      </main>
    </div>
  );
};

export default AppDetail;