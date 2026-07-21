import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { WaitingRoom } from '../../features/game/components/WaitingRoom';
import { Roulette } from '../../features/game/components/Roulette';
import { VotePlay } from '../../features/game/components/VotePlay';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { VoteResult } from '../../features/game/components/results/VoteResult';
import { Screen, Loading, ErrorView, GoHomeButton, Button } from '../../shared/ui';

/**
 * 게임 진행·결과 (참가자 화면) — gameType + status로 분기.
 *  방종료(closed) / 에러(roomError)  : 상태 화면 우선
 *  finished : ⑬ 뽑기결과 / ⑮ 투표결과 (result.type)
 *  vote(진행중): ⑫ 투표 (status=waiting 인 채로 vote:cast, 실시간 집계)
 *  playing  : ⑦ 룰렛 관전
 *  waiting  : ⑥ 대기
 *
 * 전환은 서버 이벤트로 store에 반영되어 자동으로 일어난다.
 * 참가자가 emit 하는 것은 vote:cast(투표) 뿐이다.
 */
export function GameRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const socketRef = useRoomConnection(roomId, 'participant');

  const status = useRoomStore((s) => s.status);
  const setStatus = useRoomStore((s) => s.setStatus);
  const gameType = useRoomStore((s) => s.gameType);
  const participants = useRoomStore((s) => s.participants);
  const items = useRoomStore((s) => s.items);
  const result = useRoomStore((s) => s.result);
  const tally = useRoomStore((s) => s.tally);
  const roomError = useRoomStore((s) => s.roomError);
  const closed = useRoomStore((s) => s.closed);

  const [myVote, setMyVote] = useState<string | null>(null);

  const rouletteWinner =
    result && result.type === 'roulette' ? result.winner : null;

  const castVote = (itemId: string) => {
    const s = socketRef.current;
    if (s) gameSocket.castVote(s, itemId);
    setMyVote(itemId);
  };

  const goHome = () => {
    useRoomStore.getState().reset();
    navigate('/');
  };

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

  // ⑬/⑮ 결과 (호스트와 동시)
  if (status === 'finished') {
    return (
      <Screen>
        {result && result.type === 'vote' ? (
          <VoteResult result={result} isHost={false} onHome={goHome} />
        ) : result ? (
          <DrawResult result={result} isHost={false} onHome={goHome} />
        ) : (
          <Loading message="결과를 불러오는 중…" />
        )}
      </Screen>
    );
  }

  // ⑫ 투표 진행 — vote 방은 status=waiting 인 채로 참가자가 투표한다
  if (gameType === 'vote' && items.length > 0) {
    return (
      <VotePlay
        roomId={roomId}
        items={items}
        tally={tally}
        isHost={false}
        myVote={myVote}
        onVote={castVote}
      />
    );
  }

  // ⑦ 룰렛 관전
  if (status === 'playing') {
    return (
      <Screen>
        <div className="topbar">
          <h1>룰렛</h1>
          <span className="chip" style={{ marginLeft: 'auto' }}>#{roomId}</span>
        </div>
        <Roulette
          items={items}
          isHost={false}
          winner={rouletteWinner}
          onFinish={() => setStatus('finished')}
        />
      </Screen>
    );
  }

  // ⑥ 대기
  return (
    <Screen>
      <WaitingRoom roomId={roomId} participants={participants} />
    </Screen>
  );
}
