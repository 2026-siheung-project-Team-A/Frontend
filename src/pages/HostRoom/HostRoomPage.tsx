import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameResult, GameType } from '../../shared/types/api';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { GameSelect } from '../../features/room/components/GameSelect';
import { QrWaiting } from '../../features/room/components/QrWaiting';
import { Roulette } from '../../features/game/components/Roulette';
import { VotePlay } from '../../features/game/components/VotePlay';
import { GameStage } from '../../features/game/components/GameStage';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { VoteResult } from '../../features/game/components/results/VoteResult';
import { LadderResult } from '../../features/game/components/results/LadderResult';
import { ResultModal } from '../../features/game/components/results/ResultModal';
import { Screen } from '../../shared/ui';

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
      gameSocket.removeItem(s, id); // 서버 → item:removed → store.items
    } else {
      const st = useRoomStore.getState();
      st.setItems(st.items.filter((it) => it.id !== id)); // offline
    }
  };

  // ⑦ 룰렛 '돌리기'
  const activeResult = storeResult ?? localResult;
  const rouletteWinner =
    activeResult && activeResult.type === 'roulette' ? activeResult.winner : null;
  const spin = () => {
    // 항상 서버로 game:start emit → 서버가 winner 계산 후 game:result를 전원(참가자 포함) broadcast.
    const s = socketRef.current;
    if (s) gameSocket.startGame(s);
  };
  const finishPlay = () => setStatus('finished');

  // ⑫ 투표 '마감'
  const closeVote = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.closeVote(s);
  };

  // ⑧⑨⑩⑪ 즉시게임(제비·슬롯·풍선·사다리) 시작 → game:start. 백엔드가 결과 계산·전원 broadcast.
  const startInstant = () => {
    const s = socketRef.current;
    if (!s) return;
    const options =
      gameType === 'draw' || gameType === 'balloon' ? { count: 1 } : undefined;
    gameSocket.startGame(s, options);
  };

  // '같은 항목으로 다시하기' — 항목·게임종류는 그대로 두고 결과·집계만 비운 뒤 곧장 게임 화면으로(모달만 닫힘).
  const replay = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.resetGame(s); // 서버 결과·투표 삭제 + status:waiting broadcast
    setLocalResult(null);
    const st = useRoomStore.getState();
    st.setResult(null);
    st.setTally([]);
    st.setStatus('waiting');
  };

  const goHome = () => {
    useRoomStore.getState().reset();
    navigate('/');
  };

  if (phase === 'select') {
    return <GameSelect onSelect={chooseGame} onBack={() => navigate('/')} />;
  }

  if (phase === 'qr') {
    return (
      <QrWaiting
        roomId={roomId}
        joinUrl={`${window.location.origin}/r/${roomId}`}
        participants={participants}
        onlineCount={onlineCount}
        onStart={() => setPhase('play')}
        onBack={() => setPhase('select')}
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
      <Screen>
        <div className="topbar">
          <h1>룰렛</h1>
          <span className="chip" style={{ marginLeft: 'auto' }}>#{roomId}</span>
        </div>
        <Roulette
          items={wheelItems}
          isHost
          winner={rouletteWinner}
          onSpin={spin}
          onFinish={finishPlay}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      </Screen>
    );
  } else {
    // 제비·슬롯·풍선·사다리 — 즉시게임 (버튼 → game:start → 결과 애니 → 모달)
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
        <ResultModal isHost onReplay={replay} onHome={goHome}>
          {activeResult.type === 'vote' ? (
            <VoteResult result={activeResult} />
          ) : activeResult.type === 'ladder' ? (
            <LadderResult result={activeResult} />
          ) : (
            <DrawResult result={activeResult} />
          )}
        </ResultModal>
      )}
    </>
  );
}
