/**
 * Google Meet Add-ons SDK 초기화.
 *
 * 앱이 Google Meet 통화의 애드온 '사이드 패널'(iframe) 안에서 열렸을 때만 성공한다.
 * Zoom(zoom.ts)과 같은 역할 — 회의 안에 우리 웹앱을 띄우는 얇은 셸을 붙이는 것이고,
 * Meet 밖(크롬 익스텐션·Zoom·일반 브라우저)에서는 세션 생성이 거부되므로 try/catch로 감싸
 * "Meet 아님"을 조용히 넘긴다(그 경우 일반 웹앱으로 그대로 동작).
 *
 * SDK는 동적 import로 불러 초기 번들에서 분리한다 — Meet 밖에서는 로드 비용을 최소화한다.
 *
 * 동작 전제: Google Cloud 프로젝트에 Meet 애드온을 등록하고(=cloudProjectNumber 발급),
 * Workspace Marketplace 애드온 매니페스트의 sidePanelUri 를 우리 /embed 로 지정해 배포해야 한다.
 * 프로젝트 번호는 빌드 타임 환경변수 VITE_MEET_CLOUD_PROJECT_NUMBER 로 주입한다(없으면 초기화 생략).
 */

/**
 * 애드온이 실행 중인 프레임 종류(SDK의 FrameType 과 동일).
 *  - SIDE_PANEL: 회의 사이드 패널의 iframe — 우리의 호스트 런처 진입점.
 *  - MAIN_STAGE: 메인 무대 타일의 iframe(현재 사용 안 함).
 */
export type MeetFrameType = 'SIDE_PANEL' | 'MAIN_STAGE';

/** 빌드 타임 주입 — Meet 애드온을 등록한 Google Cloud 프로젝트 번호. */
const CLOUD_PROJECT_NUMBER = import.meta.env.VITE_MEET_CLOUD_PROJECT_NUMBER as string | undefined;

/**
 * Meet 안이면 애드온 세션을 초기화하고(사이드 패널이면 사이드 패널 클라이언트를 붙여) 프레임 종류를 반환한다.
 * Meet 밖이거나 프로젝트 번호가 없으면 null(무해하게 일반 웹앱/다른 임베드로 동작).
 */
export async function initMeetAddon(): Promise<MeetFrameType | null> {
  // 프로젝트 번호가 없으면 애드온으로 배포된 게 아니다 — 초기화할 필요 없음.
  if (!CLOUD_PROJECT_NUMBER) return null;
  try {
    const { meet } = await import('@googleworkspace/meet-addons/meet.addons');
    const session = await meet.addon.createAddonSession({
      cloudProjectNumber: CLOUD_PROJECT_NUMBER,
    });
    const frameType = meet.addon.getFrameType();
    // 사이드 패널(호스트 런처)일 때만 클라이언트를 붙인다 — 메인 무대에선 다른 클라이언트가 필요.
    if (frameType === 'SIDE_PANEL') {
      await session.createSidePanelClient();
    }
    return frameType;
  } catch {
    // Meet 클라이언트 밖 — 정상 케이스. 일반 웹앱/크롬 익스텐션/Zoom 으로 동작한다.
    return null;
  }
}
