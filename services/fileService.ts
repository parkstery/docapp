import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata, updateMetadata } from 'firebase/storage';
import { firebaseStorage, auth } from './storage';
import { devLog } from '../utils/devLog';
import { detectTextCharset, isTextLikeFile, textBaseContentType } from '../utils/textFileCharset';
import type { FileInfo } from '../types';

export type { FileInfo };

/**
 * 텍스트 파일 업로드용 Content-Type (charset 포함).
 * charset 이 없으면 브라우저가 OS 기본 인코딩(한국어 Windows = CP949)으로 읽어 UTF-8 한글이 깨진다.
 */
const textUploadContentType = async (file: File): Promise<string | undefined> => {
  if (!isTextLikeFile(file.name, file.type)) return undefined;
  const charset = detectTextCharset(await file.arrayBuffer());
  return `${textBaseContentType(file.name, file.type)}; charset=${charset}`;
};

const charsetChecked = new Set<string>();

/**
 * 이미 올라간 텍스트 파일의 Content-Type 에 charset 이 없으면 내용을 읽어 판별한 뒤 붙인다.
 * (예전에 charset 없이 업로드된 파일을 열 때 한 번만 실행됨)
 */
export const ensureTextCharset = async (file: Pick<FileInfo, 'name' | 'url' | 'type'>): Promise<void> => {
  if (!isTextLikeFile(file.name, file.type) || charsetChecked.has(file.url)) return;
  try {
    const fileRef = ref(firebaseStorage, getFilePathFromURL(file.url));
    const meta = await getMetadata(fileRef);
    const current = meta.contentType || '';
    if (!/charset=/i.test(current)) {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const charset = detectTextCharset(await res.arrayBuffer());
      const contentType = `${textBaseContentType(file.name, current || file.type)}; charset=${charset}`;
      await updateMetadata(fileRef, { contentType });
      devLog('[FileService] charset 보정:', file.name, current, '→', contentType);
    }
    charsetChecked.add(file.url);
  } catch (error) {
    console.warn('[FileService] charset 보정 실패(원래대로 엽니다):', file.name, error);
  }
};

/**
 * 일반 파일 업로드
 * @param entityId - 엔티티 ID (예: appId)
 * @param section - 파일이 속한 섹션 (예: 'reports', 'screenshots' 등)
 * @param file - 업로드할 파일
 * @returns FileInfo 객체
 */
export const uploadFile = async (
  entityId: string,
  section: string,
  file: File
): Promise<FileInfo> => {
  try {
    devLog('[FileService] 업로드 시작:', { entityId, section, fileName: file.name, fileSize: file.size });
    
    // Firebase Storage 초기화 확인
    if (!firebaseStorage) {
      throw new Error('Firebase Storage가 초기화되지 않았습니다.');
    }
    
    // 인증 상태 확인
    const currentUser = auth.currentUser;
    devLog('[FileService] 현재 인증 상태:', currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    } : '로그인되지 않음');
    
    if (!currentUser) {
      throw new Error('로그인이 필요합니다. 먼저 Google 로그인을 진행하세요.');
    }
    
    const timestamp = Date.now();
    // 파일명에 특수문자가 있으면 인코딩
    const encodedFileName = encodeURIComponent(file.name);
    const fileName = `${entityId}/${section}/${timestamp}_${encodedFileName}`;
    const storageRef = ref(firebaseStorage, fileName);
    
    devLog('[FileService] Storage 경로:', fileName);
    devLog('[FileService] 인증된 사용자로 업로드 시도:', currentUser.email);
    devLog('[FileService] uploadBytes 시작...');
    
    // 파일 업로드 (텍스트 파일은 charset 을 지정해 브라우저에서 바로 열어도 글자가 깨지지 않게)
    const contentType = await textUploadContentType(file);
    await uploadBytes(storageRef, file, contentType ? { contentType } : undefined);
    devLog('[FileService] uploadBytes 완료');
    
    // 다운로드 URL 가져오기
    devLog('[FileService] getDownloadURL 시작...');
    const downloadURL = await getDownloadURL(storageRef);
    devLog('[FileService] getDownloadURL 완료:', downloadURL);
    
    const fileInfo: FileInfo = {
      id: `${timestamp}_${file.name}`,
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      date: timestamp,
    };
    
    devLog('[FileService] 업로드 성공:', fileInfo);
    return fileInfo;
  } catch (error: any) {
    console.error('[FileService] 업로드 실패:', error);
    console.error('[FileService] 에러 코드:', error.code);
    console.error('[FileService] 에러 메시지:', error.message);
    console.error('[FileService] 전체 에러 객체:', error);
    
    // CORS 에러인 경우
    if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
      throw new Error(
        'CORS 오류가 발생했습니다.\n\n' +
        'Firebase Console → Storage → Rules에서 다음 규칙으로 변경하세요:\n\n' +
        'rules_version = \'2\';\n' +
        'service firebase.storage {\n' +
        '  match /b/{bucket}/o {\n' +
        '    match /{allPaths=**} {\n' +
        '      allow read, write: if true;\n' +
        '    }\n' +
        '  }\n' +
        '}\n\n' +
        '그 후 Publish 버튼을 클릭하세요.'
      );
    }
    
    // Firebase Storage 권한 에러인 경우
    if (error.code === 'storage/unauthorized' || error.code === 'storage/permission-denied') {
      const currentUser = auth.currentUser;
      const authInfo = currentUser 
        ? `✅ 인증된 사용자: ${currentUser.email} (UID: ${currentUser.uid})`
        : '❌ 인증되지 않음 - 로그인이 필요합니다';
      
      // 인증 토큰 확인
      let tokenInfo = '토큰 확인 중...';
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          tokenInfo = token ? '✅ 인증 토큰 존재' : '❌ 인증 토큰 없음';
        } catch (tokenError) {
          tokenInfo = '❌ 토큰 가져오기 실패: ' + (tokenError as Error).message;
        }
      }
      
      throw new Error(
        'Firebase Storage 권한 오류가 발생했습니다.\n\n' +
        `인증 상태: ${authInfo}\n` +
        `토큰 상태: ${tokenInfo}\n\n` +
        '보안 규칙 확인:\n' +
        '1. Firebase Console → Storage → Rules\n' +
        '2. 다음 규칙이 적용되어 있는지 확인:\n\n' +
        'rules_version = \'2\';\n' +
        'service firebase.storage {\n' +
        '  match /b/{bucket}/o {\n' +
        '    match /{allPaths=**} {\n' +
        '      allow read: if true;\n' +
        '      allow write: if request.auth != null;\n' +
        '    }\n' +
        '  }\n' +
        '}\n\n' +
        '3. Publish 버튼을 클릭했는지 확인\n' +
        '4. 브라우저를 새로고침 (Ctrl+Shift+R)\n' +
        '5. 다시 로그인 후 시도\n\n' +
        '자세한 내용은 FIREBASE_STORAGE_RULES_SECURE.md 파일을 참고하세요.'
      );
    }
    
    // 네트워크 에러
    if (error.code === 'storage/network-request-failed' || error.message?.includes('ERR_FAILED')) {
      throw new Error(
        '네트워크 요청이 실패했습니다.\n\n' +
        '가능한 원인:\n' +
        '1. Firebase Storage가 활성화되지 않았습니다.\n' +
        '2. Storage 보안 규칙이 너무 엄격합니다.\n' +
        '3. 네트워크 연결 문제입니다.\n\n' +
        'Firebase Console에서 Storage를 확인하세요.'
      );
    }
    
    throw error;
  }
};

/**
 * 파일 삭제
 * @param fileURL - 삭제할 파일의 URL
 */
export const deleteFile = async (fileURL: string): Promise<void> => {
  try {
    devLog('[FileService] 파일 삭제 시작:', fileURL);
    const filePath = getFilePathFromURL(fileURL);
    devLog('[FileService] 추출된 경로:', filePath);
    const fileRef = ref(firebaseStorage, filePath);
    await deleteObject(fileRef);
    devLog('[FileService] 파일 삭제 완료');
  } catch (error: any) {
    console.error('[FileService] 파일 삭제 실패:', error);
    console.error('[FileService] 에러 코드:', error.code);
    console.error('[FileService] 에러 메시지:', error.message);
    throw error;
  }
};

/**
 * Storage URL에서 경로 추출
 * @param url - Firebase Storage URL
 * @returns 파일 경로
 */
export const getFilePathFromURL = (url: string): string => {
  const match = url.match(/\/o\/(.+)\?/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return url;
};
