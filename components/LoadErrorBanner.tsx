import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { LOAD_ERROR_EVENT } from '../services/storage';

type LoadError = { sources: string[]; message: string };

/** Firestore 조회 실패 시 상단 안내 (빈 목록을 "데이터 없음"으로 오해하지 않도록) */
export const LoadErrorBanner: React.FC = () => {
  const [error, setError] = useState<LoadError | null>(null);

  useEffect(() => {
    const onError = (e: Event) => {
      const { source, message } = (e as CustomEvent<{ source: string; message: string }>).detail;
      setError((prev) => ({
        sources: prev?.sources.includes(source) ? prev.sources : [...(prev?.sources || []), source],
        message,
      }));
    };
    window.addEventListener(LOAD_ERROR_EVENT, onError);
    return () => window.removeEventListener(LOAD_ERROR_EVENT, onError);
  }, []);

  if (!error) return null;

  return (
    <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-32px)] max-w-lg bg-red-50 border border-red-300 text-red-800 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0 text-sm">
        <p className="font-semibold">데이터를 불러오지 못했습니다</p>
        <p className="break-words">
          목록이 비어 보여도 실제 데이터가 없는 것이 아닐 수 있습니다. 새로고침해 주세요.
          <span className="block text-xs text-red-600 mt-1">{error.sources.join(', ')} · {error.message}</span>
        </p>
      </div>
      <button onClick={() => setError(null)} className="p-1 rounded hover:bg-red-100" aria-label="닫기">
        <X size={16} />
      </button>
    </div>
  );
};
