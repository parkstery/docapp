# 개발 진행 현황 분석 보고서

**작성일**: 2025-02-04  
**프로젝트**: DevManager Pro (docapp)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **앱명** | DevManager Pro |
| **설명** | 기획·보고서·프롬프트·트러블슈팅을 포함한 앱 개발 생명주기 관리 시스템 |
| **저장소** | https://github.com/parkstery/docapp |
| **배포** | Vercel 배포 가이드 준비 완료 |

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트** | React 18.2, TypeScript 5.8, Vite 6.2 |
| **라우팅** | react-router-dom 6.22 (HashRouter) |
| **백엔드/인프라** | Firebase (Firestore, Storage, Auth) |
| **UI** | lucide-react, Tailwind 스타일 (prose 등) |
| **기타** | leaflet, react-leaflet (지도 등) |

---

## 3. 구현 완료 기능

### 3.1 인증 및 라우팅

- **AuthContext**: 로그인 상태 관리
- **ProtectedRoute**: 미인증 시 `/login` 리다이렉트
- **라우트**: `/`(대시보드), `/app/:id`(앱 상세), `/login`, `/help`, `/privacy`, `*` → `/`

### 3.2 대시보드 (Dashboard)

- 앱 프로젝트 목록 조회
- 앱 추가·수정·삭제 (이름, 설명, 버전, 플랫폼)
- 검색
- 로그아웃

### 3.3 앱 상세 (AppDetail)

- **6개 탭**: 기획서, 보고서, 프롬프트, 참고, 트러블슈팅, 스크린샷
- 탭별 CRUD 및 목록/상세 뷰

### 3.4 기획서 (PlanningView)

- 목록·상세·추가·수정·삭제
- **Markdown 인라인 편집** + 우측 미리보기
- 제목 + `content`(Markdown) 필드

### 3.5 보고서 (ReportView)

- 목록·상세·추가·수정·삭제
- **일반 편집**: 제목, 유형(CodeAnalysis / ProjectAnalysis / Interim / Final / Other), 요약(텍스트), 첨부파일
- **첨부파일**: 업로드(드래그 앤 드롭·클릭), 읽기·다운로드·삭제 링크
- **마크업 모드**(간이 구현):
  - "마크업" / "일반 편집" 토글
  - 마크업 시: **보기** / **편집** 전환
  - 편집: `summary` 필드를 textarea로 직접 편집
  - 보기: `summary`를 줄 단위로 간단 렌더링 (# → h1, ## → h2, ** → strong, * → em, - → li 등)

### 3.6 기타 탭

- **프롬프트**: 목록·상세·추가·삭제, 태그, 첨부파일
- **참고(Memo)**·**트러블슈팅(Issue)**·**스크린샷**: 각각 타입에 맞는 CRUD 및 파일/이미지 처리

### 3.7 정적 페이지

- **HelpPage**, **PrivacyPage** 구현

### 3.8 인프라·배포

- Firebase: Firestore, Storage, Auth 연동
- `storage.ts`: 앱·기획·보고서·프롬프트·메모·이슈·스크린샷 CRUD
- `fileService.ts`: 업로드·삭제
- Vercel·GitHub 배포 가이드 및 Firebase Storage 규칙 관련 문서 다수

---

## 4. 데이터 모델 (types.ts) 현황

| 타입 | 비고 |
|------|------|
| **AppProject** | id, name, description, version, platform, createdAt |
| **PlanningDoc** | BaseItem + content (Markdown) |
| **Report** | BaseItem + type, summary, fileName?, fileInfo?, fileInfoList? — **markupContent 없음**, type에 **'Markup' 미포함** |
| **FileInfo** | id, name, url, size?, type?, date |
| **PromptLog, Memo, Issue, Screenshot** | 각각 정의됨 |

---

## 5. 계획 대비 진행 상황: 보고서 Markup 보기/편집

**참고 문서**: `docs/PLAN_REPORT_MARKUP_VIEW_EDIT.md`

### 5.1 계획 요약

- 보고서 상세에서 **Markup 문서**(HTML/MD/XML) 인라인 **보기·편집**
- `Report.markupContent` 추가, (선택) type에 `'Markup'` 추가
- `utils/markupReport.ts`: `isMarkupReport`, `isMarkupFile`, `getMarkupKind`
- 첨부파일이 Markup이면 URL fetch 후 표시/편집
- 보기: HTML(iframe/sanitize), Markdown, XML(pre) 렌더링
- 편집: textarea/에디터 + (선택) 미리보기, 저장 시 `markupContent` 또는 파일 재업로드

### 5.2 현재 구현 상태

| 계획 항목 | 상태 | 비고 |
|-----------|------|------|
| `Report.markupContent` 추가 | ❌ 미구현 | types.ts에 없음 |
| `Report.type`에 `'Markup'` 추가 | ❌ 미구현 | |
| `utils/markupReport.ts` | ❌ 미구현 | 해당 파일 없음 |
| "Markup 문서" 섹션 조건부 노출 (`isMarkupReport`) | ❌ 미구현 | 항상 "마크업" 토글로 진입 가능 |
| 보기/편집 전환 버튼 | ✅ 구현 | 마크업 모드 내 보기/편집 |
| 편집 모드 (textarea) | ✅ 구현 | `summary` 필드 사용 |
| 보기 모드 (렌더링) | ⚠️ 간이 구현 | `summary` 줄 단위 간단 마크다운만 (#, ##, **, *, -) |
| HTML/XML/파일 URL fetch | ❌ 미구현 | |
| `markupContent` 전용 저장 | ❌ 미구현 | 현재는 `summary`만 저장 |
| HTML sanitize / iframe sandbox | ❌ 미구현 | |

**정리**: 보고서 상세에는 **“마크업” 모드**가 있어, **요약(summary)**을 마크다운처럼 보기/편집할 수 있는 **간이 버전**만 구현된 상태입니다. 계획서의 **전용 필드(markupContent)**, **파일 기반 Markup**, **HTML/XML 렌더링·보안**은 아직 반영되지 않았습니다.

---

## 6. 디렉터리 구조 요약

```
docapp/
├── App.tsx, index.tsx, index.html
├── components/     → Dashboard, AppDetail, TabViews(대용량), LoginPage, HelpPage, PrivacyPage
├── contexts/       → AuthContext
├── services/       → storage, fileService, authService
├── constants/      → contact
├── types.ts
├── docs/           → PLAN_REPORT_MARKUP_VIEW_EDIT.md, 본 보고서
├── Firebase/배포 관련 .md 다수
└── vercel.json, vite.config.ts, tsconfig.json
```

- **utils/** 폴더 없음 (계획된 `markupReport.ts` 미생성)

---

## 7. 권장 후속 작업 (우선순위)

1. **Markup 계획 1·2단계 적용**  
   - `types.ts`: `Report`에 `markupContent?: string`, (선택) `type`에 `'Markup'`  
   - `utils/markupReport.ts`: `isMarkupReport`, `isMarkupFile`, `getMarkupKind` 구현  

2. **ReportView 정교화**  
   - `markupContent` 우선 사용, 없으면 Markup 첨부파일 URL fetch  
   - Markup인 경우에만 "Markup 문서" 섹션 노출 (`isMarkupReport(editForm)`)  
   - HTML은 sanitize 또는 iframe sandbox, Markdown은 기획서와 동일 방식 또는 react-markdown  

3. **보안·안정성**  
   - HTML 렌더 시 XSS 방지(DOMPurify 등)  
   - CORS·대용량 파일 정책 정리(계획서 8장 참고)  

4. **운영**  
   - 배포 후 실제 로그인·파일 업로드·Storage 규칙 동작 검증  
   - 불필요한 `console.log` 정리(예: App.tsx, TabViews.tsx)

---

## 8. 결론

- **핵심 플로우**: 로그인 → 대시보드 → 앱 선택 → 기획/보고서/프롬프트/참고/이슈/스크린샷 탭에서 CRUD 및 파일 첨부까지 **동작하는 상태**입니다.  
- **보고서 Markup**: 계획서에 비해 **요약 필드 기반의 간이 마크업 보기/편집**만 구현되어 있으며, **전용 필드·유틸·파일 기반 Markup·HTML/XML 렌더링**은 추가 개발이 필요합니다.

이 문서는 위 내용을 기준으로 개발 진행 현황을 분석한 보고서입니다.
