import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject, type StorageReference } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { AppProject, PlanningDoc, Report, PromptLog, Memo, FreeDoc, Issue, Screenshot, Note } from '../types';
import { devLog } from '../utils/devLog';
import { recencyMillis } from '../utils/itemRecency';
import { sortTabListItems } from '../utils/listRowOrder';
import { withNormalizedAttachments } from './attachments';

const firebaseConfig = {
  apiKey: "AIzaSyDipTNPu4zT-03rjw-z21X2wiFgn4qGKqc",
  authDomain: "docapp-9d7d7.firebaseapp.com",
  projectId: "docapp-9d7d7",
  storageBucket: "docapp-9d7d7.firebasestorage.app",
  messagingSenderId: "236870255631",
  appId: "1:236870255631:web:1045df9d108726973f4f7a"
};

import { getApp } from 'firebase/app';

// Firebase 앱 초기화 (중복 초기화 방지)
let app;
try {
  app = initializeApp(firebaseConfig);
  devLog('[Firebase] 앱 초기화 완료:', firebaseConfig.projectId);
} catch (error: any) {
  // 이미 초기화된 경우 기존 앱 사용
  if (error.code === 'app/duplicate-app') {
    app = getApp();
    devLog('[Firebase] 기존 앱 인스턴스 사용');
  } else {
    console.error('[Firebase] 초기화 실패:', error);
    throw error;
  }
}

export const db = getFirestore(app);
export const firebaseStorage = getStorage(app);
export const auth = getAuth(app);

devLog('[Firebase] Storage 초기화 완료:', firebaseConfig.storageBucket);
devLog('[Firebase] Auth 초기화 완료');

/** 조회 실패 알림 이벤트 — 목록이 빈 것으로 오해되지 않도록 화면에 오류를 띄운다 (components/LoadErrorBanner) */
export const LOAD_ERROR_EVENT = 'docapp:load-error';

const notifyLoadError = (source: string, error: unknown) => {
  const message = (error as { code?: string; message?: string })?.code || (error as Error)?.message || String(error);
  window.dispatchEvent(new CustomEvent(LOAD_ERROR_EVENT, { detail: { source, message } }));
};

// Helper: Fetch collection data, optionally filtering by appId and sorting
const getCollection = async <T>(colName: string, appId?: string): Promise<T[]> => {
  try {
    const colRef = collection(db, colName);
    let q;

    if (appId) {
      q = query(colRef, where('appId', '==', appId));
    } else {
      q = query(colRef);
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => doc.data() as T);
    
    // Sort in memory to avoid needing composite indexes for every combination right away
    if (appId) {
      return sortTabListItems(data as any) as T[];
    }
    return data.sort((a: any, b: any) => recencyMillis(b) - recencyMillis(a));
  } catch (error) {
    console.error(`Error getting collection ${colName}:`, error);
    notifyLoadError(colName, error);
    return [];
  }
};

// Helper: Save document (Create or Update)
const saveDocument = async (colName: string, item: any) => {
  try {
    await setDoc(doc(db, colName, item.id), item);
    return item;
  } catch (error) {
    console.error(`Error saving document to ${colName}:`, error);
    throw error;
  }
};

// Helper: Delete document
const deleteDocument = async (colName: string, id: string) => {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (error) {
    console.error(`Error deleting document from ${colName}:`, error);
    throw error;
  }
};

/** 프로젝트(appId)에 딸린 문서가 저장되는 컬렉션 */
const APP_CHILD_COLLECTIONS = ['planning', 'reports', 'prompts', 'memos', 'freeDocs', 'issues', 'screenshots', 'notes'];

const BATCH_LIMIT = 450;

// Storage 폴더 아래 파일을 하위 폴더까지 모두 수집
const listFilesRecursive = async (folder: StorageReference): Promise<StorageReference[]> => {
  const res = await listAll(folder);
  const nested = await Promise.all(res.prefixes.map(listFilesRecursive));
  return [...res.items, ...nested.flat()];
};

const deleteRefsInBatches = async (refs: DocumentReference[]) => {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_LIMIT).forEach((r) => batch.delete(r));
    await batch.commit();
  }
};

/**
 * 프로젝트 삭제: 하위 문서(8개 컬렉션) → Storage 파일(`{appId}/` 아래 전체) → 프로젝트 문서 순.
 * 중간에 실패하면 프로젝트 문서가 남으므로 다시 삭제하면 이어서 정리된다.
 */
const deleteAppWithContents = async (id: string) => {
  const snapshots = await Promise.all(
    APP_CHILD_COLLECTIONS.map((col) => getDocs(query(collection(db, col), where('appId', '==', id))))
  );
  await deleteRefsInBatches(snapshots.flatMap((snap) => snap.docs.map((d) => d.ref)));

  const files = await listFilesRecursive(ref(firebaseStorage, id));
  for (let i = 0; i < files.length; i += 20) {
    await Promise.all(files.slice(i, i + 20).map((f) => deleteObject(f)));
  }

  await deleteDocument('apps', id);
};

export const storage = {
  getApps: () => getCollection<AppProject>('apps'),
  
  getApp: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, 'apps', id));
      return snap.exists() ? snap.data() as AppProject : undefined;
    } catch (error) {
      console.error("Error getting app:", error);
      notifyLoadError('apps', error);
      return undefined;
    }
  },
  
  saveApp: (app: AppProject) => saveDocument('apps', app),
  deleteApp: deleteAppWithContents,
  
  // Sub-modules
  planning: {
    list: (appId: string) => getCollection<PlanningDoc>('planning', appId),
    save: (item: PlanningDoc) => saveDocument('planning', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('planning', id),
  },
  reports: {
    list: (appId: string) => getCollection<Report>('reports', appId),
    save: (item: Report) => saveDocument('reports', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('reports', id),
  },
  prompts: {
    list: (appId: string) => getCollection<PromptLog>('prompts', appId),
    save: (item: PromptLog) => saveDocument('prompts', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('prompts', id),
  },
  memos: {
    list: (appId: string) => getCollection<Memo>('memos', appId),
    save: (item: Memo) => saveDocument('memos', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('memos', id),
  },
  freeDocs: {
    list: (appId: string) => getCollection<FreeDoc>('freeDocs', appId),
    save: (item: FreeDoc) => saveDocument('freeDocs', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('freeDocs', id),
  },
  issues: {
    list: (appId: string) => getCollection<Issue>('issues', appId),
    save: (item: Issue) => saveDocument('issues', withNormalizedAttachments(item)),
    delete: (id: string) => deleteDocument('issues', id),
  },
  screenshots: {
    list: (appId: string) => getCollection<Screenshot>('screenshots', appId),
    save: (item: Screenshot) => saveDocument('screenshots', item),
    delete: (id: string) => deleteDocument('screenshots', id),
  },
  notes: {
    list: (appId: string) => getCollection<Note>('notes', appId),
    save: (item: Note) => saveDocument('notes', item),
    delete: (id: string) => deleteDocument('notes', id),
  },
};