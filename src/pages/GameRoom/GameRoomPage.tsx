import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { roomSocket } from '../../features/room/socket/roomSocket';
import { GameLobby } from '../../features/room/components/GameLobby';
import { KickModal } from '../../features/room/components/KickModal';
import { Roulette } from '../../features/game/components/Roulette';
import { VotePlay } from '../../features/game/components/VotePlay';
import { GameStage } from '../../features/game/components/GameStage';
import { Ladder } from '../../features/game/components/Ladder';
import { DrawPlay } from '../../features/game/components/DrawPlay';
import { BalloonPlay } from '../../features/game/components/BalloonPlay';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { OrderResult } from '../../features/game/components/results/OrderResult';
import { VoteResult } from '../../features/game/components/results/VoteResult';
import { LadderResult } from '../../features/game/components/results/LadderResult';
import { ResultModal } from '../../features/game/components/results/ResultModal';
import { ErrorView, GoHomeButton } from '../../shared/ui';

/** 게임이 끝난 뒤 방으로 돌아오지 않으면 강퇴되기까지의 시간(ms). */
const RETURN_GRACE_MS = 60_000;

/**
 * 게임 진행·결과 (참가자 화면) — status 로 화면을 나눈다.
 *  waiting            : 게임 대기방(로비). 시작 전 + '방으로 돌아가기' 후.
 *  playing/finished   : 선택된 게임 화면(관전·참여). finished 면 위에 결과 모달이 뜬다.
 *
 * 결과 모달의 '방으로 돌아가기'를 누르면 로컬로 대기 상태가 되어 로비로 돌아온다(각자 복귀).
 * 1분 안에 안 누르면 강퇴 안내(KickModal)가 대신 떠 확인 시 메인으로 나간다.
 * 전환은 서버 이벤트로 store에 반영되어 자동으로 일어난다. 참가자 emit 은 vote:cast·draw:pick 뿐.
 */
export function GameRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const socketRef = useRoomConnection(roomId, 'participant');

  const status = useRoomStore((s) => s.status);
  const setStatus = useRoomStore((s) => s.setStatus);
  const gameType = useRoomStore((s) => s.gameType);
  const title = useRoomStore((s) => s.title);
  const nickname = useRoomStore((s) => s.nickname);
  const participants = useRoomStore((s) => s.participants);
  const readyPlayers = useRoomStore((s) => s.readyPlayers);
  const onlineCount = useRoomStore((s) => s.onlineCount);
  const items = useRoomStore((s) => s.items);
  const result = useRoomStore((s) => s.result);
  const tally = useRoomStore((s) => s.tally);
  const voteStatus = useRoomStore((s) => s.voteStatus);
  const voteCloseAt = useRoomStore((s) => s.voteCloseAt);
  const roomError = useRoomStore((s) => s.roomError);
  const closed = useRoomStore((s) => s.closed);
  const ladder = useRoomStore((s) => s.ladder);
  const ladderTopLabels = useRoomStore((s) => s.ladderTopLabels);
  const ladderBottomLabels = useRoomStore((s) => s.ladderBottomLabels);
  const ladderRevealed = useRoomStore((s) => s.ladderRevealed);
  const ladderResult = useRoomStore((s) => s.ladderResult);
  const ladderDraft = useRoomStore((s) => s.ladderDraft);
  const draw = useRoomStore((s) => s.draw);
  const drawRound = useRoomStore((s) => s.drawRound);
  const drawDraft = useRoomStore((s) => s.drawDraft);
  const balloon = useRoomStore((s) => s.balloon);
  const balloonRound = useRoomStore((s) => s.balloonRound);
  const rouletteDraft = useRoomStore((s) => s.rouletteDraft);
  const orderDraft = useRoomStore((s) => s.orderDraft);

  const [myVote, setMyVote] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RETURN_GRACE_MS / 1000);

  // 결과 모달이 떠 있는 상태(참가자가 아직 방으로 안 돌아옴).
  const onResult = (status === 'finished' && !!result) || !!ladderResult;

  // 결과가 뜬 뒤 60초 안에 '방으로 돌아가기'를 안 누르면 그 순간 서버에서 실제로 방을 나가고
  // (room:leave → 남은 사람들에게 participant:left 로 '나갔어요' 알림) 강퇴 안내(KickModal)를 띄운다.
  // 확인을 누르면 홈으로만 이동한다(이미 나갔으므로 leave 중복 emit 하지 않음).
  // 결과 상태를 벗어나면(방으로 돌아감·새 게임 시작) 취소하고 강퇴 플래그를 해제한다.
  useEffect(() => {
    if (!onResult) {
      setKicked(false);
      return;
    }
    const t = setTimeout(() => {
      const s = socketRef.current;
      if (s) roomSocket.leave(s);
      setKicked(true);
    }, RETURN_GRACE_MS);
    return () => clearTimeout(t);
  }, [onResult, socketRef]);

  // '방으로 돌아가기' 버튼에 보여줄 남은 초 카운트다운(강퇴 타이머와 같은 창).
  useEffect(() => {
    if (!onResult) {
      setSecondsLeft(RETURN_GRACE_MS / 1000);
      return;
    }
    setSecondsLeft(RETURN_GRACE_MS / 1000);
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [onResult]);

  // 로비로 돌아오면(내가 복귀했거나 호스트가 게임을 취소해 전원 복귀) 이전 라운드의 내 투표 선택을 비운다.
  useEffect(() => {
    if (status === 'waiting') setMyVote(null);
  }, [status]);

  // 호스트가 방을 삭제하면(room:closed) 참가자를 메인으로 보낸다. 삭제 알림은 store 플래그가 아니라
  // 네비게이션 state 로 넘겨, 이 로직이 없는 호스트 화면(/host)에서는 절대 뜨지 않게 한다.
  useEffect(() => {
    if (closed) navigate('/', { state: { roomDeleted: true } });
  }, [closed, navigate]);

  // 닉네임중복·정원초과·비밀번호오류·유효기간 시작 전은 별도 에러 페이지로 튕기지 않고 입장 폼으로 되돌린다.
  // 입장 폼(JoinRoomPage)이 navigate state 의 코드를 받아 그 자리에서 인라인으로 알려준다.
  // (ROOM_NOT_STARTED 는 입장 폼이 방 조회로 시작 시각을 다시 확인해 "아직 안 열림" 안내를 띄운다.)
  useEffect(() => {
    if (
      roomError === 'NICKNAME_TAKEN' ||
      roomError === 'ROOM_FULL' ||
      roomError === 'WRONG_PASSWORD' ||
      roomError === 'ROOM_NOT_STARTED'
    ) {
      navigate(`/r/${roomId}`, { replace: true, state: { joinError: roomError } });
    }
  }, [roomError, roomId, navigate]);

  const pickDraw = (index: number) => {
    const s = socketRef.current;
    return s ? gameSocket.pickDraw(s, index) : Promise.resolve({ ok: false });
  };
  const pumpBalloon = () => {
    const s = socketRef.current;
    return s ? gameSocket.pumpBalloon(s) : Promise.resolve({ ok: false });
  };
  const passBalloon = () => {
    const s = socketRef.current;
    return s ? gameSocket.passBalloon(s) : Promise.resolve({ ok: false });
  };

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

  // 나가기 — room:leave 로 실제 퇴장 처리 후 홈으로. 나가는 본인에게는 "방에서 나왔습니다"를 띄운다
  // (남은 사람들에게는 서버 participant:left 로 "OO님이 방에서 나갔어요"가 따로 뜬다).
  const leaveRoom = () => {
    const s = socketRef.current;
    if (s) roomSocket.leave(s);
    useRoomStore.getState().pushNotice('방에서 나왔습니다');
    goHome();
  };

  // 참가자 '방으로 돌아가기' — 결과·진행 데이터를 로컬로 비우고 대기 상태로 → 로비로 돌아온다.
  // (방에는 계속 남아, 호스트가 바꾼 게임/다시 시작을 이어서 본다.)
  // 서버에도 room:ready 로 복귀를 알려, 호스트가 새 게임을 시작할 수 있게 한다(전원 복귀 게이트).
  const returnToRoom = () => {
    const s = socketRef.current;
    if (s) roomSocket.ready(s);
    const st = useRoomStore.getState();
    st.setResult(null);
    st.setTally([]);
    st.resetLadder();
    st.resetDraw();
    st.resetBalloon();
    st.setStatus('waiting');
    setMyVote(null);
  };

  // 방 삭제(closed)는 위 useEffect 가 메인으로 보내므로 여기서 렌더할 화면이 없다(리다이렉트 대기).
  if (closed) return null;

  // 입장 실패 처리.
  if (roomError) {
    // 게임 진행 중이라 입장이 막힌 경우 — 안내 후 홈으로.
    if (roomError === 'ROOM_LOCKED') {
      return (
        <ErrorView
          title="게임이 진행 중이에요"
          desc="지금은 입장할 수 없어요. 게임이 끝난 뒤 다시 입장해 주세요."
          action={<GoHomeButton onClick={() => navigate('/')} />}
        />
      );
    }
    // 닉네임중복·정원초과·비밀번호오류는 위 useEffect 가 입장 폼으로 되돌린다 — 여기선 빈 화면(이동 대기).
    const backToJoin =
      roomError === 'NICKNAME_TAKEN' ||
      roomError === 'ROOM_FULL' ||
      roomError === 'WRONG_PASSWORD' ||
      roomError === 'ROOM_NOT_STARTED';
    if (backToJoin) return null;
    // 그 외는 홈으로.
    return (
      <ErrorView
        code={roomError}
        action={<GoHomeButton onClick={() => navigate('/')} />}
      />
    );
  }

  // 게임 화면 — 진행/종료 중일 때만 게임을 그린다. 대기(waiting)면 로비를 보여준다.
  let content;
  if (status === 'playing' || status === 'finished') {
    if (gameType === 'ladder') {
      // 사다리 — 참가자는 관전. 호스트가 시작하면 같은 사다리·내려오는 과정을 본다.
      content = (
        <Ladder
          roomId={roomId}
          isHost={false}
          ladder={ladder}
          topLabels={ladderTopLabels}
          bottomLabels={ladderBottomLabels}
          revealed={ladderRevealed}
          resultShown={!!ladderResult}
          draftTopLabels={ladderDraft.topLabels}
          draftBottomLabels={ladderDraft.bottomLabels}
          onBuild={() => {}}
          onReveal={() => {}}
          onResult={() => {}}
          onLeave={goHome}
        />
      );
    } else if (gameType === 'draw') {
      // 제비뽑기 — 참가자도 접힌 제비를 눌러 뽑는다(먼저 뽑힌 제비는 잠겨 못 뽑음).
      content = (
        <DrawPlay
          roomId={roomId}
          isHost={false}
          me={nickname}
          draw={draw}
          round={drawRound}
          draftCount={drawDraft?.count}
          draftBlanks={drawDraft?.blanks}
          onShuffle={() => {}}
          onPick={pickDraw}
          onReturn={returnToRoom}
          onLeave={goHome}
        />
      );
    } else if (gameType === 'balloon') {
      // 풍선 러시안룰렛 — 내 턴에 최대 3번 펌프하고 '넘기기'로 넘긴다. 터진 순번에 걸리면 패배.
      content = (
        <BalloonPlay
          roomId={roomId}
          isHost={false}
          me={nickname}
          balloon={balloon}
          round={balloonRound}
          playerCount={participants.length}
          onStart={() => Promise.resolve({ ok: false })}
          onPump={pumpBalloon}
          onPass={passBalloon}
          onReturn={returnToRoom}
          onLeave={goHome}
        />
      );
    } else if (gameType === 'vote') {
      // 항목이 아직 없어도 투표 화면을 띄운다 — 호스트가 준비 중 추가하는 목록을 참가자가 실시간으로 본다.
      content = (
        <VotePlay
          roomId={roomId}
          items={items}
          tally={tally}
          isHost={false}
          myVote={myVote}
          voteStatus={voteStatus}
          voteCloseAt={voteCloseAt}
          onVote={castVote}
          onLeave={goHome}
        />
      );
    } else if (gameType === 'roulette' || !gameType) {
      content = (
        <Roulette
          items={items}
          isHost={false}
          winner={rouletteWinner}
          draftLabels={rouletteDraft}
          onFinish={() => setStatus('finished')}
          onReturn={returnToRoom}
          returnCountdown={secondsLeft}
          onLeave={goHome}
        />
      );
    } else {
      content = (
        <GameStage
          roomId={roomId}
          gameType={gameType}
          items={items}
          isHost={false}
          result={result}
          orderDraft={orderDraft}
          onFinish={() => setStatus('finished')}
          onLeave={goHome}
        />
      );
    }
  }

  if (!content) {
    // 대기 — 옛날 게임 대기방 스타일 로비(현재 선택된 게임을 실시간으로 본다).
    content = (
      <GameLobby
        roomId={roomId}
        title={title}
        participants={participants}
        readyPlayers={readyPlayers}
        onlineCount={onlineCount}
        isHost={false}
        me={nickname}
        gameType={gameType}
        onLeave={leaveRoom}
      />
    );
  }

  return (
    <>
      {content}
      {/* 룰렛은 모달 대신 원판 윗단 '당첨!' 배너로 결과를 보여준다 — 여기선 제외. */}
      {status === 'finished' && result && result.type !== 'roulette' && (
        <ResultModal onReturn={returnToRoom} countdown={secondsLeft}>
          {result.type === 'vote' ? (
            <VoteResult result={result} />
          ) : result.type === 'order' ? (
            <OrderResult result={result} />
          ) : (
            <DrawResult result={result} />
          )}
        </ResultModal>
      )}
      {ladderResult && (
        <ResultModal onReturn={returnToRoom} countdown={secondsLeft}>
          <LadderResult result={ladderResult} />
        </ResultModal>
      )}
      {/* 이미 60초 시점에 room:leave 로 나갔으므로 확인은 홈 이동만 한다(leave 중복 방지). */}
      {kicked && <KickModal onConfirm={goHome} />}
    </>
  );
}
