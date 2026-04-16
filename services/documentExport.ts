/**
 * 문서 보내기(Export) — Markdown/HTML/Notion 친화 텍스트 생성.
 * 저장 포맷과 무관하게 표현 레이어에서 사용한다.
 */

export type ExportMarkdownProfile = 'gfm' | 'notion';

function escapeMdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/** HTML 문자열에서 태그 제거 후 한 줄로 압축 */
export function htmlToPlainOneLine(html: string): string {
  if (!html.trim()) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

/**
 * 키-값 목록을 Markdown/Notion에 안정적인 bullet 목록으로 변환한다.
 * (Notion은 복잡한 GFM 표보다 리스트를 잘 처리한다.)
 */
export function keyValuesToMarkdownList(rows: { label: string; value: string }[]): string {
  return rows
    .filter((r) => r.label || r.value)
    .map((r) => `- **${escapeMdCell(r.label)}**: ${escapeMdCell(r.value)}`)
    .join('\n');
}

/** 2열 표 — 열 수를 최소화해 외부 도구 호환성을 높인다. */
export function simpleTwoColumnTable(headers: [string, string], rows: [string, string][]): string {
  const [h0, h1] = headers;
  const sep = `| ${escapeMdCell(h0)} | ${escapeMdCell(h1)} |\n| --- | --- |`;
  const body = rows
    .map(([a, b]) => `| ${escapeMdCell(a)} | ${escapeMdCell(b)} |`)
    .join('\n');
  return `| ${escapeMdCell(h0)} | ${escapeMdCell(h1)} |\n${sep}\n${body}`;
}

export interface ExportDocumentTitleBlock {
  title: string;
  subtitle?: string;
}

export function buildMarkdownExport(
  meta: ExportDocumentTitleBlock,
  sections: { heading: string; bodyMarkdown: string }[],
  profile: ExportMarkdownProfile
): string {
  const lines: string[] = [];
  if (profile === 'notion') {
    lines.push('<!-- Notion profile: prefer lists over wide tables when pasting. -->');
  }
  lines.push(`# ${meta.title}`);
  if (meta.subtitle) lines.push('', meta.subtitle, '');
  for (const s of sections) {
    lines.push('', `## ${s.heading}`, '', s.bodyMarkdown.trim(), '');
  }
  return lines.join('\n').trim() + '\n';
}

/** 클립보드용 순수 텍스트(제목 + 섹션 제목 + 본문 평문) */
export function buildPlainTextExport(
  meta: ExportDocumentTitleBlock,
  sections: { heading: string; bodyPlain: string }[]
): string {
  const parts = [meta.title, meta.subtitle || '', ''];
  for (const s of sections) {
    parts.push(s.heading, '', s.bodyPlain, '', '---', '');
  }
  return parts.join('\n').trim();
}
