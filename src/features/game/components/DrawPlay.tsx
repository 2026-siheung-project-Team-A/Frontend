import { useState } from 'react';
import type { DrawState } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';

/**
 * 제비뽑기(인터랙티브) — 한 화면에서 설정 → 섞기 → 뽑기까지.
 *
 *  설정(draw=null): 호스트가 인원수(=제비 수)·꽝 개수를 정하고 '제비 섞기' → onShuffle.
 *    참가자는 "호스트가 제비를 준비하고 있어요" 대기.
 *  진행(draw≠null): 접힌 제비들이 놓인다. 호스트·참가자 누구나 제비를 눌러 뽑는다(onPick).
 *    먼저 뽑힌 제비는 잠겨(서버 HSETNX) 아무도 다시 못 뽑고, 뽑는 순간 꽝/안전이 공개된다.
 *
 * 계약(백엔드 소유): draw:shuffle/shuffled · draw:pick/picked. 제비판·뽑힌 제비는
 * store(=서버 이벤트) 값을 그대로 받으므로 전원이 같은 제비판을 본다.
 */

const MIN = 2;
const MAX = 10;

/** 제비 색(칸 index 로 고정) — face=앞면, edge=접힘 그림자 */
const LOTS = [
  { face: '#e2726e', edge: '#c65a56' },
  { face: '#f0c04a', edge: '#d6a636' },
  { face: '#6aa9e0', edge: '#5090c9' },
  { face: '#e6e8ec', edge: '#c4c7cf' },
  { face: '#93c563', edge: '#79ac4c' },
  { face: '#c58bd6', edge: '#ab72bd' },
  { face: '#7ad0c0', edge: '#5bb6a5' },
  { face: '#f19bb6', edge: '#d97f9c' },
  { face: '#8f97e0', edge: '#727bcb' },
  { face: '#d8b45c', edge: '#bd9a44' },
];

/** 접힌 제비 한 장(SVG). 색은 칸 index 로 고정. */
function Jebi({ index }: { index: number }) {
  const { face, edge } = LOTS[index % LOTS.length];
  return (
    <svg className="jebi-svg" viewBox="0 0 72 92" aria-hidden="true">
      <g transform="rotate(9 36 46)">
        {/* 아래로 접힌 꼬리 */}
        <path
          d="M46 50 L66 70 a3 3 0 0 1 0 4 l-7 7 a3 3 0 0 1 -4 0 L35 62 Z"
          fill={edge}
        />
        {/* 본체(접힌 사각형) */}
        <rect x="12" y="14" width="48" height="48" rx="6" fill={face} stroke={edge} strokeWidth="1" />
        {/* X 접힘선 + 위쪽 하이라이트 */}
        <path d="M12 14 L60 62 M60 14 L12 62 M12 14 L60 14" stroke="rgba(255,255,255,.5)" strokeWidth="1.4" fill="none" />
      </g>
    </svg>
  );
}

type PickAck = { ok: boolean; code?: string };

export function DrawPlay({
  roomId,
  isHost,
  me,
  draw,
  round,
  onShuffle,
  onPick,
  onReturn,
  onLeave,
}: {
  roomId: string;
  isHost: boolean;
  me?: string | null; // 내 닉네임(참가자) — 1인 1제비 판정에 쓴다. host 는 제한 없음.
  draw: DrawState | null;
  round: number; // 섞기 라운드 nonce — 값이 바뀌면 제비 그리드가 다시 마운트되며 섞기 애니메이션 재생
  onShuffle: (count: number, blanks: number) => void;
  onPick: (index: number) => Promise<PickAck>;
  onReturn?: () => void; // '방으로 돌아가기' — 제비뽑기는 결과 모달이 없어 여기서 로비 복귀를 제공
  onLeave: () => void;
}) {
  // 스텝퍼 로컬 상태 — 진행 중 제비판이 있으면 그 값으로 시작(재접속 복원 대비).
  const [count, setCountRaw] = useState(() => draw?.count ?? 5);
  const [blanks, setBlanksRaw] = useState(() => draw?.blanks ?? 1);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const setCount = (n: number) => {
    const next = Math.max(MIN, Math.min(MAX, n));
    setCountRaw(next);
    setBlanksRaw((b) => Math.max(1, Math.min(next - 1, b))); // 꽝은 1..count-1
  };
  const setBlanks = (n: number) => setBlanksRaw(Math.max(1, Math.min(count - 1, n)));

  const shuffle = () => {
    setNote(null);
    onShuffle(count, blanks);
  };

  const picks = new Map((draw?.picks ?? []).map((p) => [p.index, p]));
  const lotCount = draw ? draw.count : count; // 설정 땐 스텝퍼 미리보기, 진행 땐 실제 제비판
  const remaining = draw ? draw.count - draw.picks.length : 0;
  const done = !!draw && remaining <= 0;
  // 참가자는 1인 1제비 — 이미 내 닉네임으로 뽑은 제비가 있으면 더 못 뽑는다(host 는 제한 없음).
  const iPicked =
    !isHost && !!me && (draw?.picks ?? []).some((p) => p.by === me);

  const pick = async (index: number) => {
    if (picking || picks.has(index) || iPicked) return;
    setPicking(true);
    setNote(null);
    const ack = await onPick(index);
    setPicking(false);
    if (ack && ack.ok === false) {
      setNote(
        ack.code === 'ALREADY_PICKED'
          ? '한 사람당 하나만 뽑을 수 있어요'
          : ack.code === 'GAME_RUNNING'
            ? '앗, 방금 다른 사람이 먼저 뽑았어요'
            : '뽑기에 실패했어요',
      );
    }
  };

  // ── 상단 안내 문구 ──
  const headline = !draw
    ? '버튼을 눌러 제비를 섞어 주세요'
    : done
      ? '모든 제비를 뽑았어요'
      : iPicked
        ? '제비를 뽑았어요! 모두 뽑을 때까지 기다려 주세요'
        : isHost
          ? '제비를 골라 뽑아 주세요 (여러 개 가능)'
          : '제비를 하나 골라 뽑아 주세요';

  // ── 스텝퍼 바 (호스트만 조작, 스크린샷 상단) ──
  const controls = isHost && (
    <div className="jb-controls">
      <Stepper
        label="인원수"
        value={count}
        unit="명"
        onDec={() => setCount(count - 1)}
        onInc={() => setCount(count + 1)}
        decDisabled={count <= MIN}
        incDisabled={count >= MAX}
      />
      <span className="jb-div" aria-hidden="true" />
      <Stepper
        label="꽝 개수"
        value={blanks}
        unit="개"
        onDec={() => setBlanks(blanks - 1)}
        onInc={() => setBlanks(blanks + 1)}
        decDisabled={blanks <= 1}
        incDisabled={blanks >= count - 1}
      />
    </div>
  );

  // ── 하단 버튼 ──
  // 제비뽑기는 결과 모달이 없으므로, 라운드가 시작된 뒤(draw≠null)엔 '방으로 돌아가기'로
  // 로비에 돌아갈 수 있게 한다. 호스트는 [방으로 돌아가기 | 다시 섞기], 참가자는 [방으로 돌아가기].
  //  - 다시 섞기(host): 제비를 다 뽑아야(done) 활성화 — 진행 중 리셋 방지.
  //  - 방으로 돌아가기(참가자): 제비를 다 뽑아야(done) 활성화.
  const footer = isHost ? (
    draw ? (
      <div className="grid-2">
        <Button variant="secondary" onClick={onReturn}>방으로 돌아가기</Button>
        <Button onClick={shuffle} disabled={!done}>
          <span className="jb-btn-ico" aria-hidden="true">↻</span>
          다시 섞기
        </Button>
      </div>
    ) : (
      <Button block onClick={shuffle}>
        <span className="jb-btn-ico" aria-hidden="true">↻</span>
        제비 섞기
      </Button>
    )
  ) : draw ? (
    <Button block onClick={onReturn} disabled={!done}>
      방으로 돌아가기
    </Button>
  ) : undefined;

  return (
    <Screen footer={footer}>
      <TopBar title="제비뽑기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />

      {controls}

      <div className="jb-panel">
        <p className="jb-headline">{headline}</p>

        {!draw && !isHost ? (
          <p className="jb-wait">호스트가 제비를 준비하고 있어요…</p>
        ) : (
          <div className="jb-row" key={round}>
            {Array.from({ length: lotCount }, (_, i) => {
              const picked = picks.get(i);
              if (picked) {
                return (
                  <div
                    key={i}
                    className={`jb-lot jb-card ${picked.blank ? 'is-blank' : 'is-safe'}`}
                  >
                    <span className="jb-face">{picked.blank ? '꽝' : '안전'}</span>
                    <span className="jb-by">{picked.by}</span>
                  </div>
                );
              }
              const canPick = !!draw && !iPicked; // 설정 단계 미리보기·이미 뽑은 참가자는 못 뽑음
              return (
                <button
                  key={i}
                  type="button"
                  className="jb-lot jb-fold"
                  style={{ animationDelay: `${i * 60}ms` }}
                  disabled={!canPick || picking}
                  onClick={() => pick(i)}
                >
                  <Jebi index={i} />
                </button>
              );
            })}
          </div>
        )}

        {draw && (
          <p className="jb-status">
            남은 제비 <b>{remaining}</b> · 꽝 <b>{draw.blanks}</b>
          </p>
        )}
        {note && <p className="jb-note">{note}</p>}
      </div>
    </Screen>
  );
}

/** 스텝퍼 — label [＋] value·unit [－] (스크린샷 순서: +가 왼쪽, −가 오른쪽) */
function Stepper({
  label,
  value,
  unit,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  value: number;
  unit: string;
  onDec: () => void;
  onInc: () => void;
  decDisabled: boolean;
  incDisabled: boolean;
}) {
  return (
    <div className="jb-step">
      <span className="jb-step-label">{label}</span>
      <button type="button" onClick={onInc} disabled={incDisabled} aria-label={`${label} 늘리기`}>＋</button>
      <b className="jb-step-val">
        {value}
        {unit}
      </b>
      <button type="button" onClick={onDec} disabled={decDisabled} aria-label={`${label} 줄이기`}>－</button>
    </div>
  );
}
