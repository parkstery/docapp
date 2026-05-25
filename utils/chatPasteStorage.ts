import type { ChatPasteDocument, DocumentBlock } from '../types/documentBlocks';
import { parseChatPaste } from './chatPasteParser';

export const CHAT_PASTE_FENCE = ':::docapp-chat';

const FENCE_END = ':::';

export function hasChatPasteBlocks(content: string): boolean {
  return /:::docapp-chat\r?\n/.test(content);
}

export function wrapChatPasteBlock(blocks: DocumentBlock[]): string {
  const doc: ChatPasteDocument = { v: 1, blocks };
  const json = JSON.stringify(doc);
  return `\n\n${CHAT_PASTE_FENCE}\n${json}\n${FENCE_END}\n\n`;
}

export function tryParseChatPasteFence(block: string): DocumentBlock[] | null {
  const raw = block.trim().replace(/^\uFEFF/, '');
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw) as ChatPasteDocument;
    if (doc?.v === 1 && Array.isArray(doc.blocks) && doc.blocks.length > 0) {
      return doc.blocks.filter(isValidBlock);
    }
  } catch {
    /* fallback below */
  }
  return null;
}

function isValidBlock(b: unknown): b is DocumentBlock {
  if (!b || typeof b !== 'object' || !('type' in b)) return false;
  const t = (b as DocumentBlock).type;
  if (t === 'paragraph' || t === 'heading' || t === 'code') return true;
  if (t === 'list') return Array.isArray((b as { items?: unknown }).items);
  if (t === 'table') {
    const tb = b as { headers?: unknown; rows?: unknown };
    return Array.isArray(tb.headers) && Array.isArray(tb.rows);
  }
  return false;
}

/** 줄 단위 fence 추출 (JSON 안의 \\n, CRLF, 정규식 실패 대비) */
export function extractChatPasteBlocksFromContent(content: string): DocumentBlock[] {
  const lines = content.split(/\r?\n/);
  const merged: DocumentBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() !== CHAT_PASTE_FENCE) {
      i += 1;
      continue;
    }
    i += 1;
    const jsonLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== FENCE_END) {
      jsonLines.push(lines[i]);
      i += 1;
    }
    if (i < lines.length && lines[i].trim() === FENCE_END) i += 1;

    const body = jsonLines.join('\n').trim();
    const blocks = tryParseChatPasteFence(body);
    if (blocks?.length) merged.push(...blocks);
  }

  return merged;
}

/** fence·주석 제거 후 남은 평문 */
export function stripChatPasteFences(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === CHAT_PASTE_FENCE) {
      i += 1;
      while (i < lines.length && lines[i].trim() !== FENCE_END) i += 1;
      if (i < lines.length) i += 1;
      continue;
    }
    out.push(lines[i]);
    i += 1;
  }

  return out
    .join('\n')
    .replace(/<!--\s*docapp:[\s\S]*?-->\s*/gi, '')
    .replace(/:::docapp-html\r?\n[\s\S]*?\r?\n:::/g, '')
    .trim();
}

export function buildChatPasteInsert(plain: string): string {
  const blocks = parseChatPaste(plain);
  const summary = summarizeBlocks(blocks);
  return `${summary}${wrapChatPasteBlock(blocks)}`;
}

function summarizeBlocks(blocks: DocumentBlock[]): string {
  const tables = blocks.filter((b) => b.type === 'table').length;
  const lists = blocks.filter((b) => b.type === 'list').length;
  const codes = blocks.filter((b) => b.type === 'code').length;
  const parts: string[] = [];
  if (tables) parts.push(`표 ${tables}`);
  if (lists) parts.push(`목록 ${lists}`);
  if (codes) parts.push(`코드 ${codes}`);
  const label = parts.length ? parts.join(' · ') : '본문';
  return `<!-- docapp: Cursor 채팅 붙여넣기 (${label}) — 미리보기에서 확인 -->\n`;
}

export function restructureContentAsChatPaste(source: string): string {
  const existing = extractChatPasteBlocksFromContent(source);
  const stripped = stripChatPasteFences(source);
  if (!stripped && existing.length > 0) {
    return summarizeBlocks(existing) + wrapChatPasteBlock(existing);
  }
  if (!stripped) return source;
  return buildChatPasteInsert(stripped);
}
