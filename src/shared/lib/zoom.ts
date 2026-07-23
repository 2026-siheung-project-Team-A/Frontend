/**
 * Zoom Apps SDK 초기화.
 *
 * 앱이 Zoom 데스크톱 클라이언트의 임베디드 브라우저(사이드 패널) 안에서 열렸을 때만 성공한다.
 * `config()`는 반드시 SDK의 첫 호출이어야 하며, Zoom 밖(크롬 익스텐션·일반 브라우저)에서는
 * 거부되므로 try/catch로 감싸 "Zoom 아님"을 조용히 넘긴다(그 경우 일반 웹앱으로 그대로 동작).
 *
 * SDK는 동적 import로 불러 초기 번들에서 분리한다 — Zoom 밖에서는 로드 비용을 최소화한다.
 */
export type ZoomRunningContext =
  | 'inMeeting'
  | 'inMainClient'
  | 'inWebinar'
  | 'inCollaborate'
  | 'inPhone'
  | 'unknown';

/**
 * Zoom 안이면 SDK를 초기화하고 실행 컨텍스트를 반환한다. Zoom 밖이면 null.
 * capabilities는 데모에 필요한 최소 집합 — 회의 컨텍스트 조회 + 링크 열기/앱 공유.
 */
export async function initZoomApp(): Promise<ZoomRunningContext | null> {
  try {
    const { default: zoomSdk } = await import('@zoom/appssdk');
    await zoomSdk.config({
      capabilities: [
        'getRunningContext',
        'getMeetingContext',
        'getMeetingUUID',
        'openUrl',
        'shareApp',
      ],
    });
    const { context } = await zoomSdk.getRunningContext();
    return (context as ZoomRunningContext) ?? 'unknown';
  } catch {
    // Zoom 클라이언트 밖 — 정상 케이스. 일반 웹앱/크롬 익스텐션으로 동작한다.
    return null;
  }
}
