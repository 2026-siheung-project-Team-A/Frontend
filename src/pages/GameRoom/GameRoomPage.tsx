import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { WaitingRoom } from '../../features/game/components/WaitingRoom';
import { Roulette } from '../../features/game/components/Roulette';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { Screen, Loading, ErrorView, GoHomeButton, Button } from '../../shared/ui';

/**
 * 게임 진행·결과 (참가자 화면) — status로 분기.
 *  방종료(closed) / 에러(roomError)  : 상태 화면 우선
 *  waiting  : ⑥ 대기
 *  playing  : ⑦ 룰렛 관전 (조작 불가)
 *  finished : ⑬ 결과 (호스트와 동시 표시)
 *
 * 모든 전환은 서버 room:state / game:result 수신으로 store에 반영되어 자동으로 일어난다.
 * (여기서 emit하는 것은 없음 — 참가자는 수신 중심)
 */
export function GameRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  // 연결 소유 + 수신 배선. connect되면 room:join(닉네임)을 자동 emit한다.
  useRoomConnection(roomId, 'participant');
  const status = useRoomStore((s) => s.status);
  const participants = useRoomStore((s) => s.participants);
  const items = useRoomStore((s) => s.items);
  const result = useRoomStore((s) => s.result);
  const roomError = useRoomStore((s) => s.roomError);
  const closed = useRoomStore((s) => s.closed);

  // 호스트가 방을 닫음 → 종료 화면
  if (closed) {
    return (
      <ErrorView
        title="방이 종료됐어요"
        desc="호스트가 방을 닫았어요."
        action={<GoHomeButton onClick={() => navigate('/')} />}
      />
    );
  }

  // 입장 실패(닉네임중복·정원초과)는 닉네임 화면으로 되돌린다. 그 외는 홈으로.
  if (roomError) {
    const backToJoin =
      roomError === 'NICKNAME_TAKEN' || roomError === 'ROOM_FULL';
    return (
      <ErrorView
        code={roomError}
        action={
          backToJoin ? (
            <Button variant="secondary" onClick={() => navigate(`/r/${roomId}`)}>
              다시 입장하기
            </Button>
          ) : (
            <GoHomeButton onClick={() => navigate('/')} />
          )
        }
      />
    );
  }

  if (status === 'playing') {
    return (
      <Screen>
        <div className="topbar">
          <h1>룰렛</h1>
          <span className="chip" style={{ marginLeft: 'auto' }}>#{roomId}</span>
        </div>
        <Roulette items={items} isHost={false} />
      </Screen>
    );
  }

  if (status === 'finished') {
    return (
      <Screen>
        {result ? (
          <DrawResult result={result} isHost={false} />
        ) : (
          <Loading message="결과를 불러오는 중…" />
        )}
      </Screen>
    );
  }

  // waiting
  return (
    <Screen>
      <WaitingRoom roomId={roomId} participants={participants} />
    </Screen>
  );
}
