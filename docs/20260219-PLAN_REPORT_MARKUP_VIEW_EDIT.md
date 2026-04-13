# 보고서 상세페이지 Markup 문서 보기/편집 기능 계획

## 1. 현황 요약

- **보고서 타입** (`types.ts`): `Report.type` = `'CodeAnalysis' | 'ProjectAnalysis' | 'Interim' | 'Final' | 'Other'`, `summary`, `fileInfo`(선택).
- **보고서 수정 페이지** (`TabViews.tsx` – `ReportView`): 제목, 유형, 요약(텍스트), 첨부파일(업로드/읽기·다운로드·삭제 링크만 제공). **첨부파일 내용의 인라인 보기/편집 없음.**
- **참고**  
  - 기획서(Planning)는 `content`(Markdown) 필드로 **인라인 편집 + 우측 미리보기**를 제공함.  
  - `FileInfo`에 `type`(MIME), `name`(파일명)이 있어 확장자/타입으로 Markup 여부 판별 가능.

---

## 2. 목표

보고서 상세(보고서 수정) 페이지에서 **Markup 형식 문서를 인라인으로 보고 편집**할 수 있도록 다음을 추가한다.

- Markup 문서 **보기**: 렌더링된 형태로 표시.
- Markup 문서 **편집**: 소스 편집 + (선택) 미리보기.
- **버튼**: 보기/편집 전환 및 편집본 저장.

---

## 3. Markup 문서 정의

다음 중 하나로 “Markup 문서”로 간주한다.

| 구분 | 조건 | 비고 |
|------|------|------|
| A. 보고서 유형 | `Report.type === 'Markup'` (신규) | 유형으로만 구분 |
| B. 첨부파일 형식 | `fileInfo` 존재 + 확장자 `.html`, `.htm`, `.md`, `.xml` 또는 MIME `text/html`, `text/markdown`, `application/xml`, `text/plain`(선택) | 기존 유형 + 첨부파일로 구분 |
| C. 인라인 필드 | `Report.markupContent?: string` (신규) | 타입/파일 없이도 본문만 Markup으로 저장 가능 |

**권장**:  
- **1단계**: B(첨부파일 기반) + C(인라인 `markupContent`) 지원.  
  - 첨부가 Markup 파일이면 해당 파일 내용을 보기/편집.  
  - `markupContent`가 있으면 이를 우선 표시/편집.  
- **2단계(선택)**: A – 유형에 `Markup` 추가해 “Markup 전용 보고서”로 사용.

---

## 4. 데이터 모델 변경

**파일**: `types.ts`

```ts
// Report 인터페이스 확장
export interface Report extends BaseItem {
  type: 'CodeAnalysis' | 'ProjectAnalysis' | 'Interim' | 'Final' | 'Markup' | 'Other';  // 'Markup' 추가(선택)
  summary: string;
  fileName?: string;
  fileInfo?: FileInfo;
  markupContent?: string;   // 신규: Markup 본문 (HTML/Markdown/XML 등)
}
```

- **저장 위치**:  
  - 편집 시 **인라인 저장**이면 `markupContent`만 Firestore에 저장.  
  - “파일로 저장”이면 편집 내용을 다시 업로드해 `fileInfo` 갱신(및 기존 Storage 객체 교체/삭제 정책 결정).

---

## 5. Markup 판별 유틸

**파일**: `utils/markupReport.ts` (신규 권장)

- `isMarkupReport(report: Report): boolean`  
  - `report.markupContent`가 비어있지 않거나,  
  - `report.fileInfo`가 있고 `isMarkupFile(name, type)` 이면 `true`.
- `isMarkupFile(fileName: string, mimeType?: string): boolean`  
  - 확장자: `.html`, `.htm`, `.md`, `.xml`.  
  - MIME: `text/html`, `text/markdown`, `application/xml`, (선택) `text/plain`.
- `getMarkupKind(fileName?: string, mimeType?: string): 'html' | 'markdown' | 'xml' | 'unknown'`  
  - 렌더링 방식(iframe / Markdown 파서 / XML 텍스트) 결정용.

---

## 6. 보고서 수정 페이지 UI 변경

**파일**: `components/TabViews.tsx` – `ReportView` 내 “보고서 수정” 분기.

### 6.1 표시 조건

- `isMarkupReport(editForm)` 일 때만 “Markup 문서” 섹션을 노출.

### 6.2 레이아웃

- 기존: 제목 / 유형 / 요약 / 첨부파일.
- 추가: **“Markup 문서”** 블록을 요약과 첨부파일 사이(또는 첨부파일 아래)에 배치.

### 6.3 버튼

| 버튼 | 동작 |
|------|------|
| **Markup 보기** | 보기 모드로 전환. 현재 내용(또는 로드된 내용)을 렌더링해 표시. |
| **Markup 편집** | 편집 모드로 전환. 소스 텍스트를 textarea 등으로 표시. |
| **저장** (편집 모드에서만) | `markupContent` 갱신 후 `handleEditSave` 호출 또는 전용 저장 핸들러에서 `storage.reports.save` 호출. 파일로 되돌리는 경우에는 편집 내용으로 재업로드 후 `fileInfo` 갱신. |

- 보기/편집은 한 번에 하나만 보이도록 상태로 제어: `markupViewMode: 'view' | 'edit'`.

### 6.4 보기 모드

- **콘텐츠 소스**  
  - `editForm.markupContent`가 있으면 우선 사용.  
  - 없고 `editForm.fileInfo`가 Markup이면 `fetch(editForm.fileInfo.url)`로 텍스트 로드(한 번 로드 후 state에 캐시).
- **렌더링**  
  - **HTML**: `iframe` sandbox 또는 `dangerouslySetInnerHTML`(sanitize 필수).  
  - **Markdown**: 기획서와 동일한 단순 파서 또는 `react-markdown` 등 라이브러리.  
  - **XML**: 공백/들여쓰기 정리 후 `<pre>` 텍스트로 표시.

### 6.5 편집 모드

- `<textarea>`(또는 코드 에디터 컴포넌트)에 현재 Markup 소스 표시.  
- 소스 우선순위: `editForm.markupContent` > 이전에 fetch한 파일 내용(state).  
- (선택) 우측에 라이브 미리보기(Markdown/HTML만 해당).

### 6.6 저장 동작

- **인라인만**: `setEditForm({ ...editForm, markupContent: editedText })` 후 기존 `handleEditSave` 호출.  
- **파일 연동**:  
  - 편집 내용을 `Blob` → 새 File로 만들어 `processFile`/업로드 호출.  
  - 새 `fileInfo`로 `editForm` 갱신 후 `handleEditSave`.  
  - 필요 시 기존 Storage 파일은 `deleteFile` 후 새 URL로 대체.

---

## 7. 구현 단계(작업 순서)

| 단계 | 작업 | 산출물 |
|------|------|--------|
| 1 | `Report`에 `markupContent` 추가, (선택) `type`에 `'Markup'` 추가 | `types.ts` |
| 2 | `isMarkupReport`, `isMarkupFile`, `getMarkupKind` 구현 | `utils/markupReport.ts` |
| 3 | ReportView에 `markupViewMode`, “Markup 문서” 표시 조건 추가 | `TabViews.tsx` |
| 4 | 보기 모드: 콘텐츠 로드(fetch from URL or `markupContent`) + HTML/MD/XML 렌더링 | `TabViews.tsx` 또는 `components/ReportMarkupViewer.tsx` |
| 5 | 편집 모드: textarea + (선택) 미리보기, 저장 시 `markupContent`/파일 반영 | 동일 |
| 6 | 버튼 “Markup 보기” / “Markup 편집” / “저장” 연결 및 테스트 | `TabViews.tsx` |
| 7 | (선택) HTML sanitize 라이브러리 도입, iframe sandbox 옵션 검토 | 보안 |

---

## 8. 기술적 고려사항

- **CORS**: Firebase Storage URL을 `fetch()`할 때 CORS 허용 여부 확인. 이미지 등은 img src로 되지만 텍스트 fetch는 CORS 적용됨.  
- **보안**: HTML 렌더 시 XSS 방지를 위해 sanitize(예: DOMPurify) 적용 또는 iframe sandbox 사용.  
- **용량**: 매우 큰 Markup은 메모리/성능 이슈 가능. 필요 시 크기 제한(예: 1MB) 또는 “큰 파일은 보기만” 처리.  
- **편집 후 파일과 인라인 일치**: “파일이 있고 markupContent도 있으면” 우선순위 정책(예: 항상 `markupContent` 우선)을 한 가지로 고정해 두는 것이 좋음.

---

## 9. 테스트 시나리오

1. **Markup 아님**: 유형 Other + PDF 첨부 → “Markup 문서” 섹션 비노출.  
2. **Markup 파일만**: .html/.md 첨부, `markupContent` 없음 → 보기 시 fetch로 표시, 편집 시 빈 편집기 또는 fetch 후 편집, 저장 시 `markupContent` 저장 또는 파일 재업로드.  
3. **markupContent만**: 첨부 없이 `markupContent` 있음 → 보기/편집/저장 모두 인라인만.  
4. **보기/편집 전환**: 보기 ↔ 편집 전환 시 동일 내용 유지.  
5. **저장 후**: 목록으로 돌아갔다가 다시 진입 시 최신 `markupContent` 또는 파일 내용이 보이는지 확인.

---

이 계획에 따라 단계 1·2부터 순차 구현하면, 보고서 수정 페이지에서 Markup 형식 문서를 안전하게 보고 편집할 수 있다.
