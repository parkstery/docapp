# 운영·보안 점검 체크리스트

**작성일**: 2026-04-16  
**대상**: docapp (Firebase Firestore / Storage / Auth)

## 1. Firestore 규칙

- [ ] 인증되지 않은 사용자는 읽기·쓰기 불가 (`request.auth != null`).
- [ ] 사용자는 **본인이 소유한 데이터**만 읽고 쓸 수 있는지 검토 (예: `resource.data.userId == request.auth.uid` 또는 앱 단위 멤버십 필드).
- [ ] `apps` 및 하위 컬렉션(`planning`, `reports`, `prompts`, `memos`, `freeDocs`, `issues`, `screenshots`, `notes`)에 동일한 원칙이 적용되는지 확인.
- [ ] 규칙 배포 후 Firebase Console에서 시뮬레이터로 시나리오 테스트.

## 2. Storage 규칙

- [ ] 업로드·삭제·읽기가 `request.auth != null`과 경로 정책과 일치하는지 확인.
- [ ] 공개 읽기가 필요한 경우에만 `read` 완화; 기본은 최소 권한.
- [ ] 프로젝트 내 문서: `docapp` 저장소의 `FIREBASE_STORAGE_RULES_*.md` 가이드와 실제 규칙이 일치하는지 점검.

## 3. 클라이언트

- [ ] 프로덕션 빌드에서 **불필요한 디버그 로그**가 콘솔에 남지 않는지 확인 (`devLog`는 개발 모드에서만 출력).
- [ ] `dangerouslySetInnerHTML` 사용 구간은 **DOMPurify 등으로 정화**하는 정책 유지 ([`services/sanitizeHtml.ts`](../services/sanitizeHtml.ts)).

## 4. 비밀·설정

- [ ] API 키는 클라이언트에 노출될 수 있음을 전제로, **규칙으로 실데이터 보호** (키 자체는 “비밀”이 아님).
- [ ] 서비스 계정 키 JSON은 저장소에 커밋하지 않음.

## 5. 배포

- [ ] Vercel(또는 호스팅) 환경 변수에 민감 정보를 두지 않는지 확인 (본 앱은 주로 클라이언트 Firebase 설정).

이 목록은 정기적으로(예: 분기별) 검토하는 것을 권장합니다.
