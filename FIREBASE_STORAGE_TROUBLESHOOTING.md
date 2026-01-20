# Firebase Storage 파일 업로드 문제 해결 가이드

## 현재 상태
파일 업로드 시 CORS 오류가 발생하고 있습니다:
```
Access to XMLHttpRequest ... has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check
```

**원인**: Firebase Storage 보안 규칙이 CORS preflight 요청을 허용하지 않음

## 즉시 확인해야 할 사항

### 1. Firebase Storage 보안 규칙 수정 (최우선 - CORS 문제 해결)

**⚠️ CORS 오류가 발생한 경우, 반드시 이 단계를 먼저 수행하세요!**

**Firebase Console → Storage → Rules** 에서 다음 규칙으로 임시 변경:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **주의**: 이 규칙은 개발/테스트용입니다. 프로덕션에서는 적절한 인증 규칙을 설정하세요.

**확인 방법**:
1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `docapp-9d7d7`
3. 왼쪽 메뉴에서 **Storage** 클릭
4. **Rules** 탭 클릭
5. 위의 규칙으로 변경 후 **Publish** 클릭

### 2. 브라우저 콘솔 확인

1. 브라우저 개발자 도구 열기 (F12)
2. **Console** 탭 확인
3. 파일 업로드 시도
4. 다음 에러 메시지 확인:
   - `storage/unauthorized` → 보안 규칙 문제
   - `storage/permission-denied` → 권한 문제
   - `storage/quota-exceeded` → 저장 공간 초과
   - 네트워크 에러 → 네트워크 연결 문제

### 3. Network 탭 확인

1. 개발자 도구 → **Network** 탭
2. 파일 업로드 시도
3. `uploadBytes` 또는 `firebasestorage.googleapis.com` 요청 확인
4. 요청 상태 확인:
   - **Pending** → 네트워크 문제 또는 권한 문제
   - **401/403** → 보안 규칙 문제
   - **200** → 업로드 성공 (다른 문제)

### 4. Firebase 프로젝트 설정 확인

현재 설정:
- **Project ID**: `docapp-9d7d7`
- **Storage Bucket**: `docapp-9d7d7.firebasestorage.app`

확인 사항:
1. Firebase Console → 프로젝트 설정
2. Storage가 활성화되어 있는지 확인
3. Storage Bucket 이름이 일치하는지 확인

## 코드 개선 사항

### 추가된 디버깅 로그

모든 파일 업로드 과정에서 상세한 로그가 출력됩니다:

```
[Firebase] 앱 초기화 완료
[Firebase] Storage 초기화 완료
[FileService] 업로드 시작
[FileService] uploadBytes 시작...
[FileService] uploadBytes 완료
[FileService] getDownloadURL 시작...
[FileService] getDownloadURL 완료
```

### 에러 처리 개선

- 모든 Firebase Storage 작업에 try-catch 추가
- 명확한 에러 메시지 제공
- 권한 에러 시 특별 안내

## 문제 해결 체크리스트

- [ ] Firebase Storage 보안 규칙을 임시로 완화했는가?
- [ ] 브라우저 콘솔에 에러 메시지가 있는가?
- [ ] Network 탭에서 업로드 요청이 보이는가?
- [ ] Firebase Console에서 Storage가 활성화되어 있는가?
- [ ] Storage Bucket 이름이 코드와 일치하는가?

## 다음 단계

1. **보안 규칙 완화 후 테스트**
   - 위의 임시 규칙으로 변경
   - 파일 업로드 시도
   - 정상 작동하면 → 보안 규칙 문제 확정

2. **콘솔 로그 확인**
   - 브라우저 콘솔에서 `[FileService]` 로그 확인
   - 어느 단계에서 멈추는지 확인

3. **에러 메시지 분석**
   - 에러 코드 확인
   - 에러 메시지 확인
   - Firebase 문서 참조

## 참고 자료

- [Firebase Storage 보안 규칙](https://firebase.google.com/docs/storage/security)
- [Firebase Storage 에러 코드](https://firebase.google.com/docs/storage/web/handle-errors)
