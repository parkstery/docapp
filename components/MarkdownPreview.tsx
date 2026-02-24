import React, { useMemo, useRef, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github.min.css';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

export interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/** 마크다운 문자열을 GitHub 스타일 HTML로 렌더링 + 코드 하이라이트 (XSS 방지) */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => {
    if (!content?.trim()) return '';
    const raw = md.render(content);
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['target'],
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'hr', 'div', 'span',
      ],
    });
  }, [content]);

  useEffect(() => {
    if (!containerRef.current || !html) return;
    containerRef.current.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el as HTMLElement);
    });
  }, [html]);

  if (!content?.trim()) {
    return (
      <div className={`markdown-body ${className}`.trim()}>
        <p className="text-slate-400">내용이 없습니다.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`markdown-body ${className}`.trim()}
      style={{ maxWidth: '900px', lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
