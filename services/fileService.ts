import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firebaseStorage, auth } from './storage';
import { Timestamp } from 'firebase/firestore';

export interface FileInfo {
  id: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  date: Timestamp | number;
}

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
    console.log('[FileService] 업로드 시작:', { entityId, section, fileName: file.name, fileSize: file.size });
    
    // Firebase Storage 초기화 확인
    if (!firebaseStorage) {
      throw new Error('Firebase Storage가 초기화되지 않았습니다.');
    }
    
    // 인증 상태 확인
    const currentUser = auth.currentUser;
    console.log('[FileService] 현재 인증 상태:', currentUser ? {
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
    
    console.log('[FileService] Storage 경로:', fileName);
    console.log('[FileService] 인증된 사용자로 업로드 시도:', currentUser.email);
    console.log('[FileService] uploadBytes 시작...');
    
    // 파일 업로드
    await uploadBytes(storageRef, file);
    console.log('[FileService] uploadBytes 완료');
    
    // 다운로드 URL 가져오기
    console.log('[FileService] getDownloadURL 시작...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[FileService] getDownloadURL 완료:', downloadURL);
    
    const fileInfo: FileInfo = {
      id: `${timestamp}_${file.name}`,
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      date: timestamp,
    };
    
    console.log('[FileService] 업로드 성공:', fileInfo);
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
    console.log('[FileService] 파일 삭제 시작:', fileURL);
    const filePath = getFilePathFromURL(fileURL);
    console.log('[FileService] 추출된 경로:', filePath);
    const fileRef = ref(firebaseStorage, filePath);
    await deleteObject(fileRef);
    console.log('[FileService] 파일 삭제 완료');
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
