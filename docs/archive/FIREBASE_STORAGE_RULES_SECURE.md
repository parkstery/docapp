# Firebase Storage 보안 규칙 - 프로덕션용

## 🎯 목표
인증된 사용자만 파일을 업로드할 수 있도록 보안 규칙을 설정합니다.

## 🔒 보안 규칙 (권장)

### 기본 보안 규칙
인증된 사용자만 업로드/삭제 가능, 모든 사용자가 읽기 가능:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // 모든 사용자가 파일 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 파일 업로드/삭제 가능
      allow write: if request.auth != null;
    }
  }
}
```

### 세밀한 보안 규칙 (추천)
경로별로 세밀한 제어가 필요한 경우:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 보고서 파일
    match /{appId}/reports/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 스크린샷
    match /{appId}/screenshots/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 기타 파일 (필요한 경우)
    match /{appId}/{section}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 고급 보안 규칙
파일 크기 제한 및 파일 타입 제한:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{appId}/{section}/{fileName} {
      // 모든 사용자가 파일 읽기 가능
      allow read: if true;
      
      // 인증된 사용자만 업로드 가능
      allow write: if request.auth != null
        // 파일 크기 제한 (10MB)
        && request.resource.size < 10 * 1024 * 1024
        // 파일 타입 제한 (이미지, PDF 등)
        && (request.resource.contentType.matches('image/.*') 
            || request.resource.contentType.matches('application/pdf')
            || request.resource.contentType.matches('application/.*'));
    }
  }
}
```

## 📋 적용 방법

### 1단계: Firebase Console 접속
1. https://console.firebase.google.com/ 접속
2. 프로젝트 `docapp-9d7d7` 선택

### 2단계: Storage Rules 수정
1. Storage → Rules 탭 클릭
2. 기존 규칙을 위의 보안 규칙 중 하나로 교체
3. **Publish** 버튼 클릭

### 3단계: 테스트
1. 애플리케이션에서 Google 로그인
2. 파일 업로드 시도
3. 정상 작동 확인

## 🔍 문제 해결

### "인증된 사용자인데도 업로드가 안 됩니다"

#### 1. 인증 상태 확인
브라우저 콘솔(F12)에서 다음 로그 확인:
```
[FileService] 현재 인증 상태: { uid: '...', email: '...', displayName: '...' }
```

로그인되지 않았다면:
- Google 로그인 버튼 클릭
- 로그인 완료 확인

#### 2. Storage Rules 확인
Firebase Console → Storage → Rules에서:
- `allow write: if request.auth != null;` 규칙이 있는지 확인
- **Publish** 버튼을 클릭했는지 확인

#### 3. 브라우저 캐시 삭제
- Ctrl+Shift+Delete
- 캐시된 이미지 및 파일 선택
- 삭제 후 하드 리프레시 (Ctrl+Shift+R)

#### 4. Network 탭 확인
- F12 → Network 탭
- 파일 업로드 시도
- `firebasestorage.googleapis.com` 요청 확인
- 상태 코드 확인:
  - **200**: 성공
  - **401**: 인증 실패 (로그인 필요)
  - **403**: 권한 없음 (Rules 문제)

### "특정 경로만 업로드가 안 됩니다"

경로 패턴이 맞는지 확인:
- 실제 업로드 경로: `{appId}/reports/{timestamp}_{fileName}`
- Rules의 경로 패턴과 일치하는지 확인

경로가 다르다면 Rules를 수정:
```javascript
match /{appId}/reports/{fileName} {
  // {fileName}은 {timestamp}_{actualFileName} 형식
  allow read: if true;
  allow write: if request.auth != null;
}
```

## ✅ 보안 체크리스트

- [ ] `allow read, write: if true;` 규칙이 제거되었는가?
- [ ] `allow write: if request.auth != null;` 규칙이 적용되었는가?
- [ ] Rules를 Publish 했는가?
- [ ] 로그인한 사용자가 파일 업로드를 시도했는가?
- [ ] 브라우저 콘솔에 인증 상태 로그가 표시되는가?
- [ ] Network 탭에서 요청이 성공하는가?

## 🚨 보안 주의사항

### ❌ 절대 사용하지 말아야 할 규칙
```javascript
// 위험: 모든 사용자가 모든 작업 가능
allow read, write: if true;

// 위험: 시간 제한이 있어도 모든 사용자 허용
allow read, write: if request.time < timestamp.date(2025, 12, 31);
```

### ✅ 안전한 규칙
```javascript
// 안전: 인증된 사용자만 허용
allow write: if request.auth != null;

// 안전: 특정 사용자만 허용 (필요한 경우)
allow write: if request.auth != null 
  && request.auth.uid == '특정-사용자-UID';
```

## 📝 현재 파일 업로드 경로

애플리케이션에서 사용하는 경로 형식:
- 보고서: `{appId}/reports/{timestamp}_{fileName}`
- 스크린샷: `{appId}/screenshots/{timestamp}_{fileName}`

Rules는 이 경로 패턴과 일치해야 합니다.
