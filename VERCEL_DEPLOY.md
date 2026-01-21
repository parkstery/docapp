# Vercel 배포 가이드

## 🚀 배포 준비 완료

프로젝트에 Vercel 배포 설정이 완료되었습니다.

## 📋 배포 단계

### 방법 1: Vercel CLI 사용 (권장)

#### 1단계: Vercel CLI 설치
```bash
npm install -g vercel
```

#### 2단계: Vercel 로그인
```bash
vercel login
```

#### 3단계: 프로젝트 배포
```bash
vercel
```

처음 배포 시:
- 프로젝트 이름 설정
- 배포 설정 확인
- 환경 변수 설정 (필요한 경우)

#### 4단계: 프로덕션 배포
```bash
vercel --prod
```

### 방법 2: Vercel 웹 대시보드 사용

#### 1단계: Vercel 계정 생성
1. https://vercel.com 접속
2. GitHub/GitLab/Bitbucket 계정으로 로그인

#### 2단계: 프로젝트 가져오기
1. "Add New..." → "Project" 클릭
2. Git 저장소 선택 또는 Import
3. 프로젝트 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동 감지)
   - **Output Directory**: `dist` (자동 감지)
   - **Install Command**: `npm install` (자동 감지)

#### 3단계: 환경 변수 설정 (필요한 경우)
- Settings → Environment Variables
- 다음 변수 추가 (필요한 경우):
  - `GEMINI_API_KEY` (사용하는 경우)

#### 4단계: 배포
1. "Deploy" 버튼 클릭
2. 배포 완료 대기
3. 배포 URL 확인

## 🔧 설정 파일

### vercel.json
- SPA 라우팅을 위한 rewrite 규칙
- 정적 자산 캐싱 설정
- 빌드 명령어 설정

### .vercelignore
- 배포에서 제외할 파일/폴더 지정
- 불필요한 파일 제외로 배포 속도 향상

## 🌐 환경 변수

### Firebase 설정
Firebase 설정은 코드에 하드코딩되어 있습니다 (`services/storage.ts`).
프로덕션 환경에서도 동일한 Firebase 프로젝트를 사용합니다.

### 필요한 경우 환경 변수로 변경
환경 변수를 사용하려면:

1. `.env.production` 파일 생성:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

2. `services/storage.ts` 수정:
```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

3. Vercel에서 환경 변수 설정:
   - Settings → Environment Variables
   - 각 변수 추가

## ✅ 배포 후 확인 사항

### 1. 빌드 성공 확인
- Vercel 대시보드에서 빌드 로그 확인
- 에러가 없으면 성공

### 2. 애플리케이션 동작 확인
- 배포된 URL 접속
- 로그인 기능 테스트
- 파일 업로드 기능 테스트

### 3. Firebase 설정 확인
- Firebase Console → Authentication → Settings
- 승인된 도메인에 Vercel 도메인 추가:
  - `your-project.vercel.app`
  - `your-custom-domain.com` (사용하는 경우)

### 4. Firebase Storage CORS 설정 (필요한 경우)
일반적으로 Firebase Storage는 자동으로 CORS를 처리하지만,
문제가 발생하면 Google Cloud Console에서 설정:
1. Google Cloud Console 접속
2. 프로젝트 `docapp-9d7d7` 선택
3. Cloud Storage → Browser → 버킷 선택
4. Permissions → CORS 설정 확인

## 🔄 자동 배포 설정

### GitHub 연동 시
1. Vercel에서 프로젝트 설정
2. Git 저장소 연결
3. 자동 배포 활성화:
   - Settings → Git
   - "Production Branch" 설정 (기본: `main` 또는 `master`)
   - Push 시 자동 배포

### 브랜치별 배포
- **Production**: `main` 또는 `master` 브랜치
- **Preview**: 다른 브랜치의 Pull Request

## 🐛 문제 해결

### 빌드 실패
1. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```
2. 빌드 로그 확인
3. 에러 메시지에 따라 수정

### 환경 변수 오류
1. Vercel 대시보드 → Settings → Environment Variables
2. 모든 변수가 설정되었는지 확인
3. 변수 이름이 정확한지 확인 (대소문자 구분)

### 라우팅 오류 (404)
- `vercel.json`의 `rewrites` 규칙 확인
- 모든 경로가 `index.html`로 리다이렉트되는지 확인

### Firebase 인증 오류
1. Firebase Console → Authentication → Settings
2. 승인된 도메인에 Vercel 도메인 추가
3. 브라우저 콘솔에서 에러 확인

## 📝 배포 체크리스트

- [ ] `vercel.json` 파일 생성됨
- [ ] `.vercelignore` 파일 생성됨
- [ ] 로컬에서 `npm run build` 성공
- [ ] Vercel 계정 생성/로그인
- [ ] 프로젝트 배포 완료
- [ ] 배포된 URL 접속 확인
- [ ] 로그인 기능 테스트
- [ ] 파일 업로드 기능 테스트
- [ ] Firebase 승인된 도메인에 Vercel 도메인 추가

## 🎉 배포 완료 후

배포가 완료되면:
1. 배포 URL 공유
2. 커스텀 도메인 연결 (선택사항)
3. 모니터링 설정 (선택사항)
4. Analytics 설정 (선택사항)
