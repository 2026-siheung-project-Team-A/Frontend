import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameResult, Item } from '../../shared/types/api';
import { useRoomStore } from '../../features/room/store/roomStore';
import { useRoomConnection } from '../../features/room/socket/useRoomConnection';
import { gameSocket } from '../../features/game/socket/gameSocket';
import { ItemSetup } from '../../features/room/components/ItemSetup';
import { QrWaiting } from '../../features/room/components/QrWaiting';
import { Roulette } from '../../features/game/components/Roulette';
import { DrawResult } from '../../features/game/components/results/DrawResult';
import { Screen } from '../../shared/ui';

/**
 * 호스트 방 — status(waiting→playing→finished)로 화면을 분기한다.
 *  waiting  : ③ 항목 입력 → ④ QR 공유·대기 (local step)
 *  playing  : ⑦ 룰렛 (호스트가 돌리기)
 *  finished : ⑬ 결과
 *
 * useRoomConnection이 소켓을 소유하고 서버 이벤트를 store에 반영한다(참가자 목록·끊김 배너 등).
 * 항목은 호스트가 입력 주체라 로컬을 원본으로 두고 서버에 emit한다(백엔드 없이도 관통).
 * 결과는 로컬 룰렛 계산(offline) 또는 서버 game:result(백엔드 present) 둘 다로 들어온다.
 */
export function HostRoomPage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const socketRef = useRoomConnection(roomId, 'host');

  const status = useRoomStore((s) => s.status);
  const setStatus = useRoomStore((s) => s.setStatus);
  const participants = useRoomStore((s) => s.participants);
  const storeResult = useRoomStore((s) => s.result);

  const [step, setStep] = useState<'items' | 'qr'>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [localResult, setLocalResult] = useState<GameResult | null>(null);

  const addItem = (label: string) => {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), label }]);
    const s = socketRef.current;
    if (s) gameSocket.addItem(s, label); // 서버가 item:added/room:state로 참가자에 전파
  };
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    const s = socketRef.current;
    if (s) gameSocket.removeItem(s, id);
  };

  const startGame = () => {
    const s = socketRef.current;
    if (s) gameSocket.startGame(s); // 백엔드가 winner 계산 → game:result broadcast
    setStatus('playing');
  };

  // 로컬 룰렛(offline)에서 결과가 나온 경우. 백엔드가 있으면 game:result가 store.result를 채운다.
  const handleLocalResult = (winner: Item) => {
    setLocalResult({ type: 'roulette', winner });
    setStatus('finished');
  };

  const replay = () => {
    setLocalResult(null);
    useRoomStore.getState().setResult(null);
    setStatus('waiting');
    setStep('qr');
  };

  if (status === 'playing') {
    return (
      <Screen>
        <div className="topbar">
          <h1>룰렛</h1>
          <span className="chip" style={{ marginLeft: 'auto' }}>#{roomId}</span>
        </div>
        <Roulette items={items} isHost onResult={handleLocalResult} />
      </Screen>
    );
  }

  const result = storeResult ?? localResult;
  if (status === 'finished' && result) {
    return (
      <Screen>
        <DrawResult result={result} isHost onReplay={replay} />
      </Screen>
    );
  }

  // waiting
  return step === 'items' ? (
    <ItemSetup
      items={items}
      onAdd={addItem}
      onRemove={removeItem}
      onNext={() => setStep('qr')}
      onBack={() => navigate('/')}
    />
  ) : (
    <QrWaiting
      roomId={roomId}
      joinUrl={`${window.location.origin}/r/${roomId}`}
      participants={participants}
      onStart={startGame}
      onBack={() => setStep('items')}
    />
  );
}
