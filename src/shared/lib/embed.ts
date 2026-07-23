/**
 * 임베드 진입 표시용 세션 플래그.
 * Zoom 은 앱을 iframe 이 아니라 웹뷰의 '최상위 문서'로 로드해서 self===top 이 된다.
 * 그래서 iframe 여부만으론 Zoom 을 못 잡는다 — /embed 로 진입한 사실을 기록해 두고 그걸로 판별한다.
 */
const EMBED_FLAG = 'pmn:embed';

/** /embed(임베드 런처)로 진입했음을 세션에 기록한다. EmbedPage 마운트 시 호출. */
export function markEmbedEntry(): void {
  try {
    sessionStorage.setItem(EMBED_FLAG, '1');
  } catch {
    // 세션 스토리지 접근 불가(사생활 모드 등) — 무시. iframe 판별로 폴백된다.
  }
}

/**
 * 임베드(크롬 익스텐션·Zoom·Meet 등) 컨텍스트 판별.
 *  - iframe 안(크롬 익스텐션 사이드 패널 등): `window.self !== window.top` → true.
 *  - 최상위 웹뷰(Zoom 등): iframe 이 아니므로, /embed 진입 플래그로 판별한다.
 * `window.self !== window.top` 비교는 크로스오리진에서도 안전하다(상위 창 속성 미접근).
 */
export function isEmbedded(): boolean {
  try {
    if (window.self !== window.top) return true;
    return sessionStorage.getItem(EMBED_FLAG) === '1';
  } catch {
    // 크로스오리진 접근 예외 시엔 임베드로 간주(보수적).
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
