import React, { useContext } from 'react';
import { ArrowLeft, ChevronsLeft } from 'lucide-react';
import { TabNavContext } from '../hooks/useTabHistory';

const iconBtn =
  'shrink-0 w-16 py-1.5 inline-flex justify-center rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors';

/**
 * 편집 화면 제목 왼쪽의 이동 버튼.
 * « 대시보드로 바로 가기, ← 목록으로. 저장하지 않은 수정이 있으면 둘 다 확인 대화상자를 거친다.
 */
export const BackToListButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const nav = useContext(TabNavContext);
  return (
    <div className="flex items-center gap-2 shrink-0 -ml-1">
      {nav && (
        <button
          type="button"
          onClick={nav.leaveProject}
          title="대시보드로"
          aria-label="대시보드로"
          className={iconBtn}
        >
          <ChevronsLeft size={20} />
        </button>
      )}
      <button type="button" onClick={onClick} title="목록으로" aria-label="목록으로" className={iconBtn}>
        <ArrowLeft size={20} />
      </button>
    </div>
  );
};
