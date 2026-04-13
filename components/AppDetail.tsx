import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, MessageSquare, StickyNote, ClipboardList, AlertTriangle, Image as ImageIcon, Loader2, ScrollText } from 'lucide-react';
import { storage } from '../services/storage';
import { AppProject } from '../types';
import { PlanningView, ReportView, PromptView, MemoView, NoteView, IssueView, ScreenshotView } from './TabViews';
import { FreeDocView } from './FreeDocView';

type Tab = 'planning' | 'reports' | 'prompts' | 'memos' | 'free' | 'notes' | 'issues' | 'screenshots';

const AppDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<AppProject | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('planning');
  const [loading, setLoading] = useState(true);

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
    { id: 'prompts', label: '프롬프트', icon: MessageSquare },
    { id: 'memos', label: '참고', icon: StickyNote },
    { id: 'free', label: '프리', icon: ScrollText },
    { id: 'notes', label: '메모', icon: ClipboardList },
    { id: 'issues', label: '트러블슈팅', icon: AlertTriangle },
    { id: 'screenshots', label: '스크린샷', icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 flex-col">
      {/* Header */}
      <header className="bg-white border-b px-3 sm:px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              {app.name} 
              <span className="text-xs font-normal px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">v{app.version}</span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">{app.platform} Development</p>
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <nav className="lg:hidden bg-white border-b px-2 py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:flex w-64 bg-white border-r flex-col flex-shrink-0">
          <nav className="p-4 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-primary' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto p-4 border-t">
            <div className="text-xs text-slate-400 text-center">
              DevManager Pro. <br/>&copy; 2026 Liveonsoft
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-slate-50">
          <div className="max-w-6xl mx-auto h-full">
            {activeTab === 'planning' && <PlanningView appId={app.id} />}
            {activeTab === 'reports' && <ReportView appId={app.id} />}
            {activeTab === 'prompts' && <PromptView appId={app.id} />}
            {activeTab === 'memos' && <MemoView appId={app.id} />}
            {activeTab === 'free' && <FreeDocView appId={app.id} />}
            {activeTab === 'notes' && <NoteView appId={app.id} />}
            {activeTab === 'issues' && <IssueView appId={app.id} />}
            {activeTab === 'screenshots' && <ScreenshotView appId={app.id} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppDetail;