export interface AppProject {
  id: string;
  name: string;
  description: string;
  version: string;
  platform: 'iOS' | 'Android' | 'Web' | 'Hybrid';
  createdAt: number;
}

export interface BaseItem {
  id: string;
  appId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface PlanningDoc extends BaseItem {
  content: string; // Markdown content
  fileName?: string;
  fileInfo?: FileInfo;
  fileInfoList?: FileInfo[];
}

export interface FileInfo {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  date: number;
}

export interface Report extends BaseItem {
  type: 'CodeAnalysis' | 'ProjectAnalysis' | 'Interim' | 'Final' | 'Other';
  summary: string;
  fileName?: string;
  fileInfo?: FileInfo;
  /** 여러 개의 첨부파일 (기존 fileInfo는 하위 호환용) */
  fileInfoList?: FileInfo[];
}

export interface PromptLog extends BaseItem {
  prompt: string;
  response: string;
  tags: string[];
  fileName?: string;
  fileInfo?: FileInfo;
  fileInfoList?: FileInfo[];
}

export interface Memo extends BaseItem {
  content: string;
  fileName?: string;
  fileInfo?: FileInfo;
  fileInfoList?: FileInfo[];
}

/** 참고(메모)와 별도 — WYSIWYG HTML 본문 (인라인 이미지 등). Firestore `freeDocs` */
export interface FreeDoc extends BaseItem {
  /** TipTap 등에서 저장하는 HTML 본문 */
  html: string;
  /** 첨부파일 목록 */
  fileInfoList?: FileInfo[];
  /** 목록 정렬 순서 (작을수록 위) */
  order?: number;
}

export interface Issue extends BaseItem {
  status: 'Open' | 'Resolved' | 'InProgress';
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  solution?: string;
  fileName?: string;
  fileInfo?: FileInfo;
  fileInfoList?: FileInfo[];
}

export interface Screenshot extends BaseItem {
  imageUrl: string; // Firebase Storage URL
  description?: string;
}

/** 메모 탭용 카드형 메모 (생성/수정/삭제, 그리드 배치) */
export interface Note extends BaseItem {
  content: string;
}

// Union type for all sub-items
export type AppItem = PlanningDoc | Report | PromptLog | Memo | FreeDoc | Issue | Screenshot | Note;