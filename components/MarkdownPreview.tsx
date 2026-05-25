import React, { useMemo, useRef, useEffect } from 'react';
import hljs from 'highlight.js';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.min.css';
import '../styles/markdown-docapp.css';
import {
  MARKDOWN_PREVIEW_CLASS,
  renderDocumentForDisplay,
} from '../services/markdownRender';

export interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/** 마크다운 문자열을 GFM + GitHub 스타일 HTML로 렌더링 (XSS 방지, 코드 하이라이트) */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (!content?.trim()) return '';
    return renderDocumentForDisplay(content, 'auto');
  }, [content]);

  useEffect(() => {
    if (!containerRef.current || !html) return;
    containerRef.current.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el as HTMLElement);
    });
  }, [html]);

  const rootClass = `${MARKDOWN_PREVIEW_CLASS} ${className}`.trim();

  if (!content?.trim()) {
    return (
      <div className={rootClass}>
        <p className="text-slate-400">내용이 없습니다.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={rootClass}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
