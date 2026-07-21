import { useEffect, useRef, useState } from 'react';
import type { GameResult, GameType, Item } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';
import { ItemEditor } from '../../room/components/ItemEditor';

/**
 * 즉시게임(슬롯·제비뽑기·풍선·사다리) 공용 플레이 화면 — 와이어프레임 ⑧⑨⑩⑪ 기본.
 * 호스트가 시작 버튼 → onStart()(game:start emit) → 서버 game:result → result prop 도착.
 * result 가 오면 잠깐 애니메이션(active) 후 onFinish() 로 결과 화면 전환(룰렛과 같은 흐름).
 * 참가자는 버튼 없이 관전하다 result 가 오면 같은 애니메이션을 본다.
 * (디자인은 추후 수정 예정 — 기본 버전)
 */
const META: Record<
  Exclude<GameType, 'roulette' | 'vote'>,
  { title: string; hint: string; action: string; busy: string }
> = {
  order: { title: '순서 정하기', hint: '항목을 무작위 순서로 줄 세워요', action: '순서 정하기', busy: '순서 정하는 중…' },
  draw: { title: '제비뽑기', hint: '제비를 하나 뽑아요', action: '제비 뽑기', busy: '뽑는 중…' },
  balloon: { title: '풍선 터뜨리기', hint: '풍선을 터뜨리면 항목이 나와요', action: '터뜨리기', busy: '터뜨리는 중…' },
  ladder: { title: '사다리타기', hint: '항목을 무작위로 이어요', action: '사다리 타기', busy: '내려가는 중…' },
};

export function GameStage({
  roomId,
  gameType,
  items,
  isHost,
  onStart,
  result,
  onFinish,
  onLeave,
  onAddItem,
  onRemoveItem,
}: {
  roomId: string;
  gameType: Exclude<GameType, 'roulette' | 'vote'>;
  items: Item[];
  isHost: boolean;
  onStart?: () => void;
  result?: GameResult | null;
  onFinish?: () => void;
  onLeave?: () => void;
  /** 호스트 전용 — 항목 편집기를 스테이지 위에 함께 보여줄 때 넘긴다. */
  onAddItem?: (label: string) => void;
  onRemoveItem?: (id: string) => void;
}) {
  const meta = META[gameType];
  const [active, setActive] = useState(false);
  const finishedRef = useRef(false);

  // 결과 도착 → 애니메이션 재생 후 결과 화면으로 전환
  useEffect(() => {
    if (!result || finishedRef.current) return;
    finishedRef.current = true;
    setActive(true);
    const t = setTimeout(() => onFinish?.(), 1700);
    return () => clearTimeout(t);
  }, [result, onFinish]);

  const start = () => {
    if (active || items.length < 2) return;
    setActive(true); // 즉시 피드백
    onStart?.();
  };

  return (
    <Screen
      footer={
        isHost ? (
          <Button block onClick={start} disabled={active || items.length < 2}>
            {active ? meta.busy : meta.action}
          </Button>
        ) : undefined
      }
    >
      <TopBar title={meta.title} onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />
      <p className="subtitle" style={{ marginTop: -8 }}>{meta.hint}</p>

      {isHost && onAddItem && onRemoveItem && (
        <ItemEditor items={items} onAdd={onAddItem} onRemove={onRemoveItem} locked={active} />
      )}

      <div className={`stage-visual${active ? ' active' : ''}`}>
        {gameType === 'order' && (
          <div className="order-preview">
            {items.map((it) => (
              <span key={it.id} className="order-chip">{it.label}</span>
            ))}
          </div>
        )}

        {gameType === 'draw' && (
          <div className="draw-cup">
            {items.slice(0, 8).map((it) => (
              <span key={it.id} className="draw-stick" title={it.label} />
            ))}
          </div>
        )}

        {gameType === 'balloon' && (
          <div className="balloon-grid">
            {items.map((it) => (
              <span key={it.id} className="balloon" title={it.label}>🎈</span>
            ))}
          </div>
        )}

        {gameType === 'ladder' && (
          <div className="ladder">
            <div className="ladder-row">
              {items.slice(0, 5).map((it) => (
                <span key={it.id} className="ladder-cell">{it.label}</span>
              ))}
            </div>
            <div className="ladder-lines">
              {items.slice(0, 5).map((it) => (
                <span key={it.id} className="ladder-line" />
              ))}
            </div>
            <div className="ladder-row">
              {items.slice(0, 5).map((_, i) => (
                <span key={i} className="ladder-cell muted">?</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {!isHost && (
        <p className="center muted" style={{ fontSize: 13 }}>
          {active ? meta.busy : '호스트가 시작하면 결과가 떠요'}
        </p>
      )}
    </Screen>
  );
}
