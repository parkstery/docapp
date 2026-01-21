# Firebase Storage 권한 오류 빠른 해결 가이드

## ⚠️ 현재 문제
Google 로그인은 성공했지만, Firebase Storage에 파일 업로드 시 권한 오류가 발생합니다.

## ✅ 즉시 해결 방법 (3단계)

### 1단계: Firebase Console 접속
1. 브라우저에서 https://console.firebase.google.com/ 접속
2. 프로젝트 `docapp-9d7d7` 선택

### 2단계: Storage Rules 수정
1. 왼쪽 메뉴에서 **Storage** 클릭
2. 상단 탭에서 **Rules** 클릭
3. 기존 규칙을 모두 삭제하고 다음 코드로 **완전히 교체**:

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

### 3단계: 규칙 적용
1. 오른쪽 상단의 **Publish** 버튼 클릭
2. "Rules published successfully" 메시지 확인
3. 브라우저를 새로고침 (Ctrl+F5)
4. 다시 파일 업로드 시도

## 🔍 확인 방법

### Storage Rules가 올바르게 적용되었는지 확인:
1. Firebase Console → Storage → Rules
2. 위의 규칙이 표시되어 있는지 확인
3. Rules 탭 상단에 "Published" 상태인지 확인

### 브라우저 콘솔 확인:
1. F12로 개발자 도구 열기
2. Console 탭에서 다음 로그 확인:
   - `[FileService] 현재 인증 상태:` - 로그인된 사용자 정보가 표시되어야 함
   - `[FileService] 인증된 사용자로 업로드 시도:` - 이메일이 표시되어야 함

## 🚨 여전히 오류가 발생하는 경우

### 체크리스트:
- [ ] Storage Rules를 수정했는가?
- [ ] **Publish 버튼을 클릭했는가?** (중요!)
- [ ] 브라우저를 새로고침했는가?
- [ ] Google 로그인이 되어 있는가?
- [ ] 브라우저 콘솔에 인증 상태 로그가 있는가?

### 추가 확인:
1. **Network 탭 확인**:
   - F12 → Network 탭
   - 파일 업로드 시도
   - `firebasestorage.googleapis.com` 요청 확인
   - 상태 코드가 200이면 성공, 403이면 권한 문제

2. **Storage 활성화 확인**:
   - Firebase Console → Storage
   - "Get started" 버튼이 보이면 Storage가 비활성화된 것
   - 버튼을 클릭하여 Storage 활성화

## 📝 프로덕션용 규칙 (나중에 적용)

개발이 완료되면 다음 규칙으로 변경하세요:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

이 규칙은:
- 모든 사용자가 파일을 읽을 수 있음
- 인증된 사용자만 파일을 업로드/삭제할 수 있음
