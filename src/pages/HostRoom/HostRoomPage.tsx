import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameResult, GameType } from '../../shared/types/api';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { roomSocket } from '../../features/room/socket/roomSocket';
import { GameSelect } from '../../features/room/components/GameSelect';
import { GameLobby } from '../../features/room/components/GameLobby';
import { Roulette } from '../../features/game/components/Roulette';
import { VotePlay } from '../../features/game/components/VotePlay';
import { GameStage } from '../../features/game/components/GameStage';
import { Ladder } from '../../features/game/components/Ladder';
import { DrawPlay } from '../../features/game/components/DrawPlay';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { VoteResult } from '../../features/game/components/results/VoteResult';
import { LadderResult } from '../../features/game/components/results/LadderResult';
import { ResultModal } from '../../features/game/components/results/ResultModal';

type Phase = 'select' | 'qr' | 'play';

/**
 * 호스트 방 — 진행 흐름(local phase) + 결과(store.status).
 *  select : ② 게임 선택 → game:select
 *  qr     : ④ QR 공유·대기
 *  play   : 게임 화면. 항목입력 페이지도, 결과 페이지도 없다 — 각 게임 컴포넌트가
 *           자기 화면 위에 ItemEditor를 얹어 항목을 다루고, 게임이 끝나면(status='finished')
 *           그 게임 화면은 그대로 둔 채 위에 ResultModal이 뜬다(다시하기/홈으로).
 *
 * 룰렛 휠·투표 항목은 winner/tally 의 item.id 가 items[].id 와 일치해야 하므로
 * 연결 시엔 서버 items(store.items)를, offline 이면 로컬 items 를 쓴다.
 */
export function HostRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const socketRef = useRoomConnection(roomId, 'host');

  const status = useRoomStore((s) => s.status);
  const setStatus = useRoomStore((s) => s.setStatus);
  const participants = useRoomStore((s) => s.participants);
  const onlineCount = useRoomStore((s) => s.onlineCount);
  const storeItems = useRoomStore((s) => s.items);
  const storeResult = useRoomStore((s) => s.result);
  const tally = useRoomStore((s) => s.tally);
  const connection = useRoomStore((s) => s.connection);
  const ladder = useRoomStore((s) => s.ladder);
  const ladderTopLabels = useRoomStore((s) => s.ladderTopLabels);
  const ladderBottomLabels = useRoomStore((s) => s.ladderBottomLabels);
  const ladderRevealed = useRoomStore((s) => s.ladderRevealed);
  const ladderResult = useRoomStore((s) => s.ladderResult);
  const draw = useRoomStore((s) => s.draw);
  const drawRound = useRoomStore((s) => s.drawRound);

  const [phase, setPhase] = useState<Phase>('select');
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [localResult, setLocalResult] = useState<GameResult | null>(null);

  const connected = connection === 'connected';
  const wheelItems = storeItems;

  const chooseGame = (gt: GameType) => {
    setGameType(gt);
    const s = socketRef.current;
    if (s) gameSocket.selectGame(s, gt);
    setPhase('qr');
  };

  // '게임 시작 ▶' — 아직 결과도 항목 편집도 안 끝났지만, game:begin 으로 참가자를
  // 대기 화면에서 실제 게임 화면으로 옮겨 이후 과정(목록 작성·게임 진행)을 실시간으로 보게 한다.
  const beginPlay = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.beginGame(s);
    setPhase('play');
  };

  // 방 삭제 — 로비의 뒤로가기/방 삭제하기에서 확인 모달을 거친 뒤 호출된다(여기선 바로 삭제).
  // room:close → 서버가 전원에게 room:closed broadcast + 소켓 해제 → 참가자는 메인으로 튕긴다.
  const deleteRoom = () => {
    const s = socketRef.current;
    if (connected && s) roomSocket.close(s);
    useRoomStore.getState().reset();
    navigate('/');
  };

  // 항목 추가/삭제 — 게임 화면 위 ItemEditor에서 한 번에 하나씩 커밋된다(사람이 타이핑하는
  // 속도로 자연히 간격이 생겨, 서버의 read-modify-write 저장이 겹쳐 실행되는 문제가 없다).
  const addItem = (label: string) => {
    const s = socketRef.current;
    if (connected && s) {
      void gameSocket.addItem(s, label); // 서버 → item:added → store.items
    } else {
      const st = useRoomStore.getState();
      st.setItems([...st.items, { id: crypto.randomUUID(), label }]); // offline
    }
  };
  const removeItem = (id: string) => {
    const s = socketRef.current;
    if (connected && s) {
      void gameSocket.removeItem(s, id); // 서버 → item:removed → store.items
    } else {
      const st = useRoomStore.getState();
      st.setItems(st.items.filter((it) => it.id !== id)); // offline
    }
  };

  const activeResult = storeResult ?? localResult;
  const rouletteWinner =
    activeResult && activeResult.type === 'roulette' ? activeResult.winner : null;

  // ⑦ 룰렛 '돌리기' — 원판에서 정한 라벨들로 서버 items를 교체(기존 제거 → 순차 추가)한 뒤 게임 시작.
  // 서버가 winner를 계산해 game:result를 전원(참가자 포함) broadcast → 양쪽 원판이 같은 칸으로 착지.
  const spinRoulette = async (labels: string[]) => {
    const s = socketRef.current;
    if (connected && s) {
      for (const it of useRoomStore.getState().items) await gameSocket.removeItem(s, it.id);
      for (const label of labels) await gameSocket.addItem(s, label);
      gameSocket.startGame(s);
    } else {
      // offline — 로컬 항목 세팅 + 로컬 추첨
      const local = labels.map((label) => ({ id: crypto.randomUUID(), label }));
      useRoomStore.getState().setItems(local);
      setLocalResult({
        type: 'roulette',
        winner: local[Math.floor(Math.random() * local.length)],
      });
    }
  };
  const finishPlay = () => setStatus('finished');

  // ⑫ 투표 '마감'
  const closeVote = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.closeVote(s);
  };

  // ⑧⑨ 즉시게임(슬롯·풍선) 시작 → game:start. 백엔드가 결과 계산·전원 broadcast.
  // (제비뽑기는 인터랙티브 draw:shuffle/pick 흐름이라 이 경로를 안 탄다)
  const startInstant = () => {
    const s = socketRef.current;
    if (!s) return;
    const options = gameType === 'balloon' ? { count: 1 } : undefined;
    gameSocket.startGame(s, options);
  };

  // ⑪ 사다리(네이버 스타일) — build(칸별 상·하단 라벨) / reveal(시작칸) / result(결과 보기).
  const buildLadder = (topLabels: string[], bottomLabels: string[]) => {
    const s = socketRef.current;
    if (s) gameSocket.buildLadder(s, topLabels, bottomLabels);
  };
  const revealLadder = (topIndex: number) => {
    const s = socketRef.current;
    if (s) gameSocket.revealLadder(s, topIndex);
  };
  const showLadderResult = () => {
    const s = socketRef.current;
    if (s) gameSocket.resultLadder(s);
  };

  // 제비뽑기 — 섞기(호스트)·뽑기(호스트도 참가). 뽑기는 ack 로 잠금 실패를 받아 DrawPlay 가 안내한다.
  const shuffleDraw = (count: number, blanks: number) => {
    const s = socketRef.current;
    if (s) gameSocket.shuffleDraw(s, count, blanks);
  };
  const pickDraw = (index: number) => {
    const s = socketRef.current;
    return s ? gameSocket.pickDraw(s, index) : Promise.resolve({ ok: false });
  };

  // '방으로 돌아가기' — 라운드를 접어(서버가 결과·투표·사다리·제비 데이터 삭제, 대기 전환)
  // 로비(qr)로 돌아간다. 참가자를 강제 이동시키지 않는다 — 각자 결과창의 '방으로 돌아가기'로 온다.
  // 로비에서 호스트는 게임 종류를 바꾸거나(인라인) 다시 시작할 수 있다.
  const returnToRoom = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.returnToRoom(s); // 서버 데이터 삭제 + status:waiting
    setLocalResult(null);
    const st = useRoomStore.getState();
    st.setResult(null);
    st.setTally([]);
    st.resetLadder();
    st.resetDraw();
    st.setStatus('waiting');
    setPhase('qr');
  };

  const goHome = () => {
    useRoomStore.getState().reset();
    navigate('/');
  };

  // 첫 화면(아직 게임도 안 고른 상태)에서 나가기 — 방은 여기서만 실제로 삭제된다(방금 만들고 나가기).
  const leaveBeforeStart = () => {
    const s = socketRef.current;
    if (connected && s) roomSocket.close(s);
    goHome();
  };

  if (phase === 'select') {
    return <GameSelect onSelect={chooseGame} onBack={leaveBeforeStart} />;
  }

  if (phase === 'qr') {
    return (
      <GameLobby
        roomId={roomId}
        joinUrl={`${window.location.origin}/r/${roomId}`}
        participants={participants}
        onlineCount={onlineCount}
        isHost
        gameType={gameType}
        onSelectGame={chooseGame}
        onStart={beginPlay}
        onDeleteRoom={deleteRoom}
      />
    );
  }

  // play — 게임 화면은 결과가 나온 뒤에도 그대로 남고, 그 위에 결과 모달만 뜬다.
  let content;
  if (gameType === 'vote') {
    content = (
      <VotePlay
        roomId={roomId}
        items={wheelItems}
        tally={tally}
        isHost
        onClose={closeVote}
        onAddItem={addItem}
        onRemoveItem={removeItem}
      />
    );
  } else if (gameType === 'roulette' || !gameType) {
    content = (
      <Roulette
        items={wheelItems}
        isHost
        winner={rouletteWinner}
        onSpinLabels={spinRoulette}
        onDraftChange={(labels) => {
          const s = socketRef.current;
          if (connected && s) gameSocket.sendRouletteDraft(s, labels);
        }}
        onFinish={finishPlay}
        onLeave={goHome}
      />
    );
  } else if (gameType === 'ladder') {
    // ⑪ 사다리 — 편집(상·하단 라벨·칸 수) → 시작 → 시작칸 공개(내려오는 애니메이션) → 결과 보기
    content = (
      <Ladder
        roomId={roomId}
        isHost
        ladder={ladder}
        topLabels={ladderTopLabels}
        bottomLabels={ladderBottomLabels}
        revealed={ladderRevealed}
        onBuild={buildLadder}
        onReveal={revealLadder}
        onResult={showLadderResult}
        onLeave={goHome}
      />
    );
  } else if (gameType === 'draw') {
    // 제비뽑기(인터랙티브) — 인원수·꽝 설정 → 섞기 → 호스트·참가자 각자 뽑기(먼저 뽑힌 제비는 잠금)
    content = (
      <DrawPlay
        roomId={roomId}
        isHost
        draw={draw}
        round={drawRound}
        onShuffle={shuffleDraw}
        onPick={pickDraw}
        onReturn={returnToRoom}
        onLeave={goHome}
      />
    );
  } else {
    // 슬롯·풍선 — 즉시게임 (버튼 → game:start → 결과 애니 → 모달)
    content = (
      <GameStage
        roomId={roomId}
        gameType={gameType}
        items={wheelItems}
        isHost
        onStart={startInstant}
        result={activeResult}
        onFinish={finishPlay}
        onAddItem={addItem}
        onRemoveItem={removeItem}
      />
    );
  }

  return (
    <>
      {content}
      {status === 'finished' && activeResult && (
        <ResultModal onReturn={returnToRoom}>
          {activeResult.type === 'vote' ? (
            <VoteResult result={activeResult} />
          ) : (
            <DrawResult result={activeResult} />
          )}
        </ResultModal>
      )}
      {ladderResult && (
        <ResultModal onReturn={returnToRoom}>
          <LadderResult result={ladderResult} />
        </ResultModal>
      )}
    </>
  );
}
