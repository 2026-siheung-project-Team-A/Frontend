import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Screen, Button, TopBar } from '../../../shared/ui';

/**
 * ④ 호스트 · QR 공유 & 대기 — 참가자가 QR/코드로 들어오길 기다린다.
 * joinUrl 을 QR 코드(data URL)로 생성해 표시. 참가자는 QR을 찍거나 코드를 입력해 입장.
 * 참가자 입장은 participant:joined 소켓 이벤트로 실시간 갱신된다.
 */
export function QrWaiting({
  roomId,
  joinUrl,
  participants,
  onlineCount = 0,
  onStart,
  onBack,
}: {
  roomId: string;
  joinUrl?: string;
  participants: string[]; // 닉네임 목록
  onlineCount?: number; // 접속 소켓 수(입장 전 포함)
  onStart: () => void;
  onBack?: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    if (!joinUrl) return;
    let alive = true;
    QRCode.toDataURL(joinUrl, { width: 360, margin: 1 })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [joinUrl]);

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
        style={{
          width: 180,
          height: 180,
          margin: '20px auto 12px',
          overflow: 'hidden',
          background: qr ? '#fff' : undefined,
        }}
      >
        {qr ? (
          <img src={qr} alt="참여 QR" width={180} height={180} style={{ display: 'block' }} />
        ) : (
          'QR'
        )}
      </div>
      <p className="center muted">QR을 찍어 참여하세요</p>
      {joinUrl && (
        <p className="center" style={{ fontSize: 13, wordBreak: 'break-all', marginTop: 6 }}>
          {joinUrl}
        </p>
      )}

      <p className="section-label" style={{ marginTop: 28 }}>
        참가자 {participants.length}명 (실시간)
        {onlineCount > 0 && (
          <span className="muted" style={{ fontWeight: 400 }}> · 접속 {onlineCount}</span>
        )}
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
