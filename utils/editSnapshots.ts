import type { FileInfo, FreeDoc, Issue, Memo, Note, PlanningDoc, PromptLog, Report } from '../types';

function sortedFileUrls(item: { fileInfoList?: FileInfo[] }): string[] {
  return (item.fileInfoList || []).map((f) => f.url).filter(Boolean).sort();
}

export function planningEditSnapshot(f: Partial<PlanningDoc>): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    c: f.content ?? '',
    u: sortedFileUrls(f),
  });
}

export function reportEditSnapshot(f: Partial<Report>, summaryHtml: string): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    y: f.type ?? '',
    s: summaryHtml,
    u: sortedFileUrls(f),
  });
}

export function promptEditSnapshot(
  f: Partial<PromptLog>,
  promptHtml: string,
  responseHtml: string
): string {
  const tags = [...(f.tags || [])].map(String).sort();
  return JSON.stringify({
    p: promptHtml,
    r: responseHtml,
    g: tags,
    u: sortedFileUrls(f),
  });
}

export function memoEditSnapshot(f: Partial<Memo>, contentHtml: string): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    c: contentHtml,
    u: sortedFileUrls(f),
  });
}

export function noteEditSnapshot(f: Partial<Note>, contentHtml: string): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    h: contentHtml,
  });
}

export function issueEditSnapshot(
  f: Partial<Issue>,
  descriptionHtml: string,
  solutionHtml: string
): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    st: f.status ?? '',
    se: f.severity ?? '',
    d: descriptionHtml,
    so: solutionHtml,
    u: sortedFileUrls(f),
  });
}

export function freeDocEditSnapshot(f: Partial<FreeDoc>, html: string): string {
  return JSON.stringify({
    t: (f.title ?? '').trim(),
    h: html,
    u: sortedFileUrls(f),
  });
}
