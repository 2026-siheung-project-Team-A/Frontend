import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { GameType } from '../../../shared/types/api';
import { Screen, Button, TopBar, GameIcon, CrownIcon } from '../../../shared/ui';
import { mascotFor } from '../../../shared/lib/mascot';

/** 로비에서 바로 고르는 6종 게임 (호스트: 인라인 전환 / 참가자: 현재 게임 표시) */
const GAMES: { type: GameType; label: string }[] = [
  { type: 'roulette', label: '룰렛' },
  { type: 'vote', label: '투표하기' },
  { type: 'draw', label: '제비뽑기' },
  { type: 'order', label: '순서 정하기' },
  { type: 'balloon', label: '풍선 터뜨리기' },
  { type: 'ladder', label: '사다리타기' },
];
const gameLabel = (gt: GameType | null | undefined) =>
  GAMES.find((g) => g.type === gt)?.label ?? null;

/**
 * 게임 대기방(옛날 온라인 게임 로비 스타일) — 호스트·참가자가 함께 쓰는 공용 로비.
 *
 *  방장 슬롯(👑) + 입장한 참가자 슬롯 + 빈 자리로 로스터를 채운다. 새로 입장하면 그 슬롯이
 *  '입장!' 하며 톡 튀어나온다(닉네임 key 라 새 슬롯만 애니메이션).
 *
 *  호스트: 하단에 [QR 보기](모달로 QR 표시) + [게임 시작 ▶]. 참가자: 시작 버튼 없이 대기.
 *
 * 참가자 목록은 백엔드 계약대로 닉네임 문자열 배열(participant:joined/left · room:state).
 */

/** 로비가 비어 보이지 않게 최소로 보여줄 슬롯 수(방장 포함). 그 이상은 참가자 수만큼 늘어난다. */
const MIN_SLOTS = 6;

export function GameLobby({
  roomId,
  title,
  joinUrl,
  participants,
  readyPlayers,
  onlineCount = 0,
  isHost,
  me,
  gameType,
  onSelectGame,
  onStart,
  onLeave,
  onDeleteRoom,
}: {
  roomId: string;
  title?: string; // 방 이름(호스트가 방 만들 때 입력). 있으면 상단 제목으로 보여준다.
  joinUrl?: string;
  participants: string[]; // 닉네임 목록
  readyPlayers?: string[]; // 게임 후 로비로 돌아온 참가자(호스트·복귀한 참가자 모두 전달). 없으면 전원 준비된 것으로 본다.
  onlineCount?: number; // 접속 소켓 수(입장 전 포함)
  isHost: boolean;
  me?: string | null; // 내 닉네임(참가자) — 내 슬롯에 '나' 표시
  gameType?: GameType | null; // 현재 선택된 게임 (참가자에게도 실시간 반영)
  onSelectGame?: (gt: GameType) => void; // 호스트: 로비에서 게임 종류 바꾸기
  onStart?: () => void; // 호스트: 게임 시작
  onLeave?: () => void; // 참가자: 나가기(확인 모달 → room:leave)
  onDeleteRoom?: () => void; // 호스트: 방 삭제(확인 모달 → room:close, 전원 퇴장)
}) {
  const [qrOpen, setQrOpen] = useState(false);
  // 뒤로가기·방나가기·방삭제 공통 확인 모달. 확인 시 호스트=방삭제, 참가자=방나가기.
  const [confirmLeave, setConfirmLeave] = useState(false);
  const confirmLeaveAction = () => {
    setConfirmLeave(false);
    if (isHost) onDeleteRoom?.();
    else onLeave?.();
  };
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!joinUrl) return;
    let alive = true;
    QRCode.toDataURL(joinUrl, { width: 480, margin: 1 })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [joinUrl]);

  const live = onlineCount || participants.length + (isHost ? 1 : 0);
  const emptySlots = Math.max(0, MIN_SLOTS - (participants.length + 1));

  // 다음 게임을 시작하려면 현재 참가자 전원이 로비로 돌아와 있어야 한다(전 게임에서 안 돌아온 사람은
  // 60초 뒤 자동 퇴장해 목록에서 빠진다). 아직 안 돌아온 참가자는 로비에 있는 호스트·참가자에게
  // 'WAITING' 으로 보인다. readyPlayers 가 없으면(초기 등) 전원 준비된 것으로 본다.
  const ready = readyPlayers ?? participants;
  const pending = participants.filter((p) => !ready.includes(p));

  return (
    <Screen
      footer={
        isHost ? (
          <div className="grid-2">
            <Button variant="secondary" onClick={() => setQrOpen(true)}>
              QR 보기
            </Button>
            <Button onClick={onStart} disabled={!gameType || pending.length > 0}>
              게임 시작 ▶
            </Button>
          </div>
        ) : (
          <Button variant="secondary" block onClick={() => setConfirmLeave(true)}>
            방 나가기
          </Button>
        )
      }
    >
      <TopBar
        title={title?.trim() ? title : '게임 대기방'}
        onBack={() => setConfirmLeave(true)}
        trailing={<span className="chip">#{roomId}</span>}
      />

      <div className="lobby-head">
        <span className="lobby-code">
          참여 코드 <b>{roomId}</b>
        </span>
        <span className="lobby-live">
          <i className="lobby-dot" aria-hidden="true" />
          {live}명 접속
        </span>
      </div>

      {/* 게임 종류 — 호스트는 인라인으로 바꾸고(game:select), 참가자는 현재 게임을 실시간으로 본다. */}
      {isHost ? (
        <div className="lobby-games">
          <p className="section-label" style={{ margin: '0 0 8px' }}>게임 고르기</p>
          <div className="lobby-game-grid">
            {GAMES.map((g) => (
              <button
                key={g.type}
                type="button"
                className={`lobby-game${gameType === g.type ? ' is-on' : ''}`}
                onClick={() => onSelectGame?.(g.type)}
              >
                <span className="lobby-game-emoji"><GameIcon type={g.type} size={26} /></span>
                <span className="lobby-game-label">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="lobby-current">
          {gameLabel(gameType) ? (
            <>
              <span className="muted">현재 게임</span>
              <b>{gameLabel(gameType)}</b>
            </>
          ) : (
            <span className="muted">호스트가 게임을 고르고 있어요…</span>
          )}
        </div>
      )}

      <div className="lobby-roster">
        {/* 방장 슬롯 */}
        <div className="lobby-slot is-host">
          <span className="lobby-ava" style={{ background: '#f4b740', color: '#fff' }}>
            <CrownIcon size={19} />
          </span>
          <span className="lobby-name">방장</span>
          <span className="lobby-badge host">HOST</span>
        </div>

        {/* 입장한 참가자 슬롯 (새 참가자는 pop 애니메이션) */}
        {participants.map((nick) => (
          <div key={nick} className="lobby-slot is-in">
            <span className="lobby-ava">
              {/* 닉네임 첫 글자 대신 닉네임 해시로 배정된 동물 마스코트(재렌더에도 동일). */}
              <img className="lobby-ava-img" src={mascotFor(nick)} alt="" aria-hidden="true" />
            </span>
            <span className="lobby-name">{nick}</span>
            {me && nick === me ? (
              <span className="lobby-badge me">나</span>
            ) : ready.includes(nick) ? (
              <span className="lobby-badge ready">READY</span>
            ) : (
              // 게임이 끝났는데 아직 방으로 안 돌아온 참가자(60초 자동강퇴 전) — 대기 상태로 표시.
              <span className="lobby-badge waiting">WAITING</span>
            )}
          </div>
        ))}

        {/* 빈 자리 */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className="lobby-slot is-empty">
            <span className="lobby-ava empty">＋</span>
            <span className="lobby-name muted">비어 있음</span>
          </div>
        ))}
      </div>

      <p className="center muted lobby-foot">
        {isHost
          ? pending.length > 0
            ? `${pending.length}명이 방으로 돌아오는 중이에요. 모두 돌아오면 새 게임을 시작할 수 있어요.`
            : !gameType
              ? '먼저 게임을 고르고, 준비되면 게임 시작을 눌러요'
              : participants.length === 0
                ? 'QR 보기로 친구를 초대하고, 다 모이면 게임을 시작하세요'
                : '사람들이 다 모이면 게임 시작을 눌러요'
          : '호스트가 곧 게임을 시작해요…'}
      </p>

      {isHost && onDeleteRoom && (
        <button
          type="button"
          className="link-danger"
          style={{ marginTop: 20, alignSelf: 'center' }}
          onClick={() => setConfirmLeave(true)}
        >
          방 삭제하기
        </button>
      )}

      {qrOpen && isHost && (
        <div
          className="modal-backdrop"
          onClick={() => setQrOpen(false)}
          role="presentation"
        >
          <div className="modal-card lobby-qr" onClick={(e) => e.stopPropagation()}>
            <h2 className="title center" style={{ marginTop: 0 }}>
              QR로 초대하기
            </h2>
            <p className="subtitle center" style={{ marginTop: -4 }}>
              참가자가 QR을 찍거나 코드로 입장해요
            </p>

            <div className="lobby-qr-box">
              {qr ? (
                <img src={qr} alt="참여 QR" width={220} height={220} style={{ display: 'block' }} />
              ) : (
                <span className="muted">QR 생성 중…</span>
              )}
            </div>

            <div className="lobby-qr-code">
              참여 코드 <b>{roomId}</b>
            </div>
            {joinUrl && <p className="lobby-qr-url">{joinUrl}</p>}

            <div className="modal-actions">
              <Button block onClick={() => setQrOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmLeave(false)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: 'center' }}
          >
            <p className="title center" style={{ fontSize: 20, marginTop: 0 }}>
              방에서 나가시겠습니까?
            </p>
            <p className="subtitle center">
              {isHost
                ? '방장이 나가면 방이 삭제되고 참가자 전원이 메인 화면으로 나가게 돼요.'
                : '방에서 나가면 다시 참여하려면 코드로 재입장해야 해요.'}
            </p>
            <div className="modal-actions">
              <div className="grid-2">
                <Button variant="secondary" onClick={() => setConfirmLeave(false)}>
                  취소
                </Button>
                <Button onClick={confirmLeaveAction}>
                  {isHost ? '방 삭제하고 나가기' : '나가기'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
