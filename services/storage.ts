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
  where 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { AppProject, PlanningDoc, Report, PromptLog, Memo, FreeDoc, Issue, Screenshot, Note } from '../types';
import { devLog } from '../utils/devLog';
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

/** Firestore/레거시 문서에서 시각을 밀리초 숫자로 통일 */
const toMillis = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'object' && value !== null && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const s = (value as { seconds?: number }).seconds;
    return typeof s === 'number' ? s * 1000 : 0;
  }
  return 0;
};

/** 목록 상단: 가장 최근에 작성·수정된 레코드 우선 (앱 목록은 createdAt만 있는 경우 동일) */
const recencyMillis = (item: Record<string, unknown>): number => {
  const created = toMillis(item.createdAt);
  const updated = toMillis(item.updatedAt);
  return Math.max(created, updated);
};

// Helper: Fetch collection data, optionally filtering by appId and sorting by recency
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
    return data.sort((a: any, b: any) => recencyMillis(b) - recencyMillis(a));
  } catch (error) {
    console.error(`Error getting collection ${colName}:`, error);
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

export const storage = {
  getApps: () => getCollection<AppProject>('apps'),
  
  getApp: async (id: string) => {
    try {
      const snap = await getDoc(doc(db, 'apps', id));
      return snap.exists() ? snap.data() as AppProject : undefined;
    } catch (error) {
      console.error("Error getting app:", error);
      return undefined;
    }
  },
  
  saveApp: (app: AppProject) => saveDocument('apps', app),
  deleteApp: (id: string) => deleteDocument('apps', id),
  
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