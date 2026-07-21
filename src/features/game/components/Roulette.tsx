import { useMemo, useRef, useState } from 'react';
import type { Item } from '../../../shared/types/api';
import { Button } from '../../../shared/ui';

/** 6칸 기준 부드러운 파스텔 세그먼트 색 */
const SEG_COLORS = [
  '#c7d2fe',
  '#fbcfe8',
  '#bbf7d0',
  '#fde68a',
  '#bae6fd',
  '#ddd6fe',
  '#fecaca',
  '#a5f3fc',
];

/**
 * ⑦ 룰렛 — conic-gradient 원판 + 회전 애니메이션.
 * 호스트: "돌리기" 버튼으로 회전 시작(로컬 데모 계산).
 *   실제 흐름에선 game:start emit → 서버가 winner 결정 → game:result 수신 후
 *   그 index로 회전을 맞춘다. onSpin/onResult 훅으로 소켓 배선을 끼운다.
 * 참가자: 버튼 없이 원판만(회전은 추후 소켓으로 동기화).
 */
export function Roulette({
  items,
  isHost,
  onResult,
}: {
  items: Item[];
  isHost: boolean;
  onResult?: (winner: Item) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const winnerRef = useRef<Item | null>(null);
  const n = Math.max(items.length, 1);
  const seg = 360 / n;

  const gradient = useMemo(() => {
    const stops = items
      .map((_, i) => {
        const color = SEG_COLORS[i % SEG_COLORS.length];
        return `${color} ${i * seg}deg ${(i + 1) * seg}deg`;
      })
      .join(', ');
    return items.length ? `conic-gradient(${stops})` : 'var(--placeholder)';
  }, [items, seg]);

  const spin = () => {
    if (spinning || items.length < 2) return;
    const winnerIndex = Math.floor(Math.random() * items.length);
    winnerRef.current = items[winnerIndex];
    // 포인터(12시)가 당첨 칸 중앙을 가리키도록 회전각 계산 + 여러 바퀴
    const target = 360 * 5 - (winnerIndex * seg + seg / 2);
    setSpinning(true);
    setRotation((r) => r - (r % 360) + target);
  };

  const handleEnd = () => {
    if (!spinning) return;
    setSpinning(false);
    if (winnerRef.current) onResult?.(winnerRef.current);
  };

  return (
    <div className="roulette-stage">
      <div className="roulette-pointer" />
      <div
        className="roulette-wheel"
        style={{ background: gradient, transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={handleEnd}
      >
        {items.map((it, i) => (
          <span
            key={it.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `rotate(${i * seg + seg / 2}deg) translateY(-38%)`,
              transformOrigin: '0 0',
              fontSize: 13,
              fontWeight: 600,
              color: '#16181d',
              whiteSpace: 'nowrap',
            }}
          >
            {it.label}
          </span>
        ))}
      </div>

      {isHost && (
        <div style={{ width: '100%', marginTop: 8 }}>
          <Button onClick={spin} disabled={spinning || items.length < 2}>
            {spinning ? '돌리는 중…' : '돌리기'}
          </Button>
        </div>
      )}
      {!isHost && <p className="muted">호스트가 돌리면 결과가 떠요</p>}
    </div>
  );
}
