# 첨부파일·인라인 이미지 정책

**작성일**: 2026-04-16

## 1. 저장 스키마

- Firestore 저장 시 **`fileInfoList` 배열**을 표준으로 사용한다.
- 레거시 단일 필드 `fileInfo`는 읽기 호환용으로만 취급하며, **저장 시에는 제거**하고 `fileInfoList`로 통일한다 ([`services/attachments.ts`](../services/attachments.ts), [`services/storage.ts`](../services/storage.ts)의 `save` 경로).

## 2. Storage 경로

- 업로드 경로는 [`services/fileService.ts`](../services/fileService.ts)의 규칙을 따른다:  
  `{entityId}/{section}/{timestamp}_{encodedFileName}`  
  예: 인라인 이미지는 섹션 문자열로 구분 (`freeDocs/{docId}/inline`, 프롬프트 필드별 경로 등).

## 3. 인라인 vs 첨부 목록

| 구분 | 의미 | 예시 |
|------|------|------|
| **인라인** | 본문(마크다운 `![]()` / HTML `<img>` / 에디터)에 삽입되어 표시되는 미디어 | 프리 문서 TipTap, 프롬프트 Rich 필드 |
| **첨부 목록** | `fileInfoList`로 관리되는 파일 링크·다운로드 | 보고서·기획서·참고의 첨부 |

- 동일 파일이 인라인과 목록에 **중복**될 수 있으므로, 삭제 시 Storage 객체와 문서 필드 정합성을 유지할 것.
- URL이 본문에만 있고 `fileInfoList`에 없는 경우(마크다운 이미지 문법만 있는 경우)는 **본문 파싱**으로 수집하지 않으며, Storage 정리는 수동·별도 스크립트로 검토한다.

## 4. 향후 확장

- 필요 시 `FileInfo`에 `role: 'inline' | 'attachment'` 메타를 추가해 정리할 수 있다. 현재는 경로·컬렉션 관례로 구분한다.
