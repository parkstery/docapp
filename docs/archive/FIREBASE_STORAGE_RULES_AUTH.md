# Firebase Storage Rules - 인증된 사용자용

## 현재 문제
Google 로그인은 성공했지만, Firebase Storage에 파일 업로드 시 권한 오류가 발생합니다.

## 해결 방법: Storage Rules 수정

### Firebase Console에서 Storage Rules 수정

1. **Firebase Console 접속**: https://console.firebase.google.com/
2. **프로젝트 선택**: `docapp-9d7d7`
3. **Storage** → **Rules** 탭 클릭
4. 다음 규칙으로 변경:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 인증된 사용자는 모든 파일 읽기/쓰기 가능
    match /{allPaths=**} {
      allow read: if true;  // 모든 사용자가 읽기 가능
      allow write: if request.auth != null;  // 인증된 사용자만 쓰기 가능
    }
  }
}
```

5. **Publish** 버튼 클릭

### 개발/테스트용 (임시)

개발 중에는 다음 규칙을 사용할 수 있습니다 (모든 사용자 허용):

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

⚠️ **주의**: 이 규칙은 개발/테스트용입니다. 프로덕션에서는 위의 인증 규칙을 사용하세요.

## 확인 사항

1. ✅ Google 로그인이 정상 작동하는지 확인
2. ✅ Firebase Console에서 Storage Rules가 올바르게 설정되었는지 확인
3. ✅ Publish 버튼을 클릭하여 규칙을 적용했는지 확인
4. ✅ 브라우저를 새로고침하고 다시 파일 업로드 시도

## 파일 업로드 경로

현재 파일 업로드 경로 형식:
- `${entityId}/${section}/${timestamp}_${fileName}`
- 예: `appId/reports/1234567890_file.pdf`

Storage Rules는 `/{allPaths=**}` 패턴을 사용하여 모든 경로를 허용합니다.
