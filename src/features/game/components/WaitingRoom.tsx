/**
 * ⑥ 참가자 대기 — 호스트가 게임을 준비하는 동안 보이는 화면.
 * 결과가 나오면(status→playing/finished) 부모가 자동으로 화면을 전환한다.
 * participants 는 백엔드 계약대로 닉네임 문자열 배열.
 */
export function WaitingRoom({
  roomId,
  participants,
  onLeave,
}: {
  roomId: string;
  participants: string[];
  onLeave?: () => void;
}) {
  return (
    <>
      <div className="topbar">
        {onLeave && (
          <button className="icon-btn" onClick={onLeave} aria-label="나가기">
            ←
          </button>
        )}
        <h1>참여 방</h1>
        <span className="chip" style={{ marginLeft: 'auto' }}>
          #{roomId}
        </span>
      </div>

      <div
        className="placeholder-box"
        style={{ height: 140, margin: '24px auto', width: 200 }}
      >
        대기 일러스트
      </div>

      <h2 className="title center">곧 시작해요!</h2>
      <p className="subtitle center">호스트가 게임을 준비 중이에요</p>

      <p className="section-label" style={{ marginTop: 28 }}>
        함께 있는 사람 {participants.length}명
      </p>
      <div className="grid-2" style={{ marginTop: 12 }}>
        {participants.map((nick) => (
          <span key={nick} className="tag">
            {nick}
          </span>
        ))}
      </div>

      <div className="spacer" />
      <p className="center muted" style={{ fontSize: 13 }}>
        결과가 나오면 자동으로 떠요
      </p>
    </>
  );
}
