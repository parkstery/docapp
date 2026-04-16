import type {
  PlanningDoc,
  Report,
  PromptLog,
  Memo,
  FreeDoc,
  Issue,
  Screenshot,
  Note,
  FileInfo,
} from '../types';

/** 앱 내 탭·Firestore 컬렉션과 대응하는 문서 종류 */
export type DocumentKind =
  | 'planning'
  | 'reports'
  | 'prompts'
  | 'memos'
  | 'freeDocs'
  | 'issues'
  | 'screenshots'
  | 'notes';

export type BodyFormat = 'markdown' | 'html' | 'plain' | 'composite';

/**
 * 클라이언트 통합 뷰 — 저장 스키마와 분리된 표현·검색용 모델.
 * Firestore 컬렉션은 유지하고, 탭별 데이터를 이 형태로 매핑한다.
 */
export interface DocumentView {
  id: string;
  appId: string;
  kind: DocumentKind;
  title: string;
  bodyFormat: BodyFormat;
  /** 검색·미리보기용 단일 텍스트(필요 시 여러 필드 연결) */
  bodyText: string;
  attachments: FileInfo[];
  createdAt: number;
  updatedAt: number;
  /** 종류별 추가 메타 (보고서 유형, 이슈 상태 등) */
  meta?: Record<string, unknown>;
}

function attachList(item: { fileInfo?: FileInfo; fileInfoList?: FileInfo[] }): FileInfo[] {
  if (item.fileInfoList?.length) return item.fileInfoList;
  if (item.fileInfo) return [item.fileInfo];
  return [];
}

export function planningDocToView(doc: PlanningDoc): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'planning',
    title: doc.title,
    bodyFormat: 'markdown',
    bodyText: doc.content || '',
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function reportToView(doc: Report): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'reports',
    title: doc.title,
    bodyFormat: 'markdown',
    bodyText: doc.summary || '',
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    meta: { type: doc.type },
  };
}

export function promptLogToView(doc: PromptLog): DocumentView {
  const tags = (doc.tags || []).join(' ');
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'prompts',
    title: doc.title,
    bodyFormat: 'composite',
    bodyText: [doc.prompt, doc.response, tags].filter(Boolean).join('\n'),
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function memoToView(doc: Memo): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'memos',
    title: doc.title,
    bodyFormat: 'plain',
    bodyText: doc.content || '',
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function freeDocToView(doc: FreeDoc): DocumentView {
  let plain = '';
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = doc.html || '';
    plain = (div.textContent || '').replace(/\s+/g, ' ').trim();
  } else {
    plain = (doc.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'freeDocs',
    title: doc.title,
    bodyFormat: 'html',
    bodyText: plain || (doc.html || '').slice(0, 5000),
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function issueToView(doc: Issue): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'issues',
    title: doc.title,
    bodyFormat: 'plain',
    bodyText: [doc.description, doc.solution].filter(Boolean).join('\n'),
    attachments: attachList(doc),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    meta: { status: doc.status, severity: doc.severity },
  };
}

export function screenshotToView(doc: Screenshot): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'screenshots',
    title: doc.title,
    bodyFormat: 'plain',
    bodyText: [doc.description, doc.imageUrl].filter(Boolean).join('\n'),
    attachments: [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function noteToView(doc: Note): DocumentView {
  return {
    id: doc.id,
    appId: doc.appId,
    kind: 'notes',
    title: doc.title,
    bodyFormat: 'plain',
    bodyText: doc.content || '',
    attachments: [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
