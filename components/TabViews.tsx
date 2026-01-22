import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Save, Trash2, X, Download, Tag, 
  AlertCircle, CheckCircle, Clock, Image as ImageIcon,
  ChevronRight, Search, Loader2
} from 'lucide-react';
import { PlanningDoc, Report, PromptLog, Memo, Issue, Screenshot } from '../types';
import { storage } from '../services/storage';
import { uploadFile, deleteFile } from '../services/fileService';

// --- Shared Props & Components ---
interface ViewProps {
  appId: string;
}

const TableHeader = ({ cols }: { cols: string[] }) => (
  <thead className="bg-slate-50 border-b border-slate-200">
    <tr>
      {cols.map((col, i) => (
        <th key={i} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {col}
        </th>
      ))}
    </tr>
  </thead>
);

const Loading = () => <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={20}/> 불러오는 중...</div>;

// --- 1. Planning (Markdown) ---
export const PlanningView: React.FC<ViewProps> = ({ appId }) => {
  const [docs, setDocs] = useState<PlanningDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<PlanningDoc | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocs();
  }, [appId]);

  const loadDocs = async () => {
    setLoading(true);
    const list = await storage.planning.list(appId);
    setDocs(list);
    if (!activeDoc && list.length > 0) {
      handleSelectDoc(list[0]);
    } else if (list.length === 0) {
      setActiveDoc(null);
    }
    setLoading(false);
  };

  const handleSelectDoc = (doc: PlanningDoc) => {
    setActiveDoc(doc);
    setEditContent(doc.content);
  };

  const handleCreate = async () => {
    const title = prompt('새 기획서 제목을 입력하세요:');
    if (!title) return;
    const newDoc: PlanningDoc = {
      id: crypto.randomUUID(),
      appId,
      title,
      content: '# ' + title + '\n\n여기에 내용을 작성하세요.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await storage.planning.save(newDoc);
    loadDocs();
    handleSelectDoc(newDoc);
  };

  const handleSave = async () => {
    if (!activeDoc) return;
    const updated = { ...activeDoc, content: editContent, updatedAt: Date.now() };
    await storage.planning.save(updated);
    setActiveDoc(updated);
    loadDocs(); 
    alert('저장되었습니다.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await storage.planning.delete(id);
    const remaining = docs.filter(d => d.id !== id);
    setDocs(remaining);
    if (activeDoc?.id === id) {
      setActiveDoc(remaining.length > 0 ? remaining[0] : null);
    }
  };

  return (
    <div className="flex h-full border rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Sidebar List */}
      <div className="w-64 flex-shrink-0 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-700 text-sm">기획 문서 목록</h3>
          <button onClick={handleCreate} className="p-1 hover:bg-slate-100 rounded text-primary border border-transparent hover:border-slate-200 transition-all"><Plus size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && docs.length === 0 ? <Loading /> : docs.map(doc => (
            <div
              key={doc.id}
              onClick={() => handleSelectDoc(doc)}
              className={`p-4 border-b border-slate-100 cursor-pointer text-sm flex justify-between items-center group transition-colors ${activeDoc?.id === doc.id ? 'bg-white border-l-4 border-l-primary text-primary font-medium' : 'hover:bg-white text-slate-600'}`}
            >
              <span className="truncate flex-1">{doc.title}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-1"
              ><Trash2 size={12}/></button>
            </div>
          ))}
          {!loading && docs.length === 0 && <p className="text-xs text-slate-400 text-center py-8">문서가 없습니다.</p>}
        </div>
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeDoc ? (
          <>
            <div className="h-12 border-b flex justify-between items-center px-4 bg-white">
              <span className="font-semibold text-slate-800 text-sm">{activeDoc.title}</span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{new Date(activeDoc.updatedAt).toLocaleString()} 수정됨</span>
                <button onClick={handleSave} className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors ml-2">
                  <Save size={12} /> 저장
                </button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
              <textarea
                className="w-1/2 h-full p-6 resize-none outline-none border-r font-mono text-sm bg-slate-50/50 focus:bg-white transition-colors"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Markdown 작성..."
              />
              <div className="w-1/2 h-full p-6 overflow-y-auto prose prose-sm max-w-none prose-slate">
                {/* Simple Markdown Preview */}
                {editContent.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mb-4 text-slate-800">{line.replace('# ', '')}</h1>;
                  if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mb-3 mt-4 text-slate-800">{line.replace('## ', '')}</h2>;
                  if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold mb-2 mt-3 text-slate-800">{line.replace('### ', '')}</h3>;
                  if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc marker:text-slate-400">{line.replace('- ', '')}</li>;
                  if (line.trim() === '') return <div key={i} className="h-4" />;
                  return <p key={i} className="mb-2 text-slate-600 leading-relaxed">{line}</p>;
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
            <FileText size={48} className="text-slate-200" />
            <p>기획서를 선택하거나 새로 만드세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 2. Reports ---
export const ReportView: React.FC<ViewProps> = ({ appId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Report>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadReports(); }, [appId]);
  
  const loadReports = async () => {
    setLoading(true);
    setReports(await storage.reports.list(appId));
    setLoading(false);
  };

  const processFile = async (file: File) => {
    if (uploading) {
      console.warn('[ReportView] 이미 업로드 중입니다.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }
    
    console.log('[ReportView] 파일 업로드 시작:', file.name, file.size);
    setUploading(true);
    try {
      const fileInfo = await uploadFile(appId, `reports/${form.id || 'new'}`, file);
      console.log('[ReportView] 파일 업로드 성공:', fileInfo);
      setForm({
        ...form,
        fileName: fileInfo.name,
        fileInfo: fileInfo
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (error: any) {
      console.error('[ReportView] 파일 업로드 실패:', error);
      const errorMessage = error.message || '파일 업로드에 실패했습니다.';
      alert(`파일 업로드 실패: ${errorMessage}\n\n브라우저 콘솔을 확인하세요.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    console.log('[ReportView] handleFileSelect 호출:', file.name);
    await processFile(file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ReportView] 파일 선택 이벤트 발생');
    console.log('[ReportView] files:', e.target.files);
    const file = e.target.files?.[0];
    if (file) {
      console.log('[ReportView] 선택된 파일:', file.name, file.size, file.type);
      await handleFileSelect(file);
    } else {
      console.warn('[ReportView] 파일이 선택되지 않았습니다.');
    }
    // 같은 파일을 다시 선택할 수 있도록 value 초기화
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleSave = async () => {
    console.log('[ReportView] handleSave 호출됨');
    console.log('[ReportView] form 상태:', form);
    
    if (!form.title || form.title.trim() === '') {
      alert('제목을 입력하세요');
      return;
    }
    
    try {
      // 파일 업로드 없이도 저장 가능 - 파일은 선택사항입니다
      const item: Report = {
        id: form.id || crypto.randomUUID(),
        appId,
        title: form.title.trim(),
        type: form.type || 'Other',
        summary: form.summary || '',
        // 파일이 없어도 저장 가능 - undefined로 설정
        fileName: form.fileName,
        fileInfo: form.fileInfo,
        createdAt: form.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      
      console.log('[ReportView] 저장할 항목:', item);
      console.log('[ReportView] 파일 정보:', { fileName: item.fileName, fileInfo: item.fileInfo });
      
      await storage.reports.save(item);
      console.log('[ReportView] 저장 성공');
      
      setIsModalOpen(false);
      setForm({});
      loadReports();
    } catch (error: any) {
      console.error('[ReportView] 보고서 저장 실패:', error);
      console.error('[ReportView] 에러 상세:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      alert(`보고서 저장에 실패했습니다.\n\n에러: ${error?.message || '알 수 없는 오류'}\n\n브라우저 콘솔을 확인하세요.`);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map(r => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) return;
    
    for (const id of selectedIds) {
      const report = reports.find(r => r.id === id);
      if (report?.fileInfo) {
        try {
          await deleteFile(report.fileInfo.url);
        } catch (error) {
          console.error('파일 삭제 실패:', error);
        }
      }
      await storage.reports.delete(id);
    }
    setSelectedIds(new Set());
    loadReports();
  };

  const handleDeleteFile = async () => {
    if (!form.fileInfo) return;
    if (!confirm('정말로 이 파일을 삭제하시겠습니까?')) return;

    try {
      await deleteFile(form.fileInfo.url);
      setForm({
        ...form,
        fileName: undefined,
        fileInfo: undefined
      });
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const deleteReport = async (id: string) => {
    if(confirm('삭제하시겠습니까?')) {
      await storage.reports.delete(id);
      loadReports();
      setIsModalOpen(false);
    }
  };

  const openModal = (report?: Report) => {
    setForm(report || { type: 'Other' });
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">보고서</h3>
        <div className="flex gap-2">
          <button 
            onClick={handleDeleteSelected} 
            disabled={selectedIds.size === 0}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm ${
              selectedIds.size > 0 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Trash2 size={16} /> 삭제 {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
          <button onClick={() => openModal()} className="bg-primary hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm">
            <Plus size={16} /> 작성하기
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? <Loading /> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={reports.length > 0 && selectedIds.size === reports.length}
                        onChange={handleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span>SELECT</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Attachment</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => handleToggleSelect(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => openModal(r)}>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${
                        r.type === 'Final' ? 'bg-green-50 text-green-700 border-green-200' : 
                        r.type === 'Interim' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                        r.type === 'CodeAnalysis' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 cursor-pointer" onClick={() => openModal(r)}>{r.title}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate cursor-pointer" onClick={() => openModal(r)}>{r.summary}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 cursor-pointer" onClick={() => openModal(r)}>
                      {r.fileInfo && (
                        <a 
                          href={r.fileInfo.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <FileText size={14}/> {r.fileInfo.name}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 cursor-pointer" onClick={() => openModal(r)}>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right cursor-pointer" onClick={() => openModal(r)}>
                      <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-primary" />
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">등록된 보고서가 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{form.id ? '보고서 수정' : '새 보고서 작성'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                  <input className="w-full border rounded-lg p-2.5 focus:ring-2 ring-primary outline-none" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">유형</label>
                  <select className="w-full border rounded-lg p-2.5 outline-none" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                    <option value="CodeAnalysis">코드 분석</option>
                    <option value="ProjectAnalysis">프로젝트 분석</option>
                    <option value="Interim">중간 보고서</option>
                    <option value="Final">완료 보고서</option>
                    <option value="Other">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">요약 내용</label>
                <textarea className="w-full border rounded-lg p-3 h-32 resize-none focus:ring-2 ring-primary outline-none" value={form.summary || ''} onChange={e => setForm({...form, summary: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">첨부파일</label>
                {uploadSuccess && (
                  <span className="text-xs text-green-600 font-medium mb-2 block">
                    파일이 업로드 되었습니다
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  className="hidden"
                  id={`file-upload-${form.id || 'new'}`}
                  onClick={(e) => {
                    console.log('[ReportView] input 직접 클릭됨');
                    e.stopPropagation();
                  }}
                />
                <div className="space-y-2">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                      isDragging
                        ? 'border-primary bg-indigo-50'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                    } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <p className="text-xs text-slate-600 mb-1">
                      파일을 여기에 드래그 앤 드롭하거나
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[ReportView] 파일 선택 버튼 클릭 - 이벤트 발생 확인');
                      console.log('[ReportView] fileInputRef:', fileInputRef.current);
                      if (fileInputRef.current) {
                        console.log('[ReportView] fileInputRef 존재, click() 호출');
                        try {
                          fileInputRef.current.click();
                          console.log('[ReportView] input.click() 호출 완료');
                        } catch (error) {
                          console.error('[ReportView] input.click() 호출 실패:', error);
                        }
                      } else {
                        console.error('[ReportView] fileInputRef가 null입니다.');
                      }
                    }}
                    disabled={uploading}
                    className="w-full text-primary hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer text-xs font-medium py-2 px-3 rounded border border-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    클릭하여 파일 선택
                  </button>
                </div>
                {form.fileInfo && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                      <div className="flex items-center gap-2 flex-1">
                        <FileText size={16} className="text-slate-400" />
                        <span className="text-sm text-slate-800">{form.fileInfo.name}</span>
                        {form.fileInfo.size && (
                          <span className="text-xs text-slate-500">
                            ({(form.fileInfo.size / 1024).toFixed(2)} KB)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={form.fileInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-indigo-800 text-xs px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          읽기
                        </a>
                        <a
                          href={form.fileInfo.url}
                          download={form.fileInfo.name}
                          className="text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50"
                        >
                          다운로드
                        </a>
                        <button
                          onClick={handleDeleteFile}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between">
              {form.id ? <button onClick={() => deleteReport(form.id!)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm">삭제</button> : <div/>}
              <div className="flex gap-2">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">취소</button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary text-white hover:bg-indigo-700 rounded-lg text-sm">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. Prompts ---
export const PromptView: React.FC<ViewProps> = ({ appId }) => {
  const [prompts, setPrompts] = useState<PromptLog[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptLog | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [input, setInput] = useState({ prompt: '', response: '', tags: '' });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadPrompts(); }, [appId]);

  const loadPrompts = async () => {
    setLoading(true);
    setPrompts(await storage.prompts.list(appId));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!input.prompt) return;
    const item: PromptLog = {
      id: crypto.randomUUID(),
      appId,
      title: input.prompt.substring(0, 30) + '...',
      prompt: input.prompt,
      response: input.response,
      tags: input.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await storage.prompts.save(item);
    loadPrompts();
    setIsAdding(false);
    setInput({ prompt: '', response: '', tags: '' });
  };

  const handleDelete = async (id: string) => {
    if(confirm('삭제하시겠습니까?')) {
      await storage.prompts.delete(id);
      loadPrompts();
      setSelectedPrompt(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === prompts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prompts.map(p => p.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) return;
    
    for (const id of selectedIds) {
      await storage.prompts.delete(id);
    }
    setSelectedIds(new Set());
    loadPrompts();
    if (selectedPrompt && selectedIds.has(selectedPrompt.id)) {
      setSelectedPrompt(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">프롬프트 로그</h3>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm"
            >
              <Trash2 size={16} /> 선택 삭제 ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm">
            <Plus size={16} /> 로그 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? <Loading /> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={prompts.length > 0 && selectedIds.size === prompts.length}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prompt (Preview)</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
               <tbody className="divide-y divide-slate-200">
                 {prompts.map(p => (
                   <tr key={p.id} className="hover:bg-slate-50 group">
                     <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                       <input
                         type="checkbox"
                         checked={selectedIds.has(p.id)}
                         onChange={() => handleToggleSelect(p.id)}
                         onClick={(e) => e.stopPropagation()}
                         className="rounded border-slate-300 text-primary focus:ring-primary"
                       />
                     </td>
                     <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedPrompt(p)}>
                       <div className="text-sm text-slate-900 truncate max-w-md font-medium">{p.prompt}</div>
                       <div className="text-xs text-slate-500 truncate max-w-md mt-1">{p.response}</div>
                     </td>
                     <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedPrompt(p)}>
                       <div className="flex flex-wrap gap-1">
                         {p.tags.slice(0, 3).map((t, i) => (
                           <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100">{t}</span>
                         ))}
                         {p.tags.length > 3 && <span className="text-xs text-slate-400">+{p.tags.length - 3}</span>}
                       </div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 cursor-pointer" onClick={() => setSelectedPrompt(p)}>{new Date(p.createdAt).toLocaleDateString()}</td>
                     <td className="px-6 py-4 text-right cursor-pointer" onClick={() => setSelectedPrompt(p)}>
                       <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-primary" />
                     </td>
                   </tr>
                 ))}
                 {prompts.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400">로그가 없습니다.</td></tr>}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg">새 프롬프트 로그</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Prompt</label>
                <textarea className="w-full border rounded-lg p-3 h-24 focus:ring-2 ring-primary outline-none text-sm" placeholder="입력 내용..." value={input.prompt} onChange={e => setInput({...input, prompt: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AI Response</label>
                <textarea className="w-full border rounded-lg p-3 h-32 bg-slate-50 focus:bg-white focus:ring-2 ring-primary outline-none text-sm" placeholder="응답 내용..." value={input.response} onChange={e => setInput({...input, response: e.target.value})} />
              </div>
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">태그</label>
                 <input className="w-full border rounded-lg p-2 text-sm" placeholder="콤마(,)로 구분" value={input.tags} onChange={e => setInput({...input, tags: e.target.value})} />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2 bg-slate-50 rounded-b-xl">
               <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">취소</button>
               <button onClick={handleSave} className="px-4 py-2 bg-primary text-white hover:bg-indigo-700 rounded-lg text-sm">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
               <div className="flex gap-2 items-center">
                 <h3 className="font-bold text-lg">상세 보기</h3>
                 <span className="text-xs text-slate-400">{new Date(selectedPrompt.createdAt).toLocaleString()}</span>
               </div>
               <button onClick={() => setSelectedPrompt(null)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">User Prompt</h4>
                 <div className="bg-slate-50 p-4 rounded-lg text-slate-800 text-sm whitespace-pre-wrap border">{selectedPrompt.prompt}</div>
              </div>
              <div>
                 <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2">AI Response</h4>
                 <div className="bg-indigo-50/50 p-4 rounded-lg text-slate-800 text-sm whitespace-pre-wrap border border-indigo-100">{selectedPrompt.response}</div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Tags</h4>
                <div className="flex gap-2">
                  {selectedPrompt.tags.map((t, i) => <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">{t}</span>)}
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between">
              <button onClick={() => handleDelete(selectedPrompt.id)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm flex items-center gap-1"><Trash2 size={14}/> 삭제</button>
              <button onClick={() => setSelectedPrompt(null)} className="px-4 py-2 bg-white border hover:bg-slate-50 rounded-lg text-sm">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 4. Memos ---
export const MemoView: React.FC<ViewProps> = ({ appId }) => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadMemos(); }, [appId]);

  const loadMemos = async () => {
    setLoading(true);
    setMemos(await storage.memos.list(appId));
    setLoading(false);
  };

  const addMemo = async () => {
    const content = prompt('메모 내용을 입력하세요:');
    if (!content) return;
    await storage.memos.save({
      id: crypto.randomUUID(),
      appId,
      title: 'Memo',
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    loadMemos();
  };

  const deleteMemo = async (id: string) => {
    if(confirm('삭제하시겠습니까?')) {
      await storage.memos.delete(id);
      loadMemos();
      setSelectedMemo(null);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === memos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(memos.map(m => m.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) return;
    
    for (const id of selectedIds) {
      await storage.memos.delete(id);
    }
    setSelectedIds(new Set());
    loadMemos();
    if (selectedMemo && selectedIds.has(selectedMemo.id)) {
      setSelectedMemo(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">메모장</h3>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm"
            >
              <Trash2 size={16} /> 선택 삭제 ({selectedIds.size})
            </button>
          )}
          <button onClick={addMemo} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm font-medium">
            <Plus size={16} /> 메모 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? <Loading /> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={memos.length > 0 && selectedIds.size === memos.length}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Content</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
               <tbody className="divide-y divide-slate-200">
                 {memos.map(m => (
                   <tr key={m.id} className="hover:bg-yellow-50 group transition-colors">
                     <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                       <input
                         type="checkbox"
                         checked={selectedIds.has(m.id)}
                         onChange={() => handleToggleSelect(m.id)}
                         onClick={(e) => e.stopPropagation()}
                         className="rounded border-slate-300 text-primary focus:ring-primary"
                       />
                     </td>
                     <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedMemo(m)}>
                       <div className="text-sm text-slate-800 line-clamp-2">{m.content}</div>
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 w-40 cursor-pointer" onClick={() => setSelectedMemo(m)}>{new Date(m.createdAt).toLocaleDateString()}</td>
                     <td className="px-6 py-4 text-right w-16 cursor-pointer" onClick={() => setSelectedMemo(m)}>
                       <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-yellow-600" />
                     </td>
                   </tr>
                 ))}
                 {memos.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-slate-400">작성된 메모가 없습니다.</td></tr>}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedMemo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
             <div className="bg-yellow-100 p-4 rounded-t-xl flex justify-between items-center">
                <span className="font-bold text-yellow-900">메모 상세</span>
                <button onClick={() => setSelectedMemo(null)}><X size={18} className="text-yellow-800/50 hover:text-yellow-900"/></button>
             </div>
             <div className="p-6 min-h-[200px] text-slate-800 whitespace-pre-wrap leading-relaxed">
               {selectedMemo.content}
             </div>
             <div className="p-4 border-t flex justify-between items-center bg-slate-50 rounded-b-xl">
               <span className="text-xs text-slate-400">{new Date(selectedMemo.createdAt).toLocaleString()}</span>
               <button onClick={() => deleteMemo(selectedMemo.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 5. Troubleshooting ---
export const IssueView: React.FC<ViewProps> = ({ appId }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Issue>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadIssues(); }, [appId]);

  const loadIssues = async () => {
    setLoading(true);
    setIssues(await storage.issues.list(appId));
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title) return;
    const item: Issue = {
      id: form.id || crypto.randomUUID(),
      appId,
      title: form.title,
      description: form.description || '',
      solution: form.solution || '',
      status: form.status || 'Open',
      severity: form.severity || 'Medium',
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    await storage.issues.save(item);
    loadIssues();
    setIsModalOpen(false);
    setForm({});
  };

  const deleteIssue = async (id: string) => {
    if(confirm('삭제하시겠습니까?')) {
       await storage.issues.delete(id);
       loadIssues();
       setIsModalOpen(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === issues.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(issues.map(i => i.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) return;
    
    for (const id of selectedIds) {
      await storage.issues.delete(id);
    }
    setSelectedIds(new Set());
    loadIssues();
    setIsModalOpen(false);
  };

  const openModal = (issue?: Issue) => {
    setForm(issue || { status: 'Open', severity: 'Medium' });
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">트러블슈팅 이슈</h3>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm"
            >
              <Trash2 size={16} /> 선택 삭제 ({selectedIds.size})
            </button>
          )}
          <button onClick={() => openModal()} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm font-medium">
            <AlertCircle size={16} /> 이슈 등록
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? <Loading /> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={issues.length > 0 && selectedIds.size === issues.length}
                      onChange={handleSelectAll}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Title</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
               <tbody className="divide-y divide-slate-200">
                 {issues.map(issue => (
                   <tr key={issue.id} className="hover:bg-slate-50 group">
                     <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                       <input
                         type="checkbox"
                         checked={selectedIds.has(issue.id)}
                         onChange={() => handleToggleSelect(issue.id)}
                         onClick={(e) => e.stopPropagation()}
                         className="rounded border-slate-300 text-primary focus:ring-primary"
                       />
                     </td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openModal(issue)}>
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                           ${issue.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                           {issue.status === 'Resolved' ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
                           {issue.status}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => openModal(issue)}>
                         <span className={`px-2 py-1 rounded text-xs font-semibold
                           ${issue.severity === 'High' ? 'text-red-600 bg-red-50' : issue.severity === 'Medium' ? 'text-orange-600 bg-orange-50' : 'text-slate-500 bg-slate-100'}`}>
                           {issue.severity}
                         </span>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => openModal(issue)}>
                        <div className={`text-sm font-medium ${issue.status === 'Resolved' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{issue.title}</div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">{issue.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 cursor-pointer" onClick={() => openModal(issue)}>
                        {new Date(issue.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right cursor-pointer" onClick={() => openModal(issue)}>
                         <ChevronRight size={16} className="text-slate-300 ml-auto group-hover:text-red-500" />
                      </td>
                   </tr>
                 ))}
                 {issues.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400">등록된 이슈가 없습니다.</td></tr>}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">{form.id ? '이슈 수정' : '새 이슈 등록'}</h3>
               <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="p-6 space-y-4">
               <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                    <input className="w-full border rounded-lg p-2.5 focus:ring-2 ring-red-500 outline-none" value={form.title || ''} onChange={e => setForm({...form, title: e.target.value})} placeholder="문제 상황 요약" />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">심각도</label>
                     <select className="w-full border rounded-lg p-2.5 outline-none" value={form.severity} onChange={e => setForm({...form, severity: e.target.value as any})}>
                       <option value="High">High</option>
                       <option value="Medium">Medium</option>
                       <option value="Low">Low</option>
                     </select>
                  </div>
               </div>
               <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1">
                     <label className="block text-sm font-medium text-slate-700 mb-1">상태</label>
                     <select className="w-full border rounded-lg p-2.5 outline-none" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                       <option value="Open">Open</option>
                       <option value="InProgress">In Progress</option>
                       <option value="Resolved">Resolved</option>
                     </select>
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">문제 설명</label>
                  <textarea className="w-full border rounded-lg p-3 h-24 resize-none outline-none" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="발생한 문제에 대한 상세 설명" />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">해결 방법 (Solution)</label>
                  <textarea className="w-full border border-green-200 bg-green-50 rounded-lg p-3 h-24 resize-none outline-none focus:ring-2 ring-green-500" value={form.solution || ''} onChange={e => setForm({...form, solution: e.target.value})} placeholder="해결 방안 기록..." />
               </div>
            </div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-between">
              {form.id ? <button onClick={() => deleteIssue(form.id!)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded text-sm">삭제</button> : <div/>}
              <div className="flex gap-2">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">취소</button>
                 <button onClick={handleSave} className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg text-sm">저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 6. Screenshots ---
export const ScreenshotView: React.FC<ViewProps> = ({ appId }) => {
  const [images, setImages] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadImages(); }, [appId]);

  const loadImages = async () => {
    setLoading(true);
    setImages(await storage.screenshots.list(appId));
    setLoading(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB 제한
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    const fileId = crypto.randomUUID();
    console.log('[ScreenshotView] 이미지 업로드 시작:', file.name, file.size);
    setUploading(fileId);
    
    try {
      const fileInfo = await uploadFile(appId, 'screenshots', file);
      console.log('[ScreenshotView] 이미지 업로드 성공:', fileInfo);
      const newItem: Screenshot = {
        id: crypto.randomUUID(),
        appId,
        title: file.name || '스크린샷 ' + (images.length + 1),
        imageUrl: fileInfo.url, // Firebase Storage URL
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await storage.screenshots.save(newItem);
      console.log('[ScreenshotView] Firestore 저장 완료');
      loadImages();
    } catch (error: any) {
      console.error('[ScreenshotView] 이미지 업로드 실패:', error);
      const errorMessage = error.message || '이미지 업로드에 실패했습니다.';
      alert(`이미지 업로드 실패: ${errorMessage}\n\n브라우저 콘솔을 확인하세요.`);
    } finally {
      setUploading(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ScreenshotView] 파일 선택 이벤트 발생');
    const files = Array.from(e.target.files || []) as File[];
    console.log('[ScreenshotView] 선택된 파일 수:', files.length);
    
    if (files.length === 0) {
      console.warn('[ScreenshotView] 파일이 선택되지 않았습니다.');
      return;
    }
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        console.log('[ScreenshotView] 이미지 파일 처리:', file.name);
        await processFile(file);
      } else {
        console.warn('[ScreenshotView] 이미지가 아닌 파일:', file.name, file.type);
      }
    }
    
    // 같은 파일을 다시 선택할 수 있도록 value 초기화 (다음 이벤트 루프에서)
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await processFile(file);
      }
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (confirm('삭제하시겠습니까?')) {
      try {
        // Firebase Storage에서 파일 삭제
        await deleteFile(imageUrl);
        // Firestore에서 문서 삭제
        await storage.screenshots.delete(id);
        loadImages();
      } catch (error) {
        console.error('이미지 삭제 실패:', error);
        alert('이미지 삭제에 실패했습니다.');
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === images.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(images.map(img => img.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}개의 항목을 삭제하시겠습니까?`)) return;
    
    for (const id of selectedIds) {
      const image = images.find(img => img.id === id);
      if (image) {
        try {
          await deleteFile(image.imageUrl);
          await storage.screenshots.delete(id);
        } catch (error) {
          console.error('이미지 삭제 실패:', error);
        }
      }
    }
    setSelectedIds(new Set());
    loadImages();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg text-slate-800">스크린샷 갤러리</h3>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleDeleteSelected} 
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm"
            >
              <Trash2 size={16} /> 선택 삭제 ({selectedIds.size})
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              console.log('[ScreenshotView] 이미지 추가 버튼 클릭');
              fileInputRef.current?.click();
            }} 
            className="bg-slate-800 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm font-medium hover:bg-slate-700"
          >
            <ImageIcon size={16} /> 이미지 추가
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 p-4 overflow-y-auto">
        {loading ? <Loading /> : (
          <>
            {images.length === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                    isDragging 
                      ? 'border-primary bg-indigo-50' 
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                  } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <ImageIcon size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-2 font-medium">이미지를 드래그하거나 클릭하여 업로드하세요</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('[ScreenshotView] 파일 선택 버튼 클릭 (빈 상태)');
                    fileInputRef.current?.click();
                  }}
                  className="text-primary hover:underline text-sm"
                >
                  파일 선택
                </button>
                <p className="text-xs text-slate-400 mt-2">지원 형식: JPG, PNG, GIF, WebP (최대 10MB)</p>
                {uploading && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="text-sm text-slate-600">업로드 중...</span>
                  </div>
                )}
              </div>
            )}
            {images.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <input
                    type="checkbox"
                    checked={images.length > 0 && selectedIds.size === images.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-slate-600">전체 선택</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map(img => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border shadow-sm aspect-video bg-slate-100 hover:shadow-md transition-all">
                      <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(img.id)}
                          onChange={() => handleToggleSelect(img.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-slate-300 text-primary focus:ring-primary bg-white p-1"
                        />
                      </div>
                      <img src={img.imageUrl} alt={img.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a href={img.imageUrl} download={img.title} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-slate-800 hover:text-indigo-600 shadow-lg transform hover:scale-110 transition-transform"><Download size={16} /></a>
                        <button onClick={() => handleDelete(img.id, img.imageUrl)} className="p-2 bg-white rounded-full text-slate-800 hover:text-red-600 shadow-lg transform hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-xs p-3 truncate">
                        {img.title}
                      </div>
                    </div>
                  ))}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg aspect-video flex items-center justify-center transition-colors cursor-pointer ${
                      isDragging 
                        ? 'border-primary bg-indigo-50' 
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                    } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('[ScreenshotView] 드래그 영역 클릭 (갤러리)');
                      fileInputRef.current?.click();
                    }}
                  >
                    <div className="text-center">
                      {uploading ? (
                        <>
                          <Loader2 className="mx-auto animate-spin text-slate-400 mb-2" size={24} />
                          <p className="text-xs text-slate-500">업로드 중...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon size={32} className="mx-auto text-slate-400 mb-2" />
                          <p className="text-xs text-slate-500">이미지 추가</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};