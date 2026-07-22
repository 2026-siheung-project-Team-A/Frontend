import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { roomApi } from '../../features/room/api/roomApi';
import { getApiErrorCode } from '../../shared/lib/apiError';
import { useRoomStore } from '../../features/room/store/roomStore';
import { Screen, Button, Loading, ErrorView, GoHomeButton } from '../../shared/ui';

const PIN_MAX = 6;

/**
 * ⑤ 참가자 · 입장 — QR/코드로 진입해 닉네임(비밀방이면 비밀번호까지)을 넣고 들어간다.
 * 방 코드는 URL(:roomId)에서 자동 채움. 설치·로그인 없이 바로 참여.
 *
 * 방 조회(GET /api/rooms/:id)로 비밀방 여부(isSecret)를 먼저 확정한다 — 조회가 끝나기 전엔
 * 입장을 막아, 비밀방인데 비밀번호칸 없이 들어가는 일을 원천 차단한다. 조회 실패(없는 방·네트워크)면
 * 폼 대신 에러 화면을 띄운다. 입장하기 → 닉네임·비밀번호를 store 에 저장하고 /game/:roomId 로 이동 →
 * GameRoom 의 useRoomConnection 이 room:join { nickname, password } 로 확정한다.
 * 비밀번호가 틀리면 서버가 WRONG_PASSWORD → 이 화면으로 되돌아와 다시 입력한다(닉네임은 유지).
 */
export function JoinRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  // WRONG_PASSWORD 로 되돌아온 경우 이미 알고 있는 닉네임을 미리 채워, 비밀번호만 다시 치게 한다.
  const [nickname, setName] = useState(
    () => useRoomStore.getState().nickname ?? '',
  );
  const [pin, setPin] = useState('');

  // 비밀방 여부 확인용 방 조회. isSecret 을 확정하기 전엔 입장을 막는다.
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomApi.get(roomId),
    enabled: !!roomId,
    retry: false,
    staleTime: 0,
  });

  // 조회 중 — 비밀방인지 알 수 없으니 입장을 막고 로딩만 보여준다.
  if (isLoading) return <Loading />;

  // 조회 실패 — 없는 방이면 그대로 안내, 그 외(네트워크 등)는 재시도. 입장은 허용하지 않는다.
  if (isError) {
    const code = getApiErrorCode(error);
    return (
      <ErrorView
        code={code === 'ROOM_NOT_FOUND' ? 'ROOM_NOT_FOUND' : undefined}
        title={code === 'ROOM_NOT_FOUND' ? undefined : '방 정보를 불러오지 못했어요'}
        desc={
          code === 'ROOM_NOT_FOUND'
            ? undefined
            : '연결을 확인하고 다시 시도해 주세요.'
        }
        action={
          <div className="stack" style={{ width: '100%' }}>
            <Button block onClick={() => void refetch()} disabled={isFetching}>
              다시 시도
            </Button>
            <GoHomeButton onClick={() => navigate('/')} />
          </div>
        }
      />
    );
  }

  const isSecret = summary?.isSecret ?? false;
  const pinOk = !isSecret || (pin.length >= 1 && pin.length <= PIN_MAX);
  const canJoin = !!nickname.trim() && pinOk;

  const join = () => {
    const nick = nickname.trim();
    if (!nick || !pinOk) return;
    // 이전 방의 잔여 상태를 비우고 닉네임·(비밀방이면)비밀번호·role만 저장하고 이동. 실제 소켓 연결·
    // room:join emit 은 GameRoom 의 useRoomConnection(role:'participant')이 connect 시 자동 처리한다.
    const st = useRoomStore.getState();
    st.reset();
    st.setRoom(roomId, 'participant');
    st.setNickname(nick);
    st.setJoinPassword(isSecret ? pin : null);
    navigate(`/game/${roomId}`);
  };

  return (
    <Screen
      footer={
        <Button block onClick={join} disabled={!canJoin}>
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
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && join()}
          maxLength={12}
          autoFocus={!nickname}
        />
      </div>

      {isSecret && (
        <div className="field" style={{ marginTop: 20 }}>
          <label className="section-label">🔒 비밀번호</label>
          <input
            className="input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder={`숫자 최대 ${PIN_MAX}자리`}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_MAX))}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && join()}
            autoFocus={!!nickname}
          />
          <p className="muted" style={{ fontSize: 13 }}>
            이 방은 비밀방이에요. 호스트에게 받은 비밀번호를 입력해 주세요.
          </p>
        </div>
      )}

      <p className="muted" style={{ fontSize: 13, marginTop: 20 }}>
        설치·로그인 없이 바로 참여해요
      </p>
    </Screen>
  );
}
