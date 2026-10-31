import type React from 'react';
import { ensureTextCharset } from '../services/fileService';
import { isTextLikeFile } from './textFileCharset';
import type { FileInfo } from '../types';

type AttachmentRef = Pick<FileInfo, 'name' | 'url' | 'type'>;

/**
 * 첨부 "읽기"(새 탭) 링크 클릭.
 * 텍스트 파일은 Storage 의 Content-Type 에 charset 을 먼저 보정한 뒤 연다(한글 깨짐 방지).
 * 새 탭은 클릭 처리 안에서 바로 열어 팝업 차단을 피하고, 보정이 끝나면 주소를 넣는다.
 */
export function openAttachment(e: React.MouseEvent<HTMLAnchorElement>, file: AttachmentRef): void {
  if (!isTextLikeFile(file.name, file.type)) return;
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  const win = window.open('', '_blank');
  if (win) {
    win.opener = null;
    try {
      win.document.title = file.name;
      win.document.body.textContent = '여는 중…';
    } catch {
      /* 무시 */
    }
  }
  void ensureTextCharset(file).finally(() => {
    if (win && !win.closed) win.location.replace(file.url);
    else window.open(file.url, '_blank', 'noopener,noreferrer');
  });
}

/**
 * 첨부 "다운로드" 링크 클릭.
 * Storage 는 다른 도메인이라 <a download> 가 무시되고 현재 탭에서 파일이 열려 버린다.
 * 내용을 받아 같은 이름으로 실제 다운로드한다. 실패하면 새 탭으로 연다.
 */
export async function downloadAttachment(e: React.MouseEvent<HTMLAnchorElement>, file: AttachmentRef): Promise<void> {
  e.preventDefault();
  try {
    const res = await fetch(file.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch (error) {
    console.warn('[attachment] 다운로드 실패, 새 탭으로 엽니다:', file.name, error);
    window.open(file.url, '_blank', 'noopener,noreferrer');
  }
}
