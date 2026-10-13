# 상세 에디터 타이틀 고정 보고서 (2026-10-09)

- 상태: 구현·자체 검사 완료, supervisor 브라우저 검증 대기 중.
- 작성: Muse (`opencode/muse-spark-1.3-contributor-free`)
- 범위: 기획서/planning, 보고서/reports, 참고/memos(참고), free/TASK, 메모/notes, 트러블슈팅/issues 상세 편집 — 저장 문서 편집과 새 인라인 초안 공통 JSX. BARN(타이틀 입력 없음)은 동작 그대로.

## 1. 문제

- 긴 문서 스크롤 시 타이틀 입력이 스크롤 영역 안에 있어 함께 사라졌다. 바깥 `main` 스크롤이 개입하면 타이틀이 완전히 시야 밖으로 밀렸다.

## 2. 정확한 변경

- `components/TabViews.tsx` (기획서/보고서/참고/메모/트러블슈팅):
  - 상세 루트에 `min-h-0`, 상단 헤더 행(뒤로/제목/액션 버튼)에 `shrink-0` 추가.
  - 카드 내부를 `data-fixed-title` 고정 섹션(`shrink-0`, 날짜 메타 + 타이틀 입력; 보고서의 유형, 트러블슈팅의 심각도/상태 포함)과 `data-body-scroll` 본문 영역(`min-h-0 flex-1 overflow-y-auto`, 본문 에디터 + 첨부)으로 물리 분리. 같은 스크롤 컨테이너 안의 sticky 오버레이가 아니다.
  - 카드 컨테이너에 `min-h-0` 추가. 제목 편집·날짜/메타·툴바·저장/목록 버튼·본문 에디터·첨부·미저장 가드·생성/저장 동작은 그대로(마kup 이동만, 동작 코드 무변경).
- `components/FreeDocView.tsx` (TASK): 동일 분리. 추가로 모바일에서 액션이 넘치지 않도록 헤더 행을 `flex-col sm:flex-row` + 액션 `flex-wrap`으로 조정(狭폭 대응, 그 외 동작 무변경).
- `components/AppDetail.tsx`: 변경 없음. `main`→`max-w-6xl(h-full)`→상세(`h-full`) 높이 체인이 이미 확정 높이이며, 각 flex 단계의 `min-h-0`와 내부 스크롤 영역으로 바깥 스크롤이 생기지 않으므로 손댈 이유가 없었다.
- BARN 상세·스크린샷·라우트·스키마·의존성·인증 변경 없음. 기존 인라인 생성 변경과 NoteView 로딩 순서/본문 유지 수정을 그대로 보존(되돌리기 없음).

## 3. 테스트 확장 (`scripts/new-document-flow.browser.js`만)

- 기존 11종 플로우 테스트 전부 유지(수정 없음).
- 6종 × 데스크톱(1280x900)/모바일(390x844) × 초안/저장 = 24개 스크롤 단언 추가:
  - 긴 본문(120블록) 입력 후 `data-body-scroll`의 `scrollHeight - clientHeight > 200` 확인, 바닥으로 스크롤 시 `scrollTop`이 300 초과로 실질 증가하는지 확인.
  - 스크롤 전후 타이틀 입력 `boundingBox.y` 변화 2px 이내, 뷰포트 안 가시성 유지.
  - `window.scrollY`와 `main.scrollTop`이 0으로 바깥 스크롤 미개입 확인.
  - 저장 상태는 메인 플로우의 v2 문서를 재사용(긴 본문 교체 후 저장), 초안은 파기 대화상자로 정리.
- 모바일 탭 이동은 보이는 반응형 `nav.lg:hidden` 버튼을 사용하고 데스크톱은 기존 `aside`를 사용한다. 기존 픽스처 Firebase 차단·고유 alert 바인딩·에디터 settle 대기를 유지한다. 단언을 완화하지 않았다.

## 4. 자체 검사 (실측)

- `npm.cmd run build`: PASS (Vite 6.4.1, 1837 modules, JS 2308.08kB gzip 668.08kB, 기존 500kB 청크 경고 유지).
- `tsc --noEmit`: NOT clean — 기존 범주 21건(목록 제네릭 14, 첨부 TS2352 1, storage Record 6), 기준 24건 대비 신규 없음. 클린 타입체크를 주장하지 않는다.
- `git diff --check`: PASS (초기 trailing-whitespace 5건은 수정 후 재확인 PASS).
- `node --check scripts/new-document-flow.browser.js`: PASS, 단일 `AsyncFunction(page)` 형태 유지.
- supervisor 브라우저 검증(실행 주체) 대기 중. dev 서버는 supervisor가 시작한다.

## 5. 변경 파일

- `components/TabViews.tsx` — 5개 상세 에디터 타이틀 고정 분리 + flex 수축 수정.
- `components/FreeDocView.tsx` — TASK 동일 분리 + 모바일 액션 래핑.
- `scripts/new-document-flow.browser.js` — 24개 스크롤 단언 추가.
- `docs/20261009-FIXED_EDITOR_TITLE_REPORT.md` — 본 보고서.
- 스테이지/커밋/푸시 미수행.
