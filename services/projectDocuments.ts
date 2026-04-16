import { storage } from './storage';
import type { DocumentView } from '../types/documentModel';
import {
  planningDocToView,
  reportToView,
  promptLogToView,
  memoToView,
  freeDocToView,
  issueToView,
  screenshotToView,
  noteToView,
} from '../types/documentModel';

/** 프로젝트 단위로 모든 탭 문서를 불러와 DocumentView 로 통합한다. */
export async function fetchAllDocumentViews(appId: string): Promise<DocumentView[]> {
  const [planning, reports, prompts, memos, freeDocs, issues, screenshots, notes] = await Promise.all([
    storage.planning.list(appId),
    storage.reports.list(appId),
    storage.prompts.list(appId),
    storage.memos.list(appId),
    storage.freeDocs.list(appId),
    storage.issues.list(appId),
    storage.screenshots.list(appId),
    storage.notes.list(appId),
  ]);

  return [
    ...planning.map(planningDocToView),
    ...reports.map(reportToView),
    ...prompts.map(promptLogToView),
    ...memos.map(memoToView),
    ...freeDocs.map(freeDocToView),
    ...issues.map(issueToView),
    ...screenshots.map(screenshotToView),
    ...notes.map(noteToView),
  ];
}
