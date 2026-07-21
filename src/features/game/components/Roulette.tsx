import { useEffect, useRef, useState } from 'react';
import type { Item } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';

/** 원판 슬라이스 파스텔 색 (최대 8칸) */
const SLICE_COLORS = [
  '#f4a63f', '#ef8d8d', '#b89ae2', '#7cc0e8',
  '#8ed08c', '#f3cf68', '#e79ac2', '#83d2c3',
];
const MIN = 2;
const MAX = 12;

/**
 * 원판 돌리기 — 호스트는 이 화면 안에서 옵션 개수(±, 2~8)를 정하고
 * 원판의 각 칸을 눌러 항목을 직접 입력한다. 항목은 로컬 draft(slots)로 다루다가
 * "돌리기"를 누르는 순간 서버 items로 동기화(기존 제거 → 순차 추가)하고 game:start 한다.
 *   - onSpinLabels(labels): 부모가 서버 동기화 + game:start 를 수행.
 *   - winner 도착 → 그 칸으로 회전 → onFinish 로 결과 모달을 부모가 띄운다.
 * 참가자는 편집 없이 원판을 보되, "돌리기" 전(items 아직 없음)엔 draftLabels(호스트가
 * 타이핑 중인 라벨의 실시간 미리보기, roulette:draft)로, 확정 후엔 서버 items 로 그린다.
 * 호스트 쪽은 slots 가 바뀔 때마다 onDraftChange 로 그 미리보기를 참가자에게 실시간 전송한다.
 */
export function Roulette({
  items,
  isHost,
  winner,
  draftLabels,
  onSpinLabels,
  onDraftChange,
  onFinish,
  onLeave,
}: {
  items: Item[];
  isHost: boolean;
  winner?: Item | null;
  /** 참가자용 — 호스트가 아직 확정 안 한(items 비어있는) 동안의 실시간 미리보기 라벨. */
  draftLabels?: string[];
  onSpinLabels?: (labels: string[]) => void;
  /** 호스트용 — 셋업 중 slots 가 바뀔 때마다(디바운스) 호출, 참가자에게 실시간 전송용. */
  onDraftChange?: (labels: string[]) => void;
  onFinish?: () => void;
  onLeave?: () => void;
}) {
  const [slots, setSlots] = useState<string[]>(() => {
    const init = items.map((i) => i.label);
    while (init.length < MIN) init.push('');
    return init.slice(0, MAX);
  });
  const [phase, setPhase] = useState<'setup' | 'spin'>(isHost ? 'setup' : 'spin');
  const [spinLabels, setSpinLabels] = useState<string[] | null>(null);
  const [rotation, setRotation] = useState(0);
  const finishedRef = useRef(false);
  const spunFor = useRef<string | null>(null);

  const editable = isHost && phase === 'setup';

  // 원판에 그릴 라벨: 셋업이면 편집 중인 slots, 진행이면 호스트는 확정 라벨(spinLabels)·
  // 참가자는 서버 items(확정 후) 우선, 아직 없으면 draftLabels(호스트가 입력 중인 실시간 미리보기).
  const displayLabels = editable
    ? slots
    : isHost
      ? spinLabels ?? slots.filter((s) => s.trim())
      : items.length
        ? items.map((i) => i.label)
        : (draftLabels ?? []);
  const n = Math.max(displayLabels.length, 1);
  const seg = 360 / n;
  const filledCount = slots.filter((s) => s.trim()).length;

  const gradient = displayLabels.length
    ? `conic-gradient(${displayLabels
        .map((_, i) => `${SLICE_COLORS[i % SLICE_COLORS.length]} ${i * seg}deg ${(i + 1) * seg}deg`)
        .join(', ')})`
    : 'var(--placeholder)';

  function done() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.();
  }

  // 확정 winner 도착 → 그 칸 중앙으로 회전 (진행 단계에서만).
  // 호스트는 라벨로, 참가자는 서버 id로 당첨 칸을 찾는다.
  useEffect(() => {
    if (editable || !winner) return;
    if (spunFor.current === winner.id) return;
    const idx = isHost
      ? displayLabels.findIndex((l) => l === winner.label)
      : items.findIndex((it) => it.id === winner.id);
    if (idx < 0) return;
    spunFor.current = winner.id;
    const target = 360 * 5 - (idx * seg + seg / 2); // 포인터(12시)가 당첨 칸 중앙
    const raf = requestAnimationFrame(() =>
      setRotation((r) => r - (r % 360) + target),
    );
    const fb = setTimeout(done, 4600); // 회전 4s + 여유
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, items, seg, editable, isHost]);

  // '같은 항목으로 다시하기'(winner 초기화) → 셋업 복귀 (slots는 유지해 그대로 다시 돌릴 수 있게)
  useEffect(() => {
    if (isHost && !winner) {
      setPhase('setup');
      setSpinLabels(null);
      setRotation(0);
      finishedRef.current = false;
      spunFor.current = null;
    }
  }, [winner, isHost]);

  // 셋업 중 slots 가 바뀌면(타이핑·개수 조절) 참가자에게 실시간 미리보기를 보낸다(디바운스 150ms).
  useEffect(() => {
    if (!editable || !onDraftChange) return;
    const t = setTimeout(() => onDraftChange(slots), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, editable]);

  const setCount = (next: number) => {
    const c = Math.min(MAX, Math.max(MIN, next));
    setSlots((prev) => {
      if (c === prev.length) return prev;
      if (c < prev.length) return prev.slice(0, c);
      return [...prev, ...Array<string>(c - prev.length).fill('')];
    });
  };

  const spin = () => {
    const filled = slots.map((s) => s.trim()).filter(Boolean);
    if (filled.length < MIN) return;
    setSpinLabels(filled);
    setPhase('spin');
    onSpinLabels?.(filled);
  };

  // 각 칸 라벨 위치 (극좌표 — 중심에서 31% 반경, 칸 중앙 각도)
  const labelPos = (i: number) => {
    const a = ((i + 0.5) * seg * Math.PI) / 180;
    const r = 31;
    return { left: `${50 + Math.sin(a) * r}%`, top: `${50 - Math.cos(a) * r}%` };
  };

  const wheel = (
    <div className="rw-stage" key="stage">
      <div className="rw-pointer" />
      <div
        className="rw-wheel"
        style={{ background: gradient, transform: `rotate(${rotation}deg)` }}
        onTransitionEnd={done}
      >
        <div className="rw-hub" />
        {displayLabels.map((label, i) =>
          editable ? (
            <input
              key={i}
              className="rw-slot-input"
              style={labelPos(i)}
              value={label}
              placeholder={`옵션${i + 1}`}
              maxLength={12}
              onChange={(e) =>
                setSlots((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))
              }
            />
          ) : (
            <span key={i} className="rw-slot" style={labelPos(i)}>
              {label}
            </span>
          ),
        )}
      </div>
    </div>
  );

  // 단일 구조로 렌더 — 셋업↔진행에서 .rw-wheel 이 리마운트되지 않아야
  // 회전 트랜지션(0→target)이 확실히 재생된다. (예전엔 두 개의 다른 return 이라
  // 원판이 remount 되며 애니메이션이 사라지는 버그가 있었다.)
  return (
    <Screen
      footer={
        editable ? (
          <Button block onClick={spin} disabled={filledCount < MIN}>
            돌리기
          </Button>
        ) : undefined
      }
    >
      <TopBar title="원판 돌리기" onBack={onLeave} />
      {editable && (
        <div className="rw-count">
          <span>옵션 개수</span>
          <button
            className="rw-step"
            onClick={() => setCount(slots.length - 1)}
            disabled={slots.length <= MIN}
            aria-label="개수 줄이기"
          >
            −
          </button>
          <b>{slots.length}개</b>
          <button
            className="rw-step"
            onClick={() => setCount(slots.length + 1)}
            disabled={slots.length >= MAX}
            aria-label="개수 늘리기"
          >
            +
          </button>
          <span className="rw-count-hint">(2개~8개 설정가능)</span>
        </div>
      )}
      <div className="rw-panel">
        {editable && (
          <p className="rw-guide" key="guide">
            각 칸을 눌러 항목 내용을 적어주세요.
          </p>
        )}
        {wheel}
        <p className={`rw-status${editable ? '' : ' muted'}`} key="status">
          {editable ? (
            <>
              <b>{filledCount}개 입력중</b> / 총 {slots.length}개
            </>
          ) : isHost ? (
            '돌리는 중…'
          ) : (
            '호스트가 돌리면 결과가 떠요'
          )}
        </p>
      </div>
    </Screen>
  );
}
