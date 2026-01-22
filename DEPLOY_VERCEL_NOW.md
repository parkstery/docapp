# Vercel 배포 가이드 - 즉시 배포

## 🚀 빠른 배포 방법

### 방법 1: Vercel CLI 사용 (권장)

#### 1단계: Vercel 로그인
```bash
vercel login
```
브라우저가 열리면 GitHub/GitLab/Bitbucket 계정으로 로그인하세요.

#### 2단계: 프로젝트 배포
```bash
vercel --prod
```

처음 배포 시:
- 프로젝트 이름 설정 (기본값: `docapp` 또는 `devmanager-pro`)
- 배포 설정 확인
- 환경 변수 설정 (필요한 경우)

#### 3단계: 배포 완료 확인
배포가 완료되면 다음과 같은 URL이 표시됩니다:
- Production: `https://docapp-tawny.vercel.app` 또는 `https://your-project.vercel.app`

### 방법 2: Vercel 웹 대시보드 사용

#### 1단계: Vercel 웹사이트 접속
1. https://vercel.com 접속
2. GitHub/GitLab/Bitbucket 계정으로 로그인

#### 2단계: 새 프로젝트 생성
1. "Add New..." → "Project" 클릭
2. Git 저장소 선택 또는 "Import Git Repository" 클릭
3. 프로젝트를 선택하거나 새로 생성

#### 3단계: 프로젝트 설정
프로젝트 설정이 자동으로 감지됩니다:
- **Framework Preset**: Vite (자동 감지)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동 감지)
- **Output Directory**: `dist` (자동 감지)
- **Install Command**: `npm install` (자동 감지)

#### 4단계: 환경 변수 설정 (필요한 경우)
- Settings → Environment Variables
- 다음 변수 추가 (필요한 경우):
  - `GEMINI_API_KEY` (사용하는 경우)

#### 5단계: 배포
1. "Deploy" 버튼 클릭
2. 배포 완료 대기 (약 1-2분)
3. 배포된 URL 확인

### 방법 3: GitHub 연동 (자동 배포)

#### 1단계: GitHub에 코드 푸시
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

#### 2단계: Vercel에서 GitHub 연동
1. Vercel 웹사이트 접속
2. "Add New..." → "Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정 확인
5. "Deploy" 클릭

#### 3단계: 자동 배포 설정
- Settings → Git
- "Production Branch" 설정 (기본: `main` 또는 `master`)
- 이후 Push 시 자동 배포

## 📋 배포 전 체크리스트

- [x] `vercel.json` 파일 확인됨
- [x] 로컬에서 `npm run build` 성공
- [ ] Vercel 계정 생성/로그인
- [ ] 프로젝트 배포 완료
- [ ] 배포된 URL 접속 확인
- [ ] 로그인 기능 테스트
- [ ] 파일 업로드 기능 테스트
- [ ] Firebase 승인된 도메인에 Vercel 도메인 추가

## 🔧 현재 프로젝트 설정

### 빌드 설정
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 18.x (권장)

### Vercel 설정 파일 (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 🌐 Firebase 설정 확인

### Firebase 승인된 도메인 추가
배포 후 Firebase Console에서 다음 작업을 수행하세요:

1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 `docapp-9d7d7` 선택
3. Authentication → Settings → 승인된 도메인
4. 다음 도메인 추가:
   - `docapp-tawny.vercel.app`
   - `your-project.vercel.app` (실제 배포된 도메인)
   - 커스텀 도메인 (사용하는 경우)

### Firebase Storage CORS 설정
일반적으로 Firebase Storage는 자동으로 CORS를 처리하지만, 문제가 발생하면:

1. Google Cloud Console 접속
2. 프로젝트 `docapp-9d7d7` 선택
3. Cloud Storage → Browser → 버킷 선택
4. Permissions → CORS 설정 확인

## ✅ 배포 후 확인 사항

### 1. 빌드 성공 확인
- Vercel 대시보드에서 빌드 로그 확인
- 에러가 없으면 성공

### 2. 애플리케이션 동작 확인
- 배포된 URL 접속
- 로그인 기능 테스트
- 파일 업로드 기능 테스트
- 보고서 작성 기능 테스트
- 체크박스 선택 및 삭제 기능 테스트

### 3. 라우팅 확인
- SPA 라우팅이 정상 작동하는지 확인
- 새로고침 시 404 오류가 발생하지 않는지 확인

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

## 🎉 배포 완료 후

배포가 완료되면:
1. 배포 URL 공유: `https://docapp-tawny.vercel.app`
2. 커스텀 도메인 연결 (선택사항)
3. 모니터링 설정 (선택사항)
4. Analytics 설정 (선택사항)

## 📝 다음 단계

배포가 완료되면:
1. ✅ 빌드 성공 확인
2. ✅ 애플리케이션 동작 확인
3. ✅ Firebase 승인된 도메인 추가
4. ✅ 모든 기능 테스트

---

**참고**: 현재 프로젝트는 빌드가 성공적으로 완료되었습니다. Vercel에 로그인한 후 `vercel --prod` 명령어로 배포할 수 있습니다.
