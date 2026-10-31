/** 브라우저에서 글자로 열리는 파일 확장자 (Content-Type 이 비었거나 octet-stream 이어도 텍스트로 취급) */
const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'text', 'log', 'csv', 'tsv', 'json', 'jsonl', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'html', 'htm', 'css', 'scss', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'py', 'rpy', 'java', 'kt', 'c', 'h', 'cpp', 'hpp', 'cs',
  'go', 'rs', 'rb', 'php', 'sh', 'bat', 'ps1', 'sql', 'srt', 'vtt',
]);

const TEXT_APPLICATION_TYPES = new Set([
  'application/json', 'application/xml', 'application/javascript', 'application/x-javascript',
  'application/x-yaml', 'application/yaml', 'application/x-sh', 'application/sql',
]);

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
};

const baseOf = (type: string | undefined | null): string => (type || '').split(';')[0].trim().toLowerCase();

const isTextType = (base: string): boolean => base.startsWith('text/') || TEXT_APPLICATION_TYPES.has(base);

export function isTextLikeFile(name: string, type?: string | null): boolean {
  const base = baseOf(type);
  if (isTextType(base)) return true;
  if (base && base !== 'application/octet-stream') return false;
  return TEXT_EXTENSIONS.has(extOf(name));
}

/** charset 을 뺀 Content-Type. 기존 텍스트 타입은 유지하고, 없으면 확장자로 정한다. */
export function textBaseContentType(name: string, type?: string | null): string {
  const base = baseOf(type);
  if (isTextType(base)) return base;
  const ext = extOf(name);
  if (ext === 'md' || ext === 'markdown') return 'text/markdown';
  if (ext === 'csv') return 'text/csv';
  return 'text/plain';
}

/** 올바른 UTF-8 이면 utf-8, 아니면 한국어 Windows 기본(CP949 = 브라우저 라벨 euc-kr)으로 본다. */
export function detectTextCharset(bytes: ArrayBuffer): 'utf-8' | 'euc-kr' {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    return 'euc-kr';
  }
}
