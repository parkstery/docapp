# Firebase Storage Rules 수정 - 단계별 가이드

## 🎯 목표
Firebase Storage 권한 오류를 해결하여 파일 업로드가 가능하도록 합니다.

## 📋 준비 사항
- Google 계정으로 Firebase Console에 접근 가능
- 프로젝트 `docapp-9d7d7`에 대한 접근 권한

## 🔧 단계별 수정 방법

### 1단계: Firebase Console 접속
1. 브라우저에서 새 탭 열기
2. 주소창에 입력: `https://console.firebase.google.com/`
3. Enter 키 누르기

### 2단계: 프로젝트 선택
1. 화면 상단에서 프로젝트 선택 드롭다운 클릭
2. `docapp-9d7d7` 프로젝트 선택
3. 프로젝트 대시보드로 이동

### 3단계: Storage 메뉴로 이동
1. 왼쪽 사이드바에서 **"Storage"** 클릭
   - "Build" 섹션 아래에 있음
   - Firestore Database, Realtime Database 옆에 있음

### 4단계: Rules 탭 열기
1. Storage 페이지 상단의 탭 중 **"Rules"** 클릭
   - "Files", "Rules", "Usage", "Extensions" 중 하나

### 5단계: 기존 규칙 확인 및 삭제
1. 코드 에디터에 현재 규칙이 표시됨
2. **모든 기존 코드를 선택** (Ctrl+A)
3. **삭제** (Delete 키)

### 6단계: 새 규칙 입력
1. 빈 에디터에 다음 코드를 **정확히** 입력:

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

2. **주의사항**:
   - 따옴표는 작은따옴표(') 사용
   - 중괄호와 괄호가 정확히 일치해야 함
   - 들여쓰기는 공백 2개 또는 4개 사용 (일관성 유지)

### 7단계: 규칙 검증
1. 에디터 하단의 **"Validate"** 또는 **"Rules validated"** 메시지 확인
2. 에러가 있으면 수정

### 8단계: 규칙 게시 (중요!)
1. 에디터 상단 오른쪽의 **"Publish"** 버튼 클릭
2. 확인 대화상자가 나타나면 **"Publish"** 클릭
3. "Rules published successfully" 메시지 확인
4. **이 단계를 건너뛰면 규칙이 적용되지 않습니다!**

### 9단계: 애플리케이션에서 확인
1. 애플리케이션 브라우저 탭으로 돌아가기
2. **하드 리프레시**: Ctrl+Shift+R (Windows) 또는 Cmd+Shift+R (Mac)
3. Google 로그인 확인
4. 파일 업로드 다시 시도

## ✅ 확인 체크리스트

수정 후 다음을 확인하세요:

- [ ] Firebase Console에서 Rules 탭에 새 규칙이 표시됨
- [ ] "Published" 상태로 표시됨
- [ ] 애플리케이션 브라우저를 새로고침함
- [ ] Google 로그인이 되어 있음
- [ ] 브라우저 콘솔(F12)에 인증 상태 로그가 표시됨
- [ ] 파일 업로드 시도 시 오류가 발생하지 않음

## 🐛 문제 해결

### "Publish 버튼이 비활성화되어 있습니다"
- 규칙에 문법 오류가 있을 수 있습니다
- Validate 메시지를 확인하고 오류를 수정하세요

### "규칙을 게시했지만 여전히 오류가 발생합니다"
1. 브라우저 캐시 삭제: Ctrl+Shift+Delete
2. 하드 리프레시: Ctrl+Shift+R
3. 브라우저 콘솔(F12)에서 에러 메시지 확인
4. Network 탭에서 요청 상태 확인

### "Storage가 활성화되지 않았습니다"
1. Firebase Console → Storage
2. "Get started" 버튼이 보이면 클릭
3. Storage 모드 선택 (Test mode 또는 Production mode)
4. Storage 활성화 완료

## 📸 스크린샷 참고

각 단계에서 다음을 확인하세요:
- **1단계**: Firebase Console 로그인 화면
- **2단계**: 프로젝트 선택 드롭다운에 `docapp-9d7d7` 표시
- **3단계**: 왼쪽 사이드바에 "Storage" 메뉴 표시
- **4단계**: 상단 탭에 "Rules" 탭 표시
- **5-6단계**: 코드 에디터에 새 규칙 표시
- **7단계**: "Rules validated" 또는 "Validate" 버튼
- **8단계**: "Publish" 버튼과 "Rules published successfully" 메시지

## 🔒 보안 참고사항

현재 규칙 `allow read, write: if true;`는 **개발/테스트용**입니다.

프로덕션 환경에서는 다음 규칙을 사용하세요:

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
