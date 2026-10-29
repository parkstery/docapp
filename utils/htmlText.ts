/**
 * 저장된(신뢰할 수 없는) HTML을 텍스트 추출용으로 파싱한다.
 * document.createElement('div').innerHTML 은 분리된 노드여도 <img onerror> 등이 실행되지만,
 * DOMParser 로 만든 문서는 스크립트 실행·리소스 로드를 하지 않는다.
 */
export function parseHtmlInert(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, 'text/html').body;
}
