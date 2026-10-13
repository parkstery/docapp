# Muse 감독 협업 계획서

- 상태: supervisor-reviewed — supervisor가 원전/테스트 증거와 CLI help를 검증했고, 정정을 최종 파일 확인 조건으로 수락함
- 작성일: 2026-10-09
- 대상 저장소: `C:/20.HDev/docapp`
- 본 문서는 협업 계획/테스트 결과 기록용이며, 애플리케이션 코드 변경이 아님.

## 1. 프로젝트 목적

- 개발 문서, 기억된 지식, 재사용 가능한 명령/데이터/코드를 보존하는 웹 앱.
- 기술 스택: React 18 / TypeScript / Vite / Firebase Auth + Firestore + Storage.
- 현재 8개 탭:
  - `planning` 기획서
  - `reports` 보고서
  - `prompts` BARN
  - `memos` 참고
  - `free` TASK
  - `notes` 메모
  - `issues` 트러블슈팅
  - `screenshots` 스크린샷
- 본문 형식: Markdown/혼합 HTML 및 TipTap HTML 혼재.
- `DocumentView` 통합 모델과 프로젝트 단위 통합 검색 존재.
- 구현된 기능과 제안된 기능을 구분한다. 제안은 승인 없이는 실행 승인이 아니다.

## 2. 역할

### Supervisor

- 작업 범위와 수용 기준을 정한다.
- diff를 직접 검사한다.
- 독립적으로 테스트한다.
- accept/reject를 결정한다.
- 애플리케이션 코드를 직접 작성하지 않는다.

### Muse

- 배정된 범위만 구현한다.
- 증거를 제출한다.
- 스스로 승인하지 않는다.
- 조용히 모델을 바꾸지 않는다.
- 사용 모델: `opencode/muse-spark-1.3-contributor-free`
- 무료 모델 가격 정책이 영원히 유지된다고 가정하지 않는다.

## 3. 실행 환경

- 설치됨: OpenCode v2.0.24
- 실행 파일:
  - `C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe`
  - PATH에 없음. PowerShell에서 전체 경로로 호출.
- 테스트된 세션:
  - `ses_ee00df935ffe7uLfoeZLTZQtZS`
- `--auto`는 사용하지 않는다.

### PowerShell 명령 예시

읽기 전용 조사:

```powershell
& "C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe" models
& "C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe" models | Select-String muse-spark
& "C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe" run --standalone --model opencode/muse-spark-1.3-contributor-free --agent plan --format json "C:/20.HDev/docapp 읽기 전용 분석: 8개 탭 라벨과 문서-코드 불일치를 파일/줄 증거로 보고"
```

범위가 한정된 구현 작업:

```powershell
& "C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe" run --standalone --model opencode/muse-spark-1.3-contributor-free --agent build --format json "작업지시서 WO-XXXX 범위의 파일만 수정"
```

같은 세션에서 수정 지시:

```powershell
& "C:/Users/kdrea/AppData/Local/Programs/@opencodedesktop/resources/opencode-cli.exe" run --standalone --model opencode/muse-spark-1.3-contributor-free --session ses_ee00df935ffe7uLfoeZLTZQtZS --agent build --format json "리뷰 지적 항목만 같은 범위에서 수정"
```

위 예시는 형식 예시이며, 존재하지 않는 권한 플래그를 만들지 않는다. 제안된 작업지시는 실행 승인이 아니다.

## 4. 협업 사이클

1. 기준 `git status` 확인.
2. 읽기 전용 조사.
3. 작업지시서 발행:
   - 목적
   - 대상 파일
   - 비목표
   - 수용 기준
   - 테스트 명령
4. Muse의 제한된 변경.
5. supervisor의 diff/원전 검사.
6. 독립 테스트.
7. 필요 시 같은 세션에서 수정 지시.
8. 증거 정리와 accept/reject.

기존 `.cursor/rules/git-push-after-changes.mdc`에는 코드 수정 후 commit/push하라는 규칙이 있다. 이번 테스트는 코드 변경이 없으므로 commit/push를 하지 않았다. 이후 실제 코드 구현 전에 이 규칙이 supervisor 검토 절차와 어떻게 함께 동작할지 먼저 정리한다. push하지 않고 push했다고 주장하지 않는다.

## 5. 2026-10-09 검증된 테스트

### 빌드

- 명령: `npm.cmd run build`
- 결과: PASS
- Vite 6.4.1, 1837 modules, 12.09s
- JS 2330.20kB, gzip 670.78kB
- 500kB 초과 경고 있음.

### 타입 검사

- 명령: `node_modules/.bin/tsc.cmd --noEmit`
- 결과: FAIL
- 기존 진단 24개:
  - 목록 제네릭 17개: `FreeDocView`/`TabViews`
  - 첨부 캐스트 1개: TS2352
  - `Record` 호환성 6개: `storage`
- `package.json`에 test/lint 스크립트 없음.

### 브라우저 미리보기

- 주소: `127.0.0.1:4173`
- 확인됨:
  - 로그인 화면에 Google 버튼 있음.
  - 도움말/개인정보 제목 렌더링됨.
  - 미인증 상태에서 `/#/app/supervisor-test` 접근 시 로그인으로 리다이렉트됨.
- 콘솔: 오류 0개, Tailwind CDN 프로덕션 경고 1개.
- 미테스트:
  - 인증 후 CRUD
  - 첨부
  - 붙여넣기/저장/새로고침
  - Firebase 규칙 감사
- 미리보기 서버는 중지함.
- Windows 샌드박스 시작 실패는 앱 결함이 아니며, supervisor는 허용된 상위 도구 실행을 사용했음.

## 6. 실제 Muse 테스트 결과

- 최초 읽기 전용 분석 성공.
- 탭 라벨 8개 보고 정확.
- Leaflet 문서 불일치 지적 정확: 문서는 제거되었다고 하나 의존성이 남아 있음.
- supervisor가 다음 두 주장을 기각:
  - 스크린샷/메모 첨부 유실 결함
  - `freeDocs`/`free` 매핑 버그
- Muse는 `types.ts`와 `ProjectSearchModal`을 다시 읽고 두 주장을 철회했음.
- 근거:
  - 해당 타입들에 `FileInfo` 필드가 없음.
  - `kindToTab`이 `freeDocs`를 `free`로 명시적으로 변환함.
- 읽기/피드백 순환은 검증됨.
- 애플리케이션 코드 구현 순환은 아직 테스트되지 않음.
- 코드 변경 없음.
- 브라우저 증거 `.playwright-mcp/`는 별도로 생성됨.

## 7. 향후 우선순위: 구현하지 않음

다음은 우선순위 기록이며, 본 문서에서는 구현하지 않는다:

1. 기존 24개 타입 오류 해소.
   - 정렬/레거시 첨부 동작 보존.
   - `any` 또는 `unknown` 캐스트로 오류를 숨기지 않음.
2. 오래된 문서 갱신.
   - Leaflet이 제거되었다는 서술과 잔존 의존성 불일치.
   - BARN/TASK 명칭과 구 보고서 서술 불일치.
3. 명령/코드 보존 스니펫 기능 전에 정확한 테스트를 먼저 설계.
   - 저장-새로고침-복사를 거쳐 다음이 보존되어야 함:
     - 한국어
     - 여러 줄 명령
     - 따옴표
     - 달러 기호
     - 백틱
     - 백슬래시
     - 코드 펜스
     - 빈 줄
     - 표
   - 저장된 스니펫을 절대 실행하지 않음.
   - 클립보드 실패를 눈에 보이게 표시.
4. 품질 게이트: 타입 검사 + 빌드 + 집중 동작 테스트.

## 8. 작업지시서 템플릿

```markdown
# WO-XXXX: [제목]

## 목적
- [왜 필요한지 2~3줄]

## 대상 파일
- [예: components/TabViews.tsx]
- [예: types/documentModel.ts]

## 비목표
- [건드리지 않을 파일/기능]
- [이번에 하지 않을 마이그레이션]

## 수용 기준
1. [관찰 가능한 동작]
2. [회귀 없음]
3. [타입 검사/빌드 기대 결과]

## 테스트 명령
- [예: node_modules/.bin/tsc.cmd --noEmit]
- [예: npm.cmd run build]
- [예: 브라우저 수동 절차]

## 증거 요구
- 변경 파일 목록
- diff 요약
- 테스트 출력
- 미테스트 항목 명시
```

## 9. 결과 보고 템플릿

```markdown
# Result WO-XXXX: [제목]

## 변경 파일
- [경로]
- [경로]

## diff 요약
- [핵심 변경 5줄 이내]

## 테스트
- 명령:
- 결과:
- 출력 요약:

## 미테스트
- [남은 항목]

## 모델
- opencode/muse-spark-1.3-contributor-free

## 상태 요청
- supervisor accept/reject 대기
```

## 10. 문서 상태

- 현재 상태: supervisor-reviewed — supervisor가 원전/테스트 증거와 CLI help를 검증했고, 정정을 최종 파일 확인 조건으로 수락함
- 본 문서는 Muse 작성, supervisor 검토 완료로 변경한다.
- 본 문서의 향후 우선순위는 계획이며 실행 지시가 아니다.
- 테스트 결과를 새로 만들지 않았으며, 가격 가정을 하지 않는다.
