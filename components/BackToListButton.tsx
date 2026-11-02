import React from 'react';
import { ArrowLeft } from 'lucide-react';

/** 편집 화면 제목 왼쪽의 '목록으로' 화살표 버튼. */
export const BackToListButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="목록으로"
    aria-label="목록으로"
    className="shrink-0 -ml-1 p-1.5 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
  >
    <ArrowLeft size={20} />
  </button>
);
