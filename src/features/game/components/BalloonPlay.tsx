import { useEffect, useRef, useState } from 'react';
import type { BalloonState } from '../../../shared/types/api';
import { Screen, Button, TopBar, BalloonIcon } from '../../../shared/ui';

/**
 * 풍선 터뜨리기(러시안 룰렛식, 턴제) — 가운데 풍선 하나를 순서대로 펌프한다.
 * 설정 화면 없이, 참가자가 모이면(호스트 포함 2명 이상) 호스트 화면이 곧바로 게임을 시작한다.
 *
 *  대기(balloon=null): 참가자가 없으면 대기 안내. 1명 이상 들어오는 순간 호스트가 자동 시작(onStart).
 *  진행(balloon≠null): 호스트를 포함한 참가자들이 순서대로 자기 턴에 풍선을 펌프한다.
 *    한 턴에 최대 maxPerTurn(3)번 펌프할 수 있고(onPump), 1번 이상 펌프하면 '넘기기'(onPass)로
 *    다음 사람에게 넘긴다. 누적 펌프가 서버의 비밀 순번에 도달하면 펑! 그때 펌프한 사람이 걸림(caughtBy).
 *
 * 계약(백엔드 소유): balloon:start/started · balloon:pump/pumped · balloon:pass/passed.
 * 풍선 크기·펌프 수·턴·걸린 사람은 store(=서버 이벤트) 값을 그대로 받으므로 전원이 같은 상태를 본다.
 */

const MIN_PLAYERS = 2; // 게임 성립 최소 인원(호스트 포함) — 백엔드 BALLOON.MIN_PLAYERS 와 동일
const DEFAULT_CAPACITY = 12; // 풍선 크기(백엔드 BALLOON.DEFAULT_TOTAL 와 동일) — 설정 없이 이 값으로 바로 시작

type Ack = { ok: boolean; code?: string };

function startError(code?: string): string {
  return code === 'NEED_MORE_PLAYERS'
    ? `참가자가 ${MIN_PLAYERS - 1}명 이상이어야 시작할 수 있어요`
    : code === 'GAME_RUNNING'
      ? '이미 게임이 진행 중이에요'
      : '지금은 시작할 수 없어요';
}

function actionError(code?: string): string {
  return code === 'NOT_YOUR_TURN'
    ? '지금은 내 차례가 아니에요'
    : code === 'PUMP_LIMIT'
      ? '이번 턴엔 더 펌프할 수 없어요 — 넘기세요'
      : code === 'PUMP_FIRST'
        ? '한 번 이상 펌프한 뒤에 넘길 수 있어요'
        : '지금은 할 수 없어요';
}

export function BalloonPlay({
  roomId,
  isHost,
  me,
  balloon,
  round,
  playerCount,
  onStart,
  onPump,
  onPass,
  onReturn,
  onLeave,
}: {
  roomId: string;
  isHost: boolean;
  me?: string | null; // 내 이름 — 참가자는 닉네임, 호스트는 '호스트'. 내 턴 판정에 쓴다.
  balloon: BalloonState | null;
  round: number; // 시작 라운드 nonce — 값이 바뀌면 풍선이 다시 마운트된다
  playerCount: number; // 현재 참가자 수(호스트 제외) — 호스트 포함 2명이 되면 자동 시작
  onStart: (total: number) => Promise<Ack>;
  onPump: () => Promise<Ack>;
  onPass: () => Promise<Ack>;
  onReturn?: () => void; // '방으로 돌아가기' — 걸린 뒤 로비 복귀(결과 모달이 없어 여기서 제공)
  onLeave: () => void;
}) {
  const [busy, setBusy] = useState(false); // 시작·펌프·넘기기 요청 중복 방지
  const [note, setNote] = useState<string | null>(null);

  const caught = balloon?.caughtBy ?? null;
  const done = !!caught;
  const turn = balloon?.turn ?? null;
  const myTurn = !!me && me === turn && !done;
  const pumps = balloon?.pumps ?? 0;
  const capacity = balloon?.capacity ?? 0;
  const turnPumps = balloon?.turnPumps ?? 0;
  const maxPerTurn = balloon?.maxPerTurn ?? 3;
  // 풍선 부풀기 0..1 — 펌프가 쌓일수록 커진다(실제 터지는 순번은 비밀이라 여기 반영 안 됨).
  const fill = done ? 1 : capacity > 0 ? Math.min(1, pumps / capacity) : 0;
  const scale = done ? 1.5 : 0.7 + fill * 0.85;
  // 호스트도 참가하므로 호스트를 +1 로 세어, 참가자 1명만 있어도(호스트 포함 2명) 성립한다.
  const enoughPlayers = playerCount + 1 >= MIN_PLAYERS;

  const canPump = myTurn && !busy && turnPumps < maxPerTurn;
  const canPass = myTurn && !busy && turnPumps >= 1;

  // 호스트: 설정 페이지 없이, 참가자가 모이면(호스트 포함 2명) 곧바로 게임을 시작한다.
  // useCallback 으로 identity 를 고정한 onStart 라 매 렌더마다 중복 emit 되지 않는다.
  const startingRef = useRef(false);
  useEffect(() => {
    if (!isHost || balloon || !enoughPlayers || startingRef.current) return;
    startingRef.current = true;
    void onStart(DEFAULT_CAPACITY).then((ack) => {
      startingRef.current = false;
      // GAME_RUNNING(이미 시작됨)은 곧 balloon:started 로 화면이 바뀌므로 안내하지 않는다.
      if (ack && ack.ok === false && ack.code !== 'GAME_RUNNING') {
        setNote(startError(ack.code));
      }
    });
  }, [isHost, balloon, enoughPlayers, onStart]);

  const pump = async () => {
    if (!canPump) return;
    setBusy(true);
    setNote(null);
    const ack = await onPump();
    setBusy(false);
    if (ack && ack.ok === false) setNote(actionError(ack.code));
  };

  const pass = async () => {
    if (!canPass) return;
    setBusy(true);
    setNote(null);
    const ack = await onPass();
    setBusy(false);
    if (ack && ack.ok === false) setNote(actionError(ack.code));
  };

  const restart = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const ack = await onStart(DEFAULT_CAPACITY);
    setBusy(false);
    if (ack && ack.ok === false) setNote(startError(ack.code));
  };

  // ── 상단 안내 ──
  const headline = !balloon
    ? isHost
      ? enoughPlayers
        ? '게임을 시작하는 중…'
        : `참가자가 ${MIN_PLAYERS - 1}명 이상 모이면 바로 시작돼요`
      : '곧 게임이 시작돼요…'
    : done
      ? `💥 ${caught}님이 걸렸어요!`
      : myTurn
        ? `내 차례예요! 펌프하거나 넘기세요 (${turnPumps}/${maxPerTurn})`
        : `${turn ?? '?'}님 차례예요`;

  // ── 하단 버튼 ──
  // 진행 중 내 턴: [펌프 | 넘기기] 2개. 펌프는 최대 maxPerTurn 번, 넘기기는 1번 이상 펌프해야 활성.
  // 걸린 뒤: 호스트는 [방으로 돌아가기 | 다시 하기], 참가자는 [방으로 돌아가기].
  const footer = !balloon ? undefined : done ? (
    isHost ? (
      <div className="grid-2">
        <Button variant="secondary" onClick={onReturn}>방으로 돌아가기</Button>
        <Button onClick={restart} disabled={busy}>다시 하기</Button>
      </div>
    ) : (
      <Button block onClick={onReturn}>방으로 돌아가기</Button>
    )
  ) : myTurn ? (
    <div className="grid-2">
      <Button onClick={pump} disabled={!canPump}>
        💨 펌프! ({turnPumps}/{maxPerTurn})
      </Button>
      <Button variant="secondary" onClick={pass} disabled={!canPass}>
        다음 사람 ▶
      </Button>
    </div>
  ) : undefined;

  return (
    <Screen footer={footer}>
      <TopBar title="풍선 터뜨리기" onBack={onLeave} trailing={<span className="chip">#{roomId}</span>} />

      <div className="bp-panel">
        <p className="bp-headline">{headline}</p>

        {/* 턴 순서 표시(진행 중) — 호스트도 '호스트' 로 포함된다. */}
        {balloon && !done && (
          <div className="bp-turns">
            {balloon.turnOrder.map((nick) => (
              <span
                key={nick}
                className={`bp-turn-tag${nick === balloon.turn ? ' is-now' : ''}${nick === me ? ' is-me' : ''}`}
              >
                {nick}
                {nick === me ? ' (나)' : ''}
              </span>
            ))}
          </div>
        )}

        {!balloon ? (
          // 대기 — 설정 화면 대신 잔잔히 떠 있는 풍선 하나(참가자가 없으면 인원 안내).
          <div className="bp-wait-stage">
            <div className="bp-balloon-idle"><BalloonIcon size={96} /></div>
            {isHost && !enoughPlayers && (
              <p className="bp-wait">
                현재 {playerCount}명 — 참가자 {MIN_PLAYERS - 1}명부터 시작할 수 있어요
              </p>
            )}
          </div>
        ) : (
          <div className="bp-stage" key={round}>
            <button
              type="button"
              className={`bp-balloon-big${done ? ' is-burst' : ''}${myTurn ? ' is-mine' : ''}`}
              style={{ transform: `scale(${scale})` }}
              disabled={!canPump}
              onClick={pump}
              aria-label={myTurn ? '풍선 펌프' : '풍선'}
            >
              {done ? '💥' : <BalloonIcon size={96} />}
            </button>
          </div>
        )}

        {balloon && !done && (
          <p className="bp-status">
            펌프 <b>{pumps}</b> / {capacity} · 이번 턴 <b>{turnPumps}</b>/{maxPerTurn}
          </p>
        )}
        {note && <p className="bp-note">{note}</p>}
      </div>
    </Screen>
  );
}
