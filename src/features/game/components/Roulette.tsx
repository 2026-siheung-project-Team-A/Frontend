import { useEffect, useMemo, useRef, useState } from 'react';
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
 *
 * 회전은 "확정된 당첨(winner)"이 도착하면 그 칸으로 착지한다:
 *   - 백엔드 present: 호스트가 '돌리기'→onSpin(game:start emit)→서버 game:result→store.result
 *     →부모가 winner prop 전달→그 칸으로 회전.
 *   - offline: 부모가 로컬 추첨한 winner를 넘겨줌(같은 경로).
 * 참가자는 버튼 없이, winner가 도착하면 자동으로 같은 칸으로 회전(모두 동일 결과·동일 착지).
 * 회전이 끝나면 onFinish로 결과 화면 전환을 부모에 위임한다.
 *
 * winner.id 는 wheel의 items[].id 와 같은 출처여야 한다(둘 다 서버 또는 둘 다 로컬).
 */
export function Roulette({
  items,
  isHost,
  winner,
  onSpin,
  onFinish,
}: {
  items: Item[];
  isHost: boolean;
  winner?: Item | null;
  onSpin?: () => void;
  onFinish?: () => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [busy, setBusy] = useState(false);
  const spunFor = useRef<string | null>(null);
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

  // 확정 당첨이 도착하면 그 칸 중앙으로 회전(서버/offline 공통). 같은 winner엔 한 번만.
  useEffect(() => {
    if (!winner || spunFor.current === winner.id) return;
    const idx = items.findIndex((it) => it.id === winner.id);
    if (idx < 0) return;
    spunFor.current = winner.id;
    setBusy(true);
    const target = 360 * 5 - (idx * seg + seg / 2); // 포인터(12시)가 당첨 칸 중앙
    setRotation((r) => r - (r % 360) + target);
  }, [winner, items, seg]);

  const press = () => {
    if (busy || items.length < 2) return;
    setBusy(true); // 서버 응답/offline 추첨 대기 동안 버튼 잠금
    onSpin?.();
  };

  const handleEnd = () => {
    if (!busy) return;
    setBusy(false);
    onFinish?.();
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

      {isHost ? (
        <div style={{ width: '100%', marginTop: 8 }}>
          <Button onClick={press} disabled={busy || items.length < 2}>
            {busy ? '돌리는 중…' : '돌리기'}
          </Button>
        </div>
      ) : (
        <p className="muted">{busy ? '돌리는 중…' : '호스트가 돌리면 결과가 떠요'}</p>
      )}
    </div>
  );
}
