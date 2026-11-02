import React from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** 짧은 24시간 표기: 2026.10.07 18:16 */
export function formatDateTime24(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 편집 화면 제목 줄 오른쪽의 작성·수정 시각 */
export const DocDates: React.FC<{ createdAt?: number; updatedAt?: number; isNew?: boolean }> = ({
  createdAt,
  updatedAt,
  isNew,
}) => (
  <span className="text-[15px] text-[#0000ff] whitespace-nowrap">
    {isNew ? (
      '저장 전'
    ) : (
      <>
        작성 {formatDateTime24(createdAt || 0)}
        {updatedAt && updatedAt !== createdAt ? <> · 수정 {formatDateTime24(updatedAt)}</> : null}
      </>
    )}
  </span>
);
