import { useEffect, useRef, useState } from 'react';
import type { DrawState } from '../../../shared/types/api';
import { Screen, Button, TopBar } from '../../../shared/ui';

/** 라운드 시작 후 이 시간(초)이 지나면 안 뽑힌 제비를 자동으로 '미선택'으로 공개한다(백엔드 DRAW.AUTO_RESOLVE_SECONDS 와 동일). */
const AUTO_SECONDS = 60;

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
const MAX = 12;

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
    <svg className="jb-svg" viewBox="0 0 72 92" aria-hidden="true">
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
  isHost,
  me,
  draw,
  round,
  onShuffle,
  onPick,
  onAutoResolve,
  onDraftChange,
  draftCount,
  draftBlanks,
  participantCount,
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
  onAutoResolve?: () => void; // host 전용 — 60초 카운트다운이 끝나면 안 뽑힌 제비를 자동 공개(draw:autoresolve)
  /** 호스트용 — 설정(제비 수·꽝 개수)이 바뀔 때마다 호출, 참가자에게 실시간 전송용(draw:draft). */
  onDraftChange?: (count: number, blanks: number) => void;
  /** 참가자용 — 호스트가 아직 섞기 전(draw=null) 동안의 실시간 설정 미리보기(draw:draft). */
  draftCount?: number;
  draftBlanks?: number;
  /** 호스트용 — 현재 참가자 수. 새 참가자가 들어오면 설정 미리보기를 다시 보내 늦게 들어와도 보이게 한다. */
  participantCount?: number;
  onReturn?: () => void; // '방으로 돌아가기' — 제비뽑기는 결과 모달이 없어 여기서 로비 복귀를 제공
  onLeave: () => void;
}) {
  // 스텝퍼 로컬 상태 — 진행 중 제비판이 있으면 그 값으로 시작(재접속 복원 대비).
  const [count, setCountRaw] = useState(() => draw?.count ?? 5);
  const [blanks, setBlanksRaw] = useState(() => draw?.blanks ?? 1);
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // 60초 카운트다운 — 라운드가 시작되면 60에서 시작해 1초씩 준다. 0이 되면(호스트만) 안 뽑힌 제비를 자동 공개.
  const [secondsLeft, setSecondsLeft] = useState(AUTO_SECONDS);
  const autoFiredRef = useRef(false);

  // 설정이 바뀔 때마다(호스트) 참가자에게 실시간 미리보기를 보낸다(draw:draft).
  const setCount = (n: number) => {
    const next = Math.max(MIN, Math.min(MAX, n));
    const nextBlanks = Math.max(1, Math.min(next - 1, blanks)); // 꽝은 1..count-1
    setCountRaw(next);
    setBlanksRaw(nextBlanks);
    if (isHost) onDraftChange?.(next, nextBlanks);
  };
  const setBlanks = (n: number) => {
    const nextBlanks = Math.max(1, Math.min(count - 1, n));
    setBlanksRaw(nextBlanks);
    if (isHost) onDraftChange?.(count, nextBlanks);
  };

  // 최초 설정 진입 시 한 번 — 참가자에게 시작 설정을 알려 미리보기 판을 바로 보여준다.
  const didInitDraft = useRef(false);
  useEffect(() => {
    if (isHost && !didInitDraft.current) {
      didInitDraft.current = true;
      onDraftChange?.(count, blanks);
    }
  }, [isHost, onDraftChange, count, blanks]);

  // 참가자가 새로 들어오면(늦은 입장 등) 현재 설정을 다시 보낸다 — 늦게 들어온 참가자도
  // 제비 수·꽝 개수를 바로 보게 한다(draft 는 저장되지 않는 relay 라 재전송이 필요하다).
  const latestSetup = useRef({ count, blanks });
  useEffect(() => {
    latestSetup.current = { count, blanks };
  }, [count, blanks]);
  const prevParticipantCount = useRef<number | null>(null);
  useEffect(() => {
    if (!isHost) return;
    const pc = participantCount ?? 0;
    if (prevParticipantCount.current !== null && pc > prevParticipantCount.current) {
      onDraftChange?.(latestSetup.current.count, latestSetup.current.blanks);
    }
    prevParticipantCount.current = pc;
  }, [isHost, participantCount, onDraftChange]);

  // 제비 수가 참가자 수보다 적으면 게임을 시작할 수 없다(모든 참가자가 1인 1제비를 뽑아야 한다).
  const pc = participantCount ?? 0;
  const tooFewSticks = isHost && count < pc;

  const shuffle = () => {
    if (tooFewSticks) return;
    setNote(null);
    onShuffle(count, blanks);
  };

  const picks = new Map((draw?.picks ?? []).map((p) => [p.index, p]));
  // 설정 미리보기 값 — 호스트는 자기 스텝퍼 값, 참가자는 호스트가 relay 한 draft 값(없으면 0).
  const setupCount = isHost ? count : (draftCount ?? 0);
  const setupBlanks = isHost ? blanks : (draftBlanks ?? 0);
  const lotCount = draw ? draw.count : setupCount; // 설정 땐 미리보기, 진행 땐 실제 제비판
  const remaining = draw ? draw.count - draw.picks.length : 0;
  const done = !!draw && remaining <= 0;
  // 참가자 1인당 뽑기 상한 — 항상 1(1인 1제비). 호스트(어드민)만 이 상한과 무관하게 여러 개를 뽑는다.
  const perPick = draw?.perPick ?? 1;
  const myPicks =
    !isHost && me ? (draw?.picks ?? []).filter((p) => p.by === me).length : 0;
  const iReachedCap = !isHost && !!me && myPicks >= perPick;

  // 뽑기가 진행 중(제비판이 있고 아직 다 안 뽑음)일 때만 카운트다운을 돈다.
  const counting = !!draw && !done;

  // 새 라운드(round 변경)마다 카운트다운을 60초로 리셋한다.
  useEffect(() => {
    autoFiredRef.current = false;
    setSecondsLeft(AUTO_SECONDS);
  }, [round]);

  // 진행 중일 때 1초씩 감소.
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [counting, round]);

  // 0초 도달 → 호스트가 안 뽑힌 제비를 '미선택'으로 자동 공개(한 라운드에 한 번). 참가자는 표시만 한다.
  useEffect(() => {
    if (secondsLeft > 0 || !counting) return;
    if (isHost && onAutoResolve && !autoFiredRef.current) {
      autoFiredRef.current = true;
      onAutoResolve();
    }
  }, [secondsLeft, counting, isHost, onAutoResolve]);

  const pick = async (index: number) => {
    if (picking || picks.has(index) || iReachedCap) return;
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
    ? isHost
      ? tooFewSticks
        ? `제비 수를 참가자 수(${pc}명) 이상으로 설정해 주세요`
        : '버튼을 눌러 제비를 섞어 주세요'
      : '호스트가 제비를 준비하고 있어요…'
    : done
      ? '모든 제비를 뽑았어요'
      : iReachedCap
        ? '제비를 뽑았어요! 다른 사람들을 기다려 주세요'
        : '제비를 골라 뽑아 주세요 (한 개만 선택 가능)';

  // ── 스텝퍼 바 (호스트만 조작, 스크린샷 상단) ──
  const controls = isHost && (
    <div className="jb-controls">
      <Stepper
        label="제비 수"
        value={count}
        unit="개"
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
        <Button onClick={shuffle} disabled={!done || tooFewSticks}>
          <span className="jb-btn-ico" aria-hidden="true">↻</span>
          다시 섞기
        </Button>
      </div>
    ) : (
      <Button block onClick={shuffle} disabled={tooFewSticks}>
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
      <TopBar title="제비뽑기" onBack={isHost ? onLeave : undefined} />

      {controls}

      <div className="jb-panel">
        <div className="jb-headline-row">
          <p className="jb-headline">{headline}</p>
          {counting && (
            <span
              className={`jb-countdown${secondsLeft <= 10 ? ' is-urgent' : ''}`}
              aria-label={`${secondsLeft}초 남음`}
            >
              ⏱ {secondsLeft}초
            </span>
          )}
        </div>

        {/* 참가자: '호스트가 제비를 준비하고 있어요…' 바로 밑에 제비 수·꽝 개수를 보여준다. */}
        {!draw && !isHost && lotCount > 0 && (
          <p className="jb-setup-counts">
            제비 <b>{setupCount}</b>개 · 꽝 <b>{setupBlanks}</b>개
          </p>
        )}

        {!draw && !isHost && lotCount === 0 ? (
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
              const canPick = !!draw && !iReachedCap; // 설정 단계 미리보기·상한에 도달한 참가자는 못 뽑음
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
