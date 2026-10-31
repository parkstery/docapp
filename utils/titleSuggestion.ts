import { htmlToPlainTextWithBreaks } from './promptReadability';

/** 제안 제목 최대 길이(글자 수) */
export const SUGGESTED_TITLE_MAX = 30;

const SENTENCE_END = /^.*?[.!?。](?=\s|$)/;
const TRAILING_PUNCT = /[.!?。]+$/;
/** 마크다운 줄머리(제목 #, 목록 -, 인용 >, 번호 1., 체크박스 [ ]) */
const MD_LINE_PREFIX = /^(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/;

function cleanLine(line: string): string {
  return line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 마크다운 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 마크다운 링크 → 글자만
    .replace(MD_LINE_PREFIX, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 본문(HTML 또는 평문/마크다운)의 첫 문장으로 제목을 만든다.
 * 첫 줄에서 `. ! ? 。` 앞까지를 첫 문장으로 보고, 끝의 문장부호는 빼며, 30자를 넘으면 자른다.
 * 글자가 없으면(빈 내용, 이미지만 있는 내용) 빈 문자열.
 */
export function suggestTitleFromBody(body: string | null | undefined): string {
  const raw = body ?? '';
  if (!raw.trim()) return '';
  const text = /<\/?[a-z][^>]*>/i.test(raw) ? htmlToPlainTextWithBreaks(raw) : raw;
  const first = text.split(/\r?\n/).map(cleanLine).find(Boolean);
  if (!first) return '';
  const sentence = (first.match(SENTENCE_END)?.[0] ?? first).replace(TRAILING_PUNCT, '').trim();
  return Array.from(sentence).slice(0, SUGGESTED_TITLE_MAX).join('').trim();
}
