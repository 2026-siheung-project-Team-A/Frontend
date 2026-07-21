import { Screen, Button, TopBar } from '../../../shared/ui';

/**
 * ④ 호스트 · QR 공유 & 대기 — 참가자가 QR/코드로 들어오길 기다린다.
 * QR 코드 자동생성은 Phase 3라, 지금은 자리(placeholder) + 코드·링크를 크게 노출.
 * 참가자 입장은 participant:joined 소켓 이벤트로 실시간 갱신된다.
 */
export function QrWaiting({
  roomId,
  joinUrl,
  participants,
  onStart,
  onBack,
}: {
  roomId: string;
  joinUrl?: string;
  participants: string[]; // 닉네임 목록
  onStart: () => void;
  onBack?: () => void;
}) {
  return (
    <Screen
      footer={
        <Button block onClick={onStart}>
          게임 시작 ▶
        </Button>
      }
    >
      <TopBar
        title="참여 방"
        onBack={onBack}
        trailing={<span className="chip">#{roomId}</span>}
      />

      <div
        className="placeholder-box"
        style={{ width: 180, height: 180, margin: '20px auto 12px' }}
      >
        QR
      </div>
      <p className="center muted">QR을 찍어 참여하세요</p>
      {joinUrl && (
        <p className="center" style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 6 }}>
          {joinUrl}
        </p>
      )}

      <p className="section-label" style={{ marginTop: 28 }}>
        참가자 {participants.length}명 (실시간)
      </p>
      <div className="grid-2" style={{ marginTop: 12 }}>
        {participants.map((nick) => (
          <span key={nick} className="tag">
            {nick}
          </span>
        ))}
        {participants.length === 0 && (
          <span className="muted" style={{ fontSize: 14 }}>
            아직 아무도 없어요
          </span>
        )}
      </div>
    </Screen>
  );
}
