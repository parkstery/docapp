/** TipTap 등에서 저장된 HTML → 줄바꿈을 최대한 보존한 평문 */
export function htmlToPlainTextWithBreaks(html: string): string {
  if (!html.trim()) return '';
  let h = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n');
  const d = document.createElement('div');
  d.innerHTML = h;
  return (d.textContent || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 평문 줄 단위로 TipTap에 넣기 좋은 최소 HTML */
export function plainTextToParagraphHtml(text: string): string {
  const t = text.replace(/\r\n/g, '\n');
  if (!t.trim()) return '';
  const lines = t.split('\n');
  return lines
    .map((line) => (line.trim() === '' ? '<p><br></p>' : `<p>${escapeHtmlText(line)}</p>`))
    .join('');
}

/**
 * 대화/가사 복사본처럼 줄바꿈 없이 이어진 긴 문자열을 읽기 쉽게 줄바꿈만 삽입한다.
 * 저장 HTML을 바꾸지 않고 표시용으로만 쓸 때도 호출 가능.
 */
export function formatChatLogTextForReadability(plain: string): string {
  let t = plain.replace(/\r\n/g, '\n').trim();
  if (!t) return '';

  // 이미 줄바꿈이 많으면 그대로
  const nl = (t.match(/\n/g) || []).length;
  if (nl >= 4) return t;

  // 가사·섹션 라벨 앞에 줄바꿈
  t = t.replace(
    /([가-힣A-Za-z0-9)」'"!?…])\s*(Pre-Chorus|Chorus|Bridge|Verse\s*\d+)\b/gi,
    '$1\n\n$2'
  );

  // "반복" 다음에 오는 다음 번호 곡
  t = t.replace(/반복\s+(\d{1,2}\.\s*)/g, '반복\n\n$1');

  // 문장 끝 뒤 메타/후속 요청 (한국어)
  t = t.replace(/\.\s*(다음은|제시한다|원하면|필요하면|필요 시|좋아\.)/g, '.\n\n$1');

  // "…이다." 직후 곡 번호 (가사 N안이다. 1. …)
  t = t.replace(/([가-힣]다)\.(\s*)(\d{1,2}\.\s)/g, '$1.\n\n$3');

  // 번호 + 따옴표로 시작하는 다음 곡/섹션 (Zone 2 등 숫자. 공백 따옴표 패턴은 제외)
  t = t.replace(/([.!?…])\s*(\d{1,2}\.\s+["""「])/g, '$1\n\n$2');

  // 닫는 따옴표 뒤 바로 이어지는 다음 번호
  t = t.replace(/(["""」])\s*(\d{1,2}\.\s+)/g, '$1\n\n$2');

  // 문단처럼 이어진 영문 섹션/운동 키워드
  t = t.replace(/\s+(Zone\s*\d+\s+Flow|Interval\s+Spark|FTP|Tabata)\b/gi, '\n\n$1');

  return t.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 프롬프트/응답 필드용: 한 줄에 가까운 긴 HTML을 문단 HTML로 정리한다.
 * 인라인 이미지가 있으면 원문을 유지한다.
 */
export function ensureReadablePromptHtml(raw: string): string {
  const s = raw?.trim() ?? '';
  if (!s) return '';
  if (/<img\s/i.test(s)) return s;

  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(s);
  const plain = looksHtml ? htmlToPlainTextWithBreaks(s) : s.replace(/\r\n/g, '\n');
  if (!plain.trim()) return s;

  const newlineCount = (plain.match(/\n/g) || []).length;
  const longWall = plain.length >= 120 && newlineCount <= 1;

  if (!longWall) {
    if (looksHtml && /<\/p>\s*<p>/i.test(s)) return s;
    return looksHtml ? s : plainTextToParagraphHtml(plain);
  }

  const formatted = formatChatLogTextForReadability(plain);
  return plainTextToParagraphHtml(formatted);
}

/** 프롬프트 외 리치 필드(보고서 요약, 참고/메모 본문, 이슈 설명 등)에 동일 적용 */
export const ensureReadableRichHtml = ensureReadablePromptHtml;

/** 목록 미리보기용 짧은 평문 (HTML 입력 허용) */
export function promptPreviewPlain(htmlOrText: string, maxLen = 600): string {
  const plain = /<\/?[a-z]/i.test(htmlOrText) ? htmlToPlainTextWithBreaks(htmlOrText) : htmlOrText;
  const formatted = formatChatLogTextForReadability(plain);
  if (formatted.length <= maxLen) return formatted;
  return `${formatted.slice(0, maxLen)}…`;
}
