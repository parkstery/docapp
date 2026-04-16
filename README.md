# DevManager Pro (docapp)

Firebase 기반 **앱 개발 프로젝트별 문서·첨부·프롬프트·이슈** 관리 웹 앱입니다. Google 로그인 후 사용합니다.

## 요구 사항

- Node.js 18 이상 권장
- Firebase 프로젝트(Firestore, Storage, Authentication — Google 제공자)

## 로컬 실행

1. 의존성 설치

   ```bash
   npm install
   ```

   `Failed to resolve import "dompurify"` 오류가 나면 위 명령을 **프로젝트 루트**에서 다시 실행한 뒤 개발 서버를 재시작하세요. (`package.json`에 `dompurify`가 포함되어 있어야 합니다.)

2. Firebase  
   클라이언트 설정은 [`services/storage.ts`](services/storage.ts)에 있습니다. 운영 시에는 본인의 Firebase 설정으로 교체하고, **Firestore·Storage 보안 규칙**을 반드시 설정하세요. 점검 항목은 [`docs/260416-OPERATIONS_SECURITY_CHECKLIST.md`](docs/260416-OPERATIONS_SECURITY_CHECKLIST.md)를 참고합니다.

3. 개발 서버

   ```bash
   npm run dev
   ```

4. 프로덕션 빌드

   ```bash
   npm run build
   npm run preview
   ```

## 배포

Vercel 등 정적 호스팅에 `dist`를 배포합니다. [`vercel.json`](vercel.json)에 SPA용 rewrite가 있습니다.

## 문서

- [종합 개발 보고서](docs/260416-개발보고서_docapp종합현황.md)
- [장기 계획 — 문서 아키텍처](docs/260416-장기계획_문서아키텍처.md)
- [첨부·인라인 이미지 정책](docs/260416-ATTACHMENTS_POLICY.md)
- [에디터·저장 포맷 로드맵](docs/260416-EDITOR_ROADMAP.md)

## 라이선스

Private 프로젝트입니다.
