import { useRoomStore } from '../../features/room/store/roomStore';

/**
 * 소켓 끊김 배너 — connection이 'disconnected'일 때 화면 상단에 sticky 표시.
 * 실시간이 핵심 가치라 끊김을 사용자에게 즉시 알린다.
 * 앱 셸 안, 페이지 위쪽에 항상 마운트해 두면 상태에 따라 자동 노출된다.
 */
export function DisconnectBanner() {
  const connection = useRoomStore((s) => s.connection);
  if (connection !== 'disconnected') return null;
  return <div className="banner">⚠️ 연결이 끊겼어요 · 다시 연결 중…</div>;
}
