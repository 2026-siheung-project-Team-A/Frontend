import { useEffect, useRef, useState } from 'react';
import type { LadderStructure } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';

/**
 * 사다리타기(네이버 스타일) — 한 화면에서 편집 → 시작 → 공개까지.
 *
 *  편집(ladder=null): 호스트가 칸마다 상단(이름)·하단(당첨항목)을 적고, 옵션 −/+ 로 칸을 2~10개
 *    조절한 뒤 '사다리 시작' → onBuild. 참가자는 "준비 중" 대기.
 *  진행(ladder≠null): 서버가 만든 가로줄을 그린다. 호스트가 위 시작칸을 누르면(onReveal) 그 칸이
 *    사다리를 따라 내려오는 애니메이션이 호스트·참가자 모두에게 재생된다. '결과 보기'(onResult)로 한 번에.
 *
 * 계약(백엔드 소유): ladder:build/built · ladder:reveal/revealed · ladder:result.
 * 구조·라벨·공개목록은 store(=서버 이벤트) 값을 그대로 받으므로 전원이 같은 사다리를 본다.
 */

const MIN = 2;
const MAX = 10;
const CANVAS_H = 300; // SVG 세로줄 높이(뷰박스 단위)
const COL = 100; // 칸당 가로 폭(뷰박스 단위) — colX(c) = c*COL + COL/2

/** 시작칸 색상(공개 순서 무관, 칸 index 로 고정) */
const COLORS = [
  '#e5484d', '#0091ff', '#30a46c', '#f5a623', '#8e4ec6',
  '#e93d82', '#00a3a3', '#d6409f', '#5b5bd6', '#bd8b00',
];

const colX = (c: number) => c * COL + COL / 2;
const hasRung = (l: LadderStructure, row: number, col: number) =>
  l.rungs.some((g) => g.row === row && g.col === col);
const rungY = (l: LadderStructure, row: number) =>
  ((row + 1) / (l.rows + 1)) * CANVAS_H;

/** 시작칸 start 에서 사다리를 따라 내려오는 경로 좌표들(꺾은선). 끝점은 mapping[start] 칸. */
function tracePath(l: LadderStructure, start: number): Array<{ x: number; y: number }> {
  const pts = [{ x: colX(start), y: 0 }];
  let pos = start;
  for (let row = 0; row < l.rows; row++) {
    if (hasRung(l, row, pos)) {
      pts.push({ x: colX(pos), y: rungY(l, row) });
      pos += 1;
      pts.push({ x: colX(pos), y: rungY(l, row) });
    } else if (hasRung(l, row, pos - 1)) {
      pts.push({ x: colX(pos), y: rungY(l, row) });
      pos -= 1;
      pts.push({ x: colX(pos), y: rungY(l, row) });
    }
  }
  pts.push({ x: colX(pos), y: CANVAS_H });
  return pts;
}

const toPathD = (pts: Array<{ x: number; y: number }>) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

export function Ladder({
  roomId,
  isHost,
  ladder,
  topLabels,
  bottomLabels,
  revealed,
  onBuild,
  onReveal,
  onResult,
  onLeave,
}: {
  roomId: string;
  isHost: boolean;
  ladder: LadderStructure | null;
  topLabels: string[];
  bottomLabels: string[];
  revealed: number[];
  onBuild: (topLabels: string[], bottomLabels: string[]) => void;
  onReveal: (topIndex: number) => void;
  onResult: () => void;
  onLeave: () => void;
}) {
  // ── 편집 상태(호스트, build 전) — 로컬. 서버로는 '사다리 시작' 때만 나간다. ──
  const [tops, setTops] = useState<string[]>(['', '', '', '']);
  const [bottoms, setBottoms] = useState<string[]>(['', '', '', '']);

  const setCount = (n: number) => {
    const next = Math.max(MIN, Math.min(MAX, n));
    setTops((prev) => resize(prev, next));
    setBottoms((prev) => resize(prev, next));
  };
  const resize = (arr: string[], n: number) =>
    arr.length === n
      ? arr
      : arr.length < n
        ? [...arr, ...Array(n - arr.length).fill('')]
        : arr.slice(0, n);

  // ── 진행 화면(build 후) ──
  if (ladder) {
    return (
      <PlayBoard
        roomId={roomId}
        isHost={isHost}
        ladder={ladder}
        topLabels={topLabels}
        bottomLabels={bottomLabels}
        revealed={revealed}
        onReveal={onReveal}
        onResult={onResult}
        onLeave={onLeave}
      />
    );
  }

  // ── 참가자는 편집 중 대기 ──
  if (!isHost) {
    return (
      <Screen>
        <TopBar title="사다리타기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />
        <p className="center muted" style={{ marginTop: 40 }}>
          호스트가 사다리를 준비하고 있어요…
        </p>
      </Screen>
    );
  }

  // ── 호스트 편집 화면 ──
  const count = tops.length;
  return (
    <Screen
      footer={
        <div className="grid-2">
          <Button variant="secondary" onClick={onLeave}>돌아가기</Button>
          <Button onClick={() => onBuild(tops, bottoms)}>사다리 시작</Button>
        </div>
      }
    >
      <TopBar title="사다리타기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />
      <p className="subtitle" style={{ marginTop: -8 }}>이름과 당첨 항목을 적어주세요.</p>

      <div className="lg-count">
        <span className="muted">칸 개수</span>
        <div className="lg-stepper">
          <button type="button" onClick={() => setCount(count - 1)} disabled={count <= MIN} aria-label="칸 줄이기">−</button>
          <b>{count}</b>
          <button type="button" onClick={() => setCount(count + 1)} disabled={count >= MAX} aria-label="칸 늘리기">＋</button>
        </div>
      </div>

      <div className="lg-scroll">
        <div className="lg-board" style={{ ['--cols' as string]: count }}>
          <div className="lg-cells lg-tops">
            {tops.map((v, i) => (
              <input
                key={i}
                className="lg-input"
                value={v}
                placeholder="이름"
                maxLength={12}
                onChange={(e) =>
                  setTops((p) => p.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
            ))}
          </div>

          <div className="lg-canvas lg-canvas--edit">
            {tops.map((_, i) => (
              <span key={i} className="lg-preline" />
            ))}
          </div>

          <div className="lg-cells lg-bottoms">
            {bottoms.map((v, i) => (
              <input
                key={i}
                className="lg-input"
                value={v}
                placeholder="당첨 항목"
                maxLength={12}
                onChange={(e) =>
                  setBottoms((p) => p.map((x, j) => (j === i ? e.target.value : x)))
                }
              />
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

/** 진행 화면 — 서버 구조로 사다리를 그리고, 공개된 시작칸의 내려오는 경로를 애니메이션한다. */
function PlayBoard({
  roomId,
  isHost,
  ladder,
  topLabels,
  bottomLabels,
  revealed,
  onReveal,
  onResult,
  onLeave,
}: {
  roomId: string;
  isHost: boolean;
  ladder: LadderStructure;
  topLabels: string[];
  bottomLabels: string[];
  revealed: number[];
  onReveal: (topIndex: number) => void;
  onResult: () => void;
  onLeave: () => void;
}) {
  const cols = Array.from({ length: ladder.columns }, (_, i) => i);
  const revealedSet = new Set(revealed);
  const allRevealed = revealed.length >= ladder.columns;
  // 공개된 시작칸이 도착한 하단칸(하이라이트용).
  const landed = new Set(revealed.map((s) => ladder.mapping[s]));

  return (
    <Screen
      footer={
        isHost ? (
          <Button block onClick={onResult}>
            {allRevealed ? '결과 보기' : '결과 보기 (전체 공개)'}
          </Button>
        ) : undefined
      }
    >
      <TopBar title="사다리타기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />
      <p className="subtitle" style={{ marginTop: -8 }}>
        {isHost ? '위 시작점을 누르면 사다리를 타고 내려가요.' : '호스트가 시작점을 누르면 결과가 보여요.'}
      </p>

      <div className="lg-scroll">
        <div className="lg-board" style={{ ['--cols' as string]: ladder.columns }}>
          <div className="lg-cells lg-tops">
            {cols.map((c) => (
              <button
                key={c}
                type="button"
                className={`lg-top${revealedSet.has(c) ? ' is-on' : ''}`}
                style={revealedSet.has(c) ? { borderColor: COLORS[c % COLORS.length] } : undefined}
                disabled={!isHost || revealedSet.has(c)}
                onClick={() => onReveal(c)}
              >
                {topLabels[c] || '　'}
              </button>
            ))}
          </div>

          <LadderCanvas ladder={ladder} revealed={revealed} />

          <div className="lg-cells lg-bottoms">
            {cols.map((c) => (
              <div key={c} className={`lg-bottom${landed.has(c) ? ' is-on' : ''}`}>
                {bottomLabels[c] || '　'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}

/** 세로줄·가로줄(정적) + 공개된 시작칸의 내려오는 경로(그려지는 애니메이션). */
function LadderCanvas({ ladder, revealed }: { ladder: LadderStructure; revealed: number[] }) {
  const w = ladder.columns * COL;
  return (
    <svg
      className="lg-canvas"
      viewBox={`0 0 ${w} ${CANVAS_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="사다리"
    >
      {/* 세로줄 */}
      {Array.from({ length: ladder.columns }, (_, c) => (
        <line key={`v${c}`} className="lg-vline" x1={colX(c)} y1={0} x2={colX(c)} y2={CANVAS_H} />
      ))}
      {/* 가로줄 */}
      {ladder.rungs.map((g, i) => (
        <line
          key={`r${i}`}
          className="lg-rung"
          x1={colX(g.col)}
          y1={rungY(ladder, g.row)}
          x2={colX(g.col + 1)}
          y2={rungY(ladder, g.row)}
        />
      ))}
      {/* 공개된 시작칸 경로 — 마운트될 때 그려지는 애니메이션이 재생된다 */}
      {revealed.map((s) => (
        <Trace key={`t${s}`} d={toPathD(tracePath(ladder, s))} color={COLORS[s % COLORS.length]} />
      ))}
    </svg>
  );
}

/** 한 시작칸의 내려오는 경로. 마운트 시 draw 애니메이션(1회). */
function Trace({ d, color }: { d: string; color: string }) {
  const ref = useRef<SVGPathElement | null>(null);
  // pathLength=1 로 정규화해 dash 로 '그려지는' 효과. React가 revealed 추가 때 새로 마운트하므로 1회 재생.
  useEffect(() => {
    const el = ref.current;
    if (el) el.getBoundingClientRect(); // reflow 강제 → 애니메이션 확실히 시작
  }, []);
  return <path ref={ref} className="lg-trace" d={d} pathLength={1} style={{ stroke: color }} />;
}
