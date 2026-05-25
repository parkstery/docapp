/** Cursor/채팅 붙여넣기 → 구조화 중간 표현 (Markdown 문자열 처리 전) */

export type DocumentBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; code: string; lang?: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface ChatPasteDocument {
  v: 1;
  blocks: DocumentBlock[];
}
