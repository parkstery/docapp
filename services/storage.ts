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
import { AppProject, PlanningDoc, Report, PromptLog, Memo, Issue, Screenshot } from '../types';

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
  console.log('[Firebase] 앱 초기화 완료:', firebaseConfig.projectId);
} catch (error: any) {
  // 이미 초기화된 경우 기존 앱 사용
  if (error.code === 'app/duplicate-app') {
    app = getApp();
    console.log('[Firebase] 기존 앱 인스턴스 사용');
  } else {
    console.error('[Firebase] 초기화 실패:', error);
    throw error;
  }
}

export const db = getFirestore(app);
export const firebaseStorage = getStorage(app);

console.log('[Firebase] Storage 초기화 완료:', firebaseConfig.storageBucket);

// Helper: Fetch collection data, optionally filtering by appId and sorting by createdAt
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
    return data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
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
    save: (item: PlanningDoc) => saveDocument('planning', item),
    delete: (id: string) => deleteDocument('planning', id),
  },
  reports: {
    list: (appId: string) => getCollection<Report>('reports', appId),
    save: (item: Report) => saveDocument('reports', item),
    delete: (id: string) => deleteDocument('reports', id),
  },
  prompts: {
    list: (appId: string) => getCollection<PromptLog>('prompts', appId),
    save: (item: PromptLog) => saveDocument('prompts', item),
    delete: (id: string) => deleteDocument('prompts', id),
  },
  memos: {
    list: (appId: string) => getCollection<Memo>('memos', appId),
    save: (item: Memo) => saveDocument('memos', item),
    delete: (id: string) => deleteDocument('memos', id),
  },
  issues: {
    list: (appId: string) => getCollection<Issue>('issues', appId),
    save: (item: Issue) => saveDocument('issues', item),
    delete: (id: string) => deleteDocument('issues', id),
  },
  screenshots: {
    list: (appId: string) => getCollection<Screenshot>('screenshots', appId),
    save: (item: Screenshot) => saveDocument('screenshots', item),
    delete: (id: string) => deleteDocument('screenshots', id),
  }
};