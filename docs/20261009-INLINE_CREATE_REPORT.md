# 인라인 새 문서 작성 전환 보고서 (2026-10-09)

- 상태: supervisor-reviewed/completed — 코드 로컬 수락됨. 커밋/푸시는 사용자 명시적 선택 대기 중이며 미수행.
- 작성: Muse (`opencode/muse-spark-1.3-contributor-free`)
- 범위: 기획서/planning, 보고서/reports, 참고/memos, TASK/freeDocs, 메모/notes, 트러블슈팅/issues
- 제외: BARN/prompts, 스크린샷 (기존 플로우 유지)

## 1. 변경 내용

- 6개 뷰의 `작성하기`가 부동 모달 대신, 기존 저장 문서 편집에 쓰는 것과 동일한 상세 에디터 JSX/필드를 빈 초안으로 직접 연다.
- 빈 Firestore 문서를 미리 만들지 않는다. `crypto.randomUUID()`로 안정 초안 ID를 만들고 `isNewDraft` 상태로 구분한다.
- 초안 제목은 `새 ... 작성`, 첫 저장 성공 후 `... 수정`으로 전환된다. 미저장 초안에서는 삭제 버튼을 숨긴다.
- 초안은 `createdAt`이 없으므로 6개 뷰의 날짜 메타 영역에 1970 대신 간결한 `저장 전` 텍스트를 표시한다. 저장 문서의 기존 날짜 표시는 그대로이며 BARN 날짜는 건드리지 않는다. `createdAt`은 여전히 첫 저장 시점 타임스탬프다.
- 첫 저장은 편집과 동일한 본문 변환/검증/첨부 동작을 쓰고, `withListSortRankForCreate`를 1회 적용, 초안 UUID 유지, `createdAt`을 첫 저장 시점에 기록한다. 이후 저장은 같은 문서를 갱신하며 중복 생성하지 않는다(`setDoc` 동일 ID 멱등 + `saving` 가드).
- 목록 새로고침이 초안을 소실 취급해 닫지 않도록 `loadDocs` 계열에 초안 보존 가드를 넣었다(planning; 다른 뷰는 선택 해제 로직이 없거나 동일 가드 적용).
- `useUnsavedEditGuard`를 그대로 재사용해 `목록으로`/뒤로가기를 보호한다. 취소/파기는 Firestore 기록을 만들거나 지우지 않는다. 손대지 않은 초안은 대화상자 없이 복귀한다.
- 저장 버튼은 인라인/첨부 업로드 중과 저장 중에 비활성화된다. 6개 persist 콜백도 시작 시점에 `saving`과 각 뷰의 업로드 플래그(기획서/보고서/참고/메모 `uploading`, 트러블슈팅 `uploading`/`editorUploading`, TASK `uploading`/`uploadingAttachment`)를 검사하고 의존성 배열에 포함하므로, 미저장-가드 대화상자의 저장이 업로드 완료 전 실행되지 않는다. 저장 실패는 초안·본문·필드를 유지하고 `false`를 반환한다. 빈 제목 검증과 TASK 본문 검증을 유지한다.
- 6개 뷰의 구 생성 모달 JSX와 생성 전용 상태/헬퍼(`isModalOpen`, `form`, `*modal*Html`, `openModal`, `handleSave` 등)를 삭제했다. 두 번째 에디터를 복사하지 않았다.
- 메모 편집기는 기존에 `setUploading={() => {}}`였으나, 계약상 저장 비활성화 조건을 맞추기 위해 실제 `uploading` 상태를 연결했다. 그 외 동작 변경 없음.
- 새 `any`/`unknown` 캐스트 없음. 기존 `any`(보고서/참고 persist) 유지.

## 2. 정확한 파일

- 수정: `components/TabViews.tsx` (기획서/보고서/참고/메모/트러블슈팅 5개 뷰)
- 수정: `components/FreeDocView.tsx` (TASK 뷰)
- 추가: `scripts/new-document-flow.browser.js` (Playwright 검증 아티팩트, 단일 `async (page) => {...}` 식)
- 추가: 본 보고서 `docs/20261009-INLINE_CREATE_REPORT.md`
- 변경 없음: BARN 모달(`TabViews.tsx` 내 `새 BARN` 모달 유지), 스크린샷 플로우, 라우트, 스키마, 의존성, 보안 규칙, `.playwright-mcp/`, `docs/20261009-MUSE_SUPERVISION_PLAN.md`

## 3. 최종 테스트 (supervisor 독립 검증)

- 브라우저 픽스처 11종 전부 PASS: planning, reports, memos, free, notes, issues, discard, untouched, failedSave, attachments, barnModal. 증거: `.playwright-mcp/inline-create-browser-final-results.json`.
- 6종 실제 UI 생성/저장/재저장/재오픈에서 제목·본문·유형/심각도/상태 보존 확인, 동일 ID·무중복, 초기 정렬 랭크(신규가 시드 위·2차 저장 유지) 확인. 파기/무수정 복귀 시 쓰기 0, 저장-실패 시 제목+본문 유지, 참조 첨부 및 시드 보고서 첨부 보존, BARN 모달 무변경 확인. 픽스처 기반이며 실제 Firebase 인증 E2E가 아님.
- `npm.cmd run build`: PASS (Vite 6.4.1, 1837 modules, 10.50s, JS 2307.28kB gzip 667.88kB, 기존 청크 경고 유지).
- `tsc --noEmit`: NOT passed — 기존 범주 21건 잔존(기준 24건). 신규 종류·신규 캐스트 없음.
- `git diff --check`: PASS.
- `node --check scripts/new-document-flow.browser.js`: PASS.
- NoteView 본문 소실(목록 로딩 언마운트→빈 초안 리마운트) 결함은 supervisor가 발견했고, 활성 에디터 마운트 유지로 수정 후 재검증 PASS.

## 4. 브라우저 아티팩트 설명

- `scripts/new-document-flow.browser.js`는 supervisor가 `browser_run_code_unsafe`로 실행한다. 대상은 supervisor가 띄운 전용 Vite dev 서버 `http://127.0.0.1:4175`.
- `page.route`로 `services/storage.ts`, `services/fileService.ts`, `contexts/AuthContext.tsx` 서빙 모듈을 격리 인메모리 픽스처로 교체한다. 앱 프로덕션 소스·인증을 건드리지 않는다. Firebase계 네트워크는 첫 내비게이션 이전에 먼저 차단한다. 실제 앱 웜업 내비게이션은 하지 않으며, React import URL은 `page.request.get(BASE + '/contexts/AuthContext.tsx')` 평문 조회(모듈 실행 없음)로 구하고 공백/따옴표를 허용하는 정규식으로 파싱한 뒤, 픽스처 라우트를 먼저 등록하고 나서야 첫 앱 내비게이션을 수행한다.
- React 중복 인스턴스 방지를 위해 앱과 동일한 최적화 dep URL을 평문 조회로 구해 픽스처에 사용한다. 최적화 dep가 default만 export하므로 픽스처는 default import 후 구조분해한다. 네이티브 alert 차단을 피하기 위해 실행별 고유 노출 함수명으로 페이지 내 래퍼를 설치하고 메시지를 기록한다. 재오픈 조회는 보이는 데스크톱 행에만 매칭되는 exact 제목 로케이터를 쓴다.
- 시드: `supervisor-fixture` 프로젝트 + 6종 각 1건(보고서 시드에 첨부 1건, 기획서 시드에 수동 `listSortRank: 5`) + BARN 1건. 쓰기/삭제/업로드를 기록하고 1회성 저장 실패를 주입할 수 있으며 `window.__DOCAPP_FIXTURE__`에만 노출한다.
- 6종 각각: 작성 클릭→`data-edit-scope`+`새 ... 작성` 확인, 오버레이 0·선쓰기 0·삭제 버튼 0 확인, 빈 제목 거부 확인, 제목+본문(+유형/심각도/상태) 입력→저장→ID/본문 보존·`... 수정` 전환·삭제 버튼 표시 확인, 2차 저장 중복 없음 확인, 목록 복귀→재오픈 값 보존 확인. 기획서는 첫 저장 랭크가 시드(5)보다 위(작은 값)인지, 2차 저장 후 랭크가 그대로인지도 확인한다.
- 추가: 기획서 변경-초안 파기(`아니오`, 쓰기/삭제 0), 참고 무수정 초안 청정 복귀, 메모 저장-실패 시 제목+본문 유지 후 파기 대화상자 정상 처리, 참고 첨부 업로드 배선+보고서 시드 첨부 보존, BARN `새 BARN` 모달 존속 확인.
- 각 케이스는 실패해도 `recoverToList()`(BARN 모달 닫기·미저장 대화상자 파기·목록 복귀 시도)로 후속 케이스가 멈추지 않게 하며, 결과는 종류별 `pass`/`fail: 사유` JSON으로 반환하고 종료 시 `unrouteAll`로 모크를 정리한다. 제한 ~120s.

## 5. 남은 한계

- 인증 후 실 Firebase CRUD/첨부/붙여넣기/새로고침, Firebase 규칙 감사는 미수행. 픽스처 기반 검증을 실 Firebase 인증 E2E로 주장하지 않는다.
- 타입 검사 21건(기존 범주) 잔존. 본 변경이 추가한 오류는 없다.
- 코드 로컬 수락됨. 커밋/푸시는 자동 승인 검토 보류로 차단되어 있으며 사용자 명시적 선택 없이는 시도하지 않았다.
