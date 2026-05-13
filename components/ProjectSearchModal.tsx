import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import type { DocumentView, DocumentKind } from '../types/documentModel';
import { fetchAllDocumentViews } from '../services/projectDocuments';

const KIND_LABEL: Record<DocumentKind, string> = {
  planning: '기획서',
  reports: '보고서',
  prompts: '프롬프트',
  memos: '참고',
  freeDocs: '프리',
  issues: '트러블슈팅',
  screenshots: '스크린샷',
  notes: '메모',
};

function kindToTab(kind: DocumentKind): string {
  if (kind === 'freeDocs') return 'free';
  return kind;
}

interface ProjectSearchModalProps {
  appId: string;
  open: boolean;
  onClose: () => void;
  onSelectResult: (tabId: string, docId: string) => void;
}

const ProjectSearchModal: React.FC<ProjectSearchModalProps> = ({
  appId,
  open,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [docs, setDocs] = useState<DocumentView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllDocumentViews(appId);
      setDocs(all);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    if (open) {
      void load();
      setQuery('');
    }
  }, [open, load]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (q.length < 2) return [];
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.bodyText.toLowerCase().includes(q)
    );
  }, [docs, q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-search-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input
            id="project-search-title"
            autoFocus
            type="search"
            placeholder="제목·본문 검색 (2글자 이상)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[min(60vh,420px)] overflow-y-auto text-sm">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="animate-spin" size={20} />
              불러오는 중…
            </div>
          )}
          {error && <div className="p-4 text-red-600">{error}</div>}
          {!loading && !error && q.length < 2 && (
            <p className="p-4 text-slate-500">검색어를 2글자 이상 입력하세요.</p>
          )}
          {!loading && !error && q.length >= 2 && filtered.length === 0 && (
            <p className="p-4 text-slate-500">결과가 없습니다.</p>
          )}
          {!loading &&
            filtered.map((d) => (
              <button
                key={`${d.kind}-${d.id}`}
                type="button"
                onClick={() => {
                  onSelectResult(kindToTab(d.kind), d.id);
                  onClose();
                }}
                className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="font-medium text-slate-800 truncate">{d.title}</div>
                <div className="text-xs text-indigo-600 mt-0.5">{KIND_LABEL[d.kind]}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {d.bodyText.slice(0, 160)}
                  {d.bodyText.length > 160 ? '…' : ''}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectSearchModal;
