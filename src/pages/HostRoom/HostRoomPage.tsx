import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameResult, GameType, Item } from '../../shared/types/api';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { GameSelect } from '../../features/room/components/GameSelect';
import { ItemSetup } from '../../features/room/components/ItemSetup';
import { QrWaiting } from '../../features/room/components/QrWaiting';
import { Roulette } from '../../features/game/components/Roulette';
import { VotePlay } from '../../features/game/components/VotePlay';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { VoteResult } from '../../features/game/components/results/VoteResult';
import { Screen } from '../../shared/ui';

type Phase = 'select' | 'items' | 'qr' | 'play';

/**
 * 호스트 방 — 진행 흐름(local phase) + 결과(store.status).
 *  select : ② 게임 선택 → game:select
 *  items  : ③ 항목 입력
 *  qr     : ④ QR 공유·대기
 *  play   : ⑦ 룰렛(돌리기=game:start) 또는 ⑫ 투표(실시간 집계·마감=vote:close)
 *  결과   : status='finished' → ⑬ 뽑기결과 / ⑮ 투표결과 (result.type로 분기)
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
  const [items, setItems] = useState<Item[]>([]);
  const [localResult, setLocalResult] = useState<GameResult | null>(null);

  const connected = connection === 'connected';
  const wheelItems = connected && storeItems.length ? storeItems : items;

  const chooseGame = (gt: GameType) => {
    setGameType(gt);
    const s = socketRef.current;
    if (s) gameSocket.selectGame(s, gt);
    setPhase('items');
  };

  const addItem = (label: string) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    const s = socketRef.current;
    if (s) gameSocket.addItem(s, label);
  };
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    const s = socketRef.current;
    if (s) gameSocket.removeItem(s, id);
  };

  // ⑦ 룰렛 '돌리기'
  const activeResult = storeResult ?? localResult;
  const rouletteWinner =
    activeResult && activeResult.type === 'roulette' ? activeResult.winner : null;
  const spin = () => {
    const s = socketRef.current;
    if (connected && s) {
      gameSocket.startGame(s);
    } else if (wheelItems.length >= 2) {
      const w = wheelItems[Math.floor(Math.random() * wheelItems.length)];
      setLocalResult({ type: 'roulette', winner: w });
    }
  };
  const finishRoulette = () => setStatus('finished');

  // ⑫ 투표 '마감'
  const closeVote = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.closeVote(s);
  };

  const replay = () => {
    const s = socketRef.current;
    if (connected && s) gameSocket.resetGame(s);
    setLocalResult(null);
    const st = useRoomStore.getState();
    st.setResult(null);
    st.setTally([]);
    st.setStatus('waiting');
    setPhase('qr');
  };

  const goHome = () => {
    useRoomStore.getState().reset();
    navigate('/');
  };

  // ── 결과 우선 ──────────────────────────────────────────────
  if (status === 'finished' && activeResult) {
    return (
      <Screen>
        {activeResult.type === 'vote' ? (
          <VoteResult result={activeResult} isHost onReplay={replay} onHome={goHome} />
        ) : (
          <DrawResult result={activeResult} isHost onReplay={replay} onHome={goHome} />
        )}
      </Screen>
    );
  }

  // ── 진행 흐름 ──────────────────────────────────────────────
  if (phase === 'play') {
    if (gameType === 'vote') {
      return (
        <VotePlay
          roomId={roomId}
          items={wheelItems}
          tally={tally}
          isHost
          onClose={closeVote}
        />
      );
    }
    return (
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
          onFinish={finishRoulette}
        />
      </Screen>
    );
  }

  if (phase === 'select') {
    return <GameSelect onSelect={chooseGame} onBack={() => navigate('/')} />;
  }

  if (phase === 'items') {
    return (
      <ItemSetup
        items={items}
        onAdd={addItem}
        onRemove={removeItem}
        onNext={() => setPhase('qr')}
        onBack={() => setPhase('select')}
      />
    );
  }

  // qr
  return (
    <QrWaiting
      roomId={roomId}
      joinUrl={`${window.location.origin}/r/${roomId}`}
      participants={participants}
      onlineCount={onlineCount}
      onStart={() => setPhase('play')}
      onBack={() => setPhase('items')}
    />
  );
}
