/**
 * 임베드(iframe/웹뷰) 컨텍스트 판별 — 크롬 익스텐션 사이드 패널, Zoom/Meet 인-미팅 패널처럼
 * 앱이 다른 페이지 안에 iframe 으로 실릴 때 true 다.
 *
 * `window.self !== window.top` 은 크로스오리진에서도 안전하다(상위 창의 속성에 접근하지 않고
 * 참조 동일성만 비교). 최상위 창이면 self === top → false.
 */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // 크로스오리진 접근으로 예외가 나는 브라우저에선 임베드로 간주(보수적).
    return true;
  }
}

/**
 * "메인으로 / 방 나가기" 목적지 경로.
 *  - 일반 브라우저: 홈('/')
 *  - 임베드(익스텐션·Zoom·Meet): 임베드 런처('/embed') — 방을 나가면 전체 홈이 아니라
 *    다시 런처(게임 고르기) 화면으로 돌아오게 한다.
 */
export function homePath(): string {
  return isEmbedded() ? '/embed' : '/';
}
