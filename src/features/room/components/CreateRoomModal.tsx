import { useEffect, useRef, useState } from 'react';
import type { CreateRoomInput, GameType } from '../../../shared/types/api';
import { Button, GameIcon, LockIcon } from '../../../shared/ui';

/** 방 만들기 모달에서 고르는 6종 게임. */
const GAMES: { type: GameType; label: string }[] = [
  { type: 'roulette', label: '룰렛' },
  { type: 'vote', label: '투표하기' },
  { type: 'draw', label: '제비뽑기' },
  { type: 'order', label: '순서 정하기' },
  { type: 'balloon', label: '풍선 터뜨리기' },
  { type: 'ladder', label: '사다리타기' },
];

const PIN_MAX = 6;
const MAX_DAYS = 7; // 방 유효기간 상한(시작일 포함 최대 7일)

/** Date → 로컬 yyyy-mm-dd (date input 값). */
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
/** yyyy-mm-dd 에 일수를 더한 yyyy-mm-dd. */
function addYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return toYmd(new Date(y, m - 1, d + days));
}
/** 시작 yyyy-mm-dd → 그날 00:00 로컬 ISO. */
function startIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}
/** 종료 yyyy-mm-dd → 그날 23:59:59 로컬 ISO(그날 하루 종일 유효). */
function endIso(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

/**
 * 방 만들기 모달 — '방 만들기'를 누르면 게임 선택 페이지로 넘어가는 대신 여기서
 * (1) 게임 종류 (2) 방 이름 (3) 자유방/비밀방(+숫자 최대 6자리 비밀번호)을 고른 뒤 생성한다.
 *
 * 비밀방으로 만들면 참가자는 코드·QR로 입장할 때 이 비밀번호를 맞춰야 들어올 수 있다
 * (검증은 서버 room:join 에서 — 비밀번호는 해시로만 저장되고 응답에 절대 노출되지 않는다).
 */
export function CreateRoomModal({
  onClose,
  onCreate,
  isPending,
  error,
}: {
  onClose: () => void;
  onCreate: (input: CreateRoomInput) => void;
  isPending: boolean;
  error?: string | null;
}) {
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [title, setTitle] = useState('');
  const [secret, setSecret] = useState(false);
  const [pin, setPin] = useState('');
  // 방 유효기간 — 기본: 오늘부터 3일(오늘+2). 시작 전엔 참가자 입장이 막히고, 종료 후 방이 사라진다.
  const today = toYmd(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addYmd(today, 2));

  const pinValid = pin.length >= 1 && pin.length <= PIN_MAX;
  // 종료일은 시작일 이상, 시작일부터 최대 7일(오늘+6)까지.
  const maxEnd = addYmd(startDate, MAX_DAYS - 1);
  const datesValid =
    startDate >= today && endDate >= startDate && endDate <= maxEnd;
  const canCreate =
    !!gameType && (!secret || pinValid) && datesValid && !isPending;

  // isPending prop 은 다음 렌더에야 반영돼, 빠른 더블클릭/더블엔터가 onCreate 를 두 번 쏠 수 있다.
  // 동기 ref 가드로 한 번만 보낸다(요청이 끝나 isPending 이 false 로 돌아오면 다시 허용 — 실패 후 재시도).
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!isPending) submittingRef.current = false;
  }, [isPending]);

  // 시작일을 바꾸면 종료일을 유효 범위(시작일 ~ 시작일+6일)로 다시 맞춘다.
  const changeStart = (next: string) => {
    setStartDate(next);
    const nextMax = addYmd(next, MAX_DAYS - 1);
    setEndDate((cur) => (cur < next ? next : cur > nextMax ? nextMax : cur));
  };

  const submit = () => {
    if (!canCreate || !gameType || submittingRef.current) return;
    submittingRef.current = true;
    onCreate({
      gameType,
      title: title.trim() || undefined,
      isSecret: secret,
      password: secret ? pin : undefined,
      startAt: startIso(startDate),
      endAt: endIso(endDate),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card crm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="방 만들기"
      >
        <h2 className="title center" style={{ marginTop: 0, fontSize: 22 }}>
          방 만들기
        </h2>
        <p className="subtitle center" style={{ marginTop: -2 }}>
          게임과 방 설정을 고르고 시작해요
        </p>

        {/* 1) 게임 종류 */}
        <p className="section-label crm-label">게임 고르기</p>
        <div className="crm-games">
          {GAMES.map((g) => (
            <button
              key={g.type}
              type="button"
              className={`crm-game${gameType === g.type ? ' is-on' : ''}`}
              onClick={() => setGameType(g.type)}
              aria-pressed={gameType === g.type}
            >
              <GameIcon type={g.type} size={30} />
              <span className="crm-game-label">{g.label}</span>
            </button>
          ))}
        </div>

        {/* 2) 방 이름 */}
        <label className="section-label crm-label" htmlFor="crm-title">
          방 이름 <span className="muted">(선택)</span>
        </label>
        <input
          id="crm-title"
          className="input"
          placeholder="예) 점심 내기"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={50}
        />

        {/* 3) 방 유효기간 — 시작일부터 종료일까지 방이 살아있고, 종료 후 자동으로 사라진다(최대 7일). */}
        <p className="section-label crm-label">방 유효기간 <span className="muted">(최대 {MAX_DAYS}일)</span></p>
        <div className="grid-2">
          <label className="crm-date">
            <span className="muted crm-date-cap">시작일</span>
            <input
              type="date"
              className="input"
              value={startDate}
              min={today}
              onChange={(e) => changeStart(e.target.value)}
            />
          </label>
          <label className="crm-date">
            <span className="muted crm-date-cap">종료일</span>
            <input
              type="date"
              className="input"
              value={endDate}
              min={startDate}
              max={maxEnd}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>
        <p className="muted crm-hint">
          {datesValid
            ? '시작일부터 참가자가 입장할 수 있고, 종료일이 지나면 방이 자동으로 사라져요.'
            : `유효기간을 확인해 주세요 (시작일 이후, 최대 ${MAX_DAYS}일).`}
        </p>

        {/* 4) 자유방 / 비밀방 */}
        <p className="section-label crm-label">입장 방식</p>
        <div className="crm-seg" role="tablist" aria-label="입장 방식">
          <button
            type="button"
            role="tab"
            aria-selected={!secret}
            className={`crm-seg-btn${!secret ? ' is-on' : ''}`}
            onClick={() => setSecret(false)}
          >
            자유방
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={secret}
            className={`crm-seg-btn${secret ? ' is-on' : ''}`}
            onClick={() => setSecret(true)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <LockIcon size={15} /> 비밀방
            </span>
          </button>
        </div>

        {secret ? (
          <div className="crm-pin">
            <label className="section-label crm-label" htmlFor="crm-pin">
              비밀번호 <span className="muted">(숫자 최대 {PIN_MAX}자리)</span>
            </label>
            <input
              id="crm-pin"
              className="input crm-pin-input"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="숫자 비밀번호"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_MAX))
              }
              onKeyDown={(e) =>
                e.key === 'Enter' && !e.nativeEvent.isComposing && submit()
              }
            />
            <p className="muted crm-hint">
              참가자가 코드·QR로 입장할 때 이 비밀번호를 맞춰야 들어올 수 있어요.
            </p>
          </div>
        ) : (
          <p className="muted crm-hint">
            누구나 코드·QR로 바로 입장할 수 있어요.
          </p>
        )}

        {error && (
          <p className="center crm-error">{error}</p>
        )}

        <div className="modal-actions">
          <div className="grid-2">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              취소
            </Button>
            <Button onClick={submit} disabled={!canCreate}>
              {isPending ? '만드는 중…' : '방 만들기'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
