import type { ChatPasteDocument, DocumentBlock } from '../types/documentBlocks';
import { parseChatPaste } from './chatPasteParser';

export const CHAT_PASTE_FENCE = ':::docapp-chat';

const FENCE_END = ':::';

export function hasChatPasteBlocks(content: string): boolean {
  return content.includes(`${CHAT_PASTE_FENCE}\n`);
}

export function wrapChatPasteBlock(blocks: DocumentBlock[]): string {
  const doc: ChatPasteDocument = { v: 1, blocks };
  const json = JSON.stringify(doc);
  return `\n\n${CHAT_PASTE_FENCE}\n${json}\n${FENCE_END}\n\n`;
}

export function tryParseChatPasteFence(block: string): DocumentBlock[] | null {
  try {
    const doc = JSON.parse(block.trim()) as ChatPasteDocument;
    if (doc?.v === 1 && Array.isArray(doc.blocks)) return doc.blocks;
  } catch {
    /* ignore */
  }
  return null;
}

/** 붙여넣기: 평문 → 블록 JSON 저장 (미리보기는 블록 렌더러 사용) */
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

/** 렌더용: fence JSON 또는 평문 재파싱 */
export function resolveBlocksFromMarkdownSegment(md: string): DocumentBlock[] | null {
  const t = md.trim();
  if (!t) return null;
  return parseChatPaste(t);
}
