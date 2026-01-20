# Firebase Storage CORS 문제 해결

## 문제
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## 원인
Firebase Storage 보안 규칙이 너무 엄격하거나, CORS preflight 요청(OPTIONS)을 허용하지 않아서 발생합니다.

## 해결 방법

### 1. Firebase Console에서 Storage Rules 수정

1. Firebase Console 접속: https://console.firebase.google.com/
2. 프로젝트 선택: `docapp-9d7d7`
3. 왼쪽 메뉴에서 **Storage** 클릭
4. **Rules** 탭 클릭
5. 다음 규칙으로 변경:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // 개발/테스트용 - 모든 읽기/쓰기 허용
      allow read, write: if true;
    }
  }
}
```

6. **Publish** 버튼 클릭

### 2. Storage 활성화 확인

1. Firebase Console → Storage
2. **Get started** 버튼이 보이면 클릭하여 Storage 활성화
3. Storage 모드 선택:
   - **Production mode** 또는 **Test mode** 선택
   - Test mode는 개발 중에 더 관대한 규칙을 제공

### 3. CORS 설정 (필요한 경우)

일반적으로 Firebase Storage는 자동으로 CORS를 처리하지만, 
문제가 지속되면 Google Cloud Console에서 직접 설정:

1. Google Cloud Console 접속: https://console.cloud.google.com/
2. 프로젝트 선택: `docapp-9d7d7`
3. Cloud Storage → Browser → 버킷 선택
4. Permissions 탭에서 CORS 설정 확인

## 임시 해결책 (개발용)

개발 중에는 다음 규칙을 사용:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

## 프로덕션용 규칙 (나중에 적용)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 인증된 사용자만 접근
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
    
    // 또는 특정 경로만 허용
    match /{userId}/{section}/{fileName} {
      allow read: if true; // 읽기는 공개
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 확인 사항

- [ ] Storage가 활성화되어 있는가?
- [ ] Rules가 위의 규칙으로 설정되어 있는가?
- [ ] Publish 버튼을 클릭했는가?
- [ ] 브라우저를 새로고침했는가?
