import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Smartphone, Trash2, Edit2, Search, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { AppProject } from '../types';
import { storage } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { CONTACT_EMAIL } from '../constants/contact';
import { useResizableColumns } from '../hooks/useResizableColumns';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [apps, setApps] = useState<AppProject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<AppProject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [formData, setFormData] = useState<Partial<AppProject>>({
    name: '',
    description: '',
    version: '1.0.0',
    platform: 'Web'
  });

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setIsLoading(true);
    const data = await storage.getApps();
    setApps(data);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newApp: AppProject = {
      id: editingApp ? editingApp.id : crypto.randomUUID(),
      name: formData.name || 'Untitled App',
      description: formData.description || '',
      version: formData.version || '1.0.0',
      platform: formData.platform as any || 'Web',
      createdAt: editingApp ? editingApp.createdAt : Date.now(),
    };
    await storage.saveApp(newApp);
    setIsModalOpen(false);
    setEditingApp(null);
    setFormData({ name: '', description: '', version: '1.0.0', platform: 'Web' });
    loadApps();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('정말로 이 앱 프로젝트를 삭제하시겠습니까?')) {
      await storage.deleteApp(id);
      loadApps();
    }
  };

  const openModal = (app?: AppProject) => {
    if (app) {
      setEditingApp(app);
      setFormData({ ...app });
    } else {
      setEditingApp(null);
      setFormData({ name: '', description: '', version: '1.0.0', platform: 'Web' });
    }
    setIsModalOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error: any) {
      console.error('로그아웃 실패:', error);
      alert('로그아웃에 실패했습니다.');
    }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const resize = useResizableColumns(7, [34, 56, 200, 56, 356, 70, 56]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">프로젝트 대시보드</h1>
            <p className="text-slate-500 text-sm mt-1">등록된 모든 애플리케이션 프로젝트 현황입니다.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center w-full lg:w-auto">
             <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="프로젝트 검색..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none w-full sm:w-64"
                />
             </div>
             {user && (
               <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
                 <div className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg">
                   {user.photoURL ? (
                     <img src={user.photoURL} alt={user.displayName || ''} className="w-6 h-6 rounded-full" />
                   ) : (
                     <UserIcon size={16} className="text-slate-400" />
                   )}
                   <span className="text-sm text-slate-700">{user.displayName || user.email}</span>
                 </div>
                 <button
                   onClick={handleSignOut}
                   className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                 >
                   <LogOut size={16} /> 로그아웃
                 </button>
               </div>
             )}
             <button
              onClick={() => openModal()}
              className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm w-full sm:w-auto"
            >
              <Plus size={16} /> 새 프로젝트
            </button>
          </div>
        </div>

        {/* Table Board */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>데이터를 불러오는 중입니다...</p>
            </div>
          ) : (
            <>
              <div className="lg:hidden p-3 space-y-3">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/app/${app.id}`)}
                    className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-indigo-50/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{app.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(app.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap
                        ${app.platform === 'iOS' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                          app.platform === 'Android' ? 'bg-green-100 text-green-800 border-green-200' :
                          app.platform === 'Web' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                        {app.platform}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                      <Smartphone size={14} className="text-indigo-500" />
                      <span className="font-mono">v{app.version}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500 truncate">{app.description || '-'}</p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openModal(app); }}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        aria-label="프로젝트 수정"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, app.id)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                        aria-label="프로젝트 삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredApps.length === 0 && (
                  <div className="px-4 py-12 text-center text-slate-400 text-sm">
                    {apps.length === 0 ? "등록된 프로젝트가 없습니다. '새 프로젝트'를 눌러 시작하세요." : "검색 결과가 없습니다."}
                  </div>
                )}
              </div>

              <table className="hidden lg:table report-table-separators min-w-full divide-y divide-slate-200 [border-collapse:separate] [border-spacing:0]" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  {resize.widths.map((_, i) => <col key={i} style={resize.getColStyle(i)} />)}
                </colgroup>
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" style={resize.getThStyle(0)} className="report-col-tight report-col-center text-xs font-medium text-slate-700 uppercase tracking-wider">
                      No<resize.ResizeHandle columnIndex={0} />
                    </th>
                    <th scope="col" style={resize.getThStyle(1)} className="report-col-tight text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Platform<resize.ResizeHandle columnIndex={1} />
                    </th>
                    <th scope="col" style={resize.getThStyle(2)} className="text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Project Name<resize.ResizeHandle columnIndex={2} />
                    </th>
                    <th scope="col" style={resize.getThStyle(3)} className="text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Version<resize.ResizeHandle columnIndex={3} />
                    </th>
                    <th scope="col" style={resize.getThStyle(4)} className="text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Description<resize.ResizeHandle columnIndex={4} />
                    </th>
                    <th scope="col" style={resize.getThStyle(5)} className="text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Created At<resize.ResizeHandle columnIndex={5} />
                    </th>
                    <th scope="col" style={resize.getThStyle(6)} className="report-col-actions text-xs font-medium text-slate-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredApps.map((app, index) => (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/app/${app.id}`)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="report-col-tight report-col-center whitespace-nowrap text-sm text-slate-500">
                        {index + 1}
                      </td>
                      <td className="report-col-tight whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                          ${app.platform === 'iOS' ? 'bg-slate-100 text-slate-800 border-slate-200' :
                            app.platform === 'Android' ? 'bg-green-100 text-green-800 border-green-200' :
                            app.platform === 'Web' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-purple-100 text-purple-800 border-purple-200'}`}>
                          {app.platform}
                        </span>
                      </td>
                      <td className="whitespace-nowrap min-w-0 text-left">
                        <div className="flex items-center justify-start gap-2">
                          <div className="flex-shrink-0 h-8 w-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                            <Smartphone size={16} />
                          </div>
                          <div className="text-sm font-semibold text-slate-900 truncate min-w-0" title={app.name}>{app.name}</div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-sm text-slate-600 font-mono">v{app.version}</span>
                      </td>
                      <td className="min-w-0">
                        <div className="text-sm text-slate-500 truncate max-w-xs text-left">{app.description || '-'}</div>
                      </td>
                      <td className="whitespace-nowrap text-sm text-slate-500">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                      <td className="report-col-actions whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openModal(app); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, app.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredApps.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        {apps.length === 0 ? "등록된 프로젝트가 없습니다. '새 프로젝트'를 눌러 시작하세요." : "검색 결과가 없습니다."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>

        <footer className="mt-8 py-4 text-center text-xs text-slate-400 border-t border-slate-200">
          <Link to="/help" className="underline hover:text-slate-600">도움말</Link>
          <span className="mx-2">|</span>
          <Link to="/privacy" className="underline hover:text-slate-600">개인정보처리방침</Link>
          <span className="mx-2">|</span>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-slate-600">문의: {CONTACT_EMAIL}</a>
        </footer>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">{editingApp ? '프로젝트 수정' : '새 프로젝트 등록'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">프로젝트 명</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="예: MyApp Pro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">플랫폼</label>
                  <select
                    value={formData.platform}
                    onChange={e => setFormData({...formData, platform: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                  >
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                    <option value="Web">Web</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">버전</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={e => setFormData({...formData, version: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg outline-none"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg outline-none h-24 resize-none"
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;