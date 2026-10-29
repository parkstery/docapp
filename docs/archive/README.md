# 보관 문서 (더 이상 사용하지 않음)

이 폴더의 Storage 규칙 가이드는 2026-10-30 이전 기준입니다.
`allow read: if true`, `allow read, write: if true` 같은 **공개 규칙 예시가 들어 있으니 그대로 적용하지 마세요.**

현재 기준(실제 배포되는 규칙)은 저장소 루트의 파일입니다.

- `firestore.rules`, `storage.rules` — 허용 계정만 읽기·쓰기 (`isAllowedUser()`)
- 허용 계정을 바꿀 때는 위 두 파일과 `constants/access.ts`를 함께 수정
- 배포: `firebase deploy --only firestore:rules,storage` (Vercel 배포와 별개)
