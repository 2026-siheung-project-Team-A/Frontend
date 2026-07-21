import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../../features/room/store/roomStore';
import { Screen, Button } from '../../shared/ui';

/**
 * ⑤ 참가자 · 입장 — QR/코드로 진입해 닉네임만 넣고 들어간다.
 * 방 코드는 URL(:roomId)에서 자동 채움. 설치·로그인 없이 바로 참여.
 * 입장하기 → 소켓 연결(connectRoom) + room:join → /game/:roomId 로 이동.
 */
export function JoinRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setNickname = useRoomStore((s) => s.setNickname);
  const [nickname, setName] = useState('');

  const join = () => {
    const nick = nickname.trim();
    if (!nick) return;
    // 닉네임·role만 store에 저장하고 이동. 실제 소켓 연결·room:join emit은
    // GameRoom의 useRoomConnection(role:'participant')이 connect 시 자동 처리한다.
    setRoom(roomId, 'participant');
    setNickname(nick);
    navigate(`/game/${roomId}`);
  };

  return (
    <Screen
      footer={
        <Button block onClick={join} disabled={!nickname.trim()}>
          입장하기
        </Button>
      }
    >
      <h1 className="title" style={{ fontSize: 24 }}>참여하기</h1>

      <div className="field" style={{ marginTop: 28 }}>
        <label className="section-label">방 코드</label>
        <input className="input" value={`#${roomId}`} readOnly />
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label className="section-label">닉네임</label>
        <input
          className="input"
          placeholder="닉네임을 입력하세요"
          value={nickname}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          maxLength={12}
          autoFocus
        />
      </div>

      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
        설치·로그인 없이 바로 참여해요
      </p>
    </Screen>
  );
}
