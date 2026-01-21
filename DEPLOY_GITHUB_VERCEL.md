# GitHub + Vercel 배포 가이드

## 🎯 현재 상태
- GitHub 저장소: https://github.com/parkstery/docapp
- Vercel 배포 준비 완료

## 📋 배포 단계

### 1단계: 변경사항 커밋 및 푸시

터미널에서 다음 명령어 실행:

```bash
# 변경사항 추가
git add .

# 커밋
git commit -m "Vercel 배포 설정 추가 및 인증 기능 구현"

# GitHub에 푸시
git push origin main
```

### 2단계: Vercel에서 GitHub 연동

#### 방법 A: Vercel 웹 대시보드 사용 (권장)

1. **Vercel 접속**
   - https://vercel.com 접속
   - GitHub 계정 `parkstery`로 로그인

2. **프로젝트 가져오기**
   - "Add New..." → "Project" 클릭
   - "Import Git Repository" 선택
   - `parkstery/docapp` 저장소 선택
   - "Import" 클릭

3. **프로젝트 설정 확인**
   - **Framework Preset**: Vite (자동 감지됨)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (자동 감지됨)
   - **Output Directory**: `dist` (자동 감지됨)
   - **Install Command**: `npm install` (자동 감지됨)

4. **환경 변수 설정** (필요한 경우)
   - Settings → Environment Variables
   - 현재는 Firebase 설정이 코드에 하드코딩되어 있어 불필요
   - 나중에 환경 변수로 변경하면 여기서 설정

5. **배포 실행**
   - "Deploy" 버튼 클릭
   - 배포 완료 대기 (약 1-2분)

#### 방법 B: Vercel CLI 사용

```bash
# Vercel 로그인
vercel login

# GitHub 연동하여 배포
vercel --prod
```

### 3단계: Firebase 승인된 도메인 추가 (필수!)

배포 완료 후 반드시 수행:

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트 `docapp-9d7d7` 선택

2. **승인된 도메인 추가**
   - Authentication → Settings → 승인된 도메인
   - "도메인 추가" 클릭
   - 다음 도메인 추가:
     - `your-project.vercel.app` (Vercel이 제공하는 도메인)
     - 커스텀 도메인 사용 시 해당 도메인도 추가

3. **확인**
   - 도메인이 목록에 표시되는지 확인

### 4단계: 배포 확인

1. **배포된 사이트 접속**
   - Vercel 대시보드에서 배포 URL 확인
   - 또는 `https://docapp.vercel.app` (프로젝트 이름에 따라 다름)

2. **기능 테스트**
   - [ ] 로그인 페이지 표시 확인
   - [ ] Google 로그인 작동 확인
   - [ ] 대시보드 접근 확인
   - [ ] 파일 업로드 기능 확인

## 🔄 자동 배포 설정

GitHub 연동 시 자동으로 설정됨:
- **Production**: `main` 브랜치에 push 시 자동 배포
- **Preview**: 다른 브랜치의 Pull Request 시 프리뷰 배포

### 자동 배포 확인
1. Vercel 대시보드 → 프로젝트 → Settings → Git
2. "Production Branch"가 `main`으로 설정되어 있는지 확인
3. "Automatic deployments"가 활성화되어 있는지 확인

## 🐛 문제 해결

### 배포 실패
1. Vercel 대시보드 → Deployments → 실패한 배포 클릭
2. 빌드 로그 확인
3. 에러 메시지에 따라 수정
4. GitHub에 푸시하면 자동으로 재배포

### 로그인 오류
1. Firebase Console → Authentication → Settings
2. 승인된 도메인에 Vercel 도메인이 추가되었는지 확인
3. 브라우저 콘솔에서 에러 확인

### 파일 업로드 오류
1. Firebase Console → Storage → Rules
2. 보안 규칙이 올바르게 설정되었는지 확인
3. `allow write: if request.auth != null;` 규칙 확인

## 📝 배포 체크리스트

- [ ] 변경사항 커밋 및 푸시 완료
- [ ] Vercel에서 GitHub 저장소 연동
- [ ] 배포 성공 확인
- [ ] Firebase 승인된 도메인에 Vercel 도메인 추가
- [ ] 배포된 사이트에서 로그인 테스트
- [ ] 배포된 사이트에서 파일 업로드 테스트
- [ ] 자동 배포 설정 확인

## 🎉 배포 완료 후

배포가 완료되면:
1. 배포 URL 공유
2. 커스텀 도메인 연결 (선택사항)
3. 모니터링 설정 (선택사항)
4. Analytics 설정 (선택사항)

## 📚 참고 자료

- Vercel 문서: https://vercel.com/docs
- Firebase 인증 설정: https://firebase.google.com/docs/auth
- GitHub Actions (선택사항): https://docs.github.com/en/actions
