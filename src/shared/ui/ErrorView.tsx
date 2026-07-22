import type { ReactNode } from 'react';
import type { ErrorCode } from '../types/api';
import { Button } from './Button';

/** 에러 코드 → 사용자용 이모지·문구 (와이어프레임에 없던 예외 화면) */
const MESSAGES: Record<ErrorCode, { emoji: string; title: string; desc: string }> = {
  ROOM_NOT_FOUND: {
    emoji: '🔍',
    title: '방을 찾을 수 없어요',
    desc: '코드가 정확한지 확인해 주세요.',
  },
  ROOM_EXPIRED: {
    emoji: '⌛',
    title: '만료된 방이에요',
    desc: '방 유효기간이 지났어요. 새로 만들어 주세요.',
  },
  ROOM_FULL: {
    emoji: '🙅',
    title: '방이 가득 찼어요',
    desc: '참여 인원이 모두 찼어요.',
  },
  ROOM_NOT_STARTED: {
    emoji: '⏰',
    title: '아직 방이 열리지 않았어요',
    desc: '방 유효기간 시작 시각 이후에 다시 입장해 주세요.',
  },
  NOT_HOST: {
    emoji: '🔒',
    title: '호스트만 할 수 있어요',
    desc: '이 동작은 방을 만든 사람만 가능해요.',
  },
  NICKNAME_TAKEN: {
    emoji: '🙋',
    title: '이미 쓰는 닉네임이에요',
    desc: '다른 닉네임으로 다시 시도해 주세요.',
  },
  NEED_MORE_ITEMS: {
    emoji: '📝',
    title: '항목이 더 필요해요',
    desc: '항목을 2개 이상 넣어 주세요.',
  },
  GAME_RUNNING: {
    emoji: '⏳',
    title: '게임이 진행 중이에요',
    desc: '지금은 할 수 없어요. 잠시 후 다시 시도해 주세요.',
  },
  ALREADY_PICKED: {
    emoji: '🎫',
    title: '이미 제비를 뽑았어요',
    desc: '한 사람당 하나만 뽑을 수 있어요.',
  },
  NEED_MORE_PLAYERS: {
    emoji: '👥',
    title: '참가자가 더 필요해요',
    desc: '풍선 게임은 호스트 포함 2명 이상이어야 시작할 수 있어요.',
  },
  NOT_YOUR_TURN: {
    emoji: '⏳',
    title: '아직 내 차례가 아니에요',
    desc: '내 차례가 되면 풍선을 펌프하거나 넘길 수 있어요.',
  },
  PUMP_LIMIT: {
    emoji: '💨',
    title: '이번 턴엔 다 펌프했어요',
    desc: '한 턴에 최대 3번까지 펌프할 수 있어요. 다음 사람에게 넘겨 주세요.',
  },
  PUMP_FIRST: {
    emoji: '💨',
    title: '먼저 펌프해 주세요',
    desc: '한 번 이상 펌프한 뒤에 다음 사람에게 넘길 수 있어요.',
  },
  ROOM_LOCKED: {
    emoji: '🚪',
    title: '게임이 진행 중이에요',
    desc: '지금은 입장할 수 없어요. 게임이 끝난 뒤 다시 입장해 주세요.',
  },
  PLAYERS_NOT_READY: {
    emoji: '⌛',
    title: '아직 다 안 돌아왔어요',
    desc: '이전 게임 참가자가 모두 방으로 돌아오면 새 게임을 시작할 수 있어요.',
  },
  WRONG_PASSWORD: {
    emoji: '🔒',
    title: '비밀번호가 맞지 않아요',
    desc: '이 방은 비밀방이에요. 호스트에게 받은 비밀번호를 다시 확인해 주세요.',
  },
  VOTE_NOT_OPEN: {
    emoji: '🗳️',
    title: '아직 투표할 수 없어요',
    desc: '호스트가 투표를 시작하면 투표할 수 있어요.',
  },
  VOTE_NO_VOTES: {
    emoji: '🗳️',
    title: '아직 표가 없어요',
    desc: '한 명 이상 투표하면 마감할 수 있어요.',
  },
  VALIDATION_ERROR: {
    emoji: '⚠️',
    title: '입력을 확인해 주세요',
    desc: '값이 올바르지 않아요.',
  },
};

/**
 * 전체 화면 에러 뷰.
 * `code`를 주면 표준 문구를 쓰고, title/desc로 개별 덮어쓸 수 있다.
 */
export function ErrorView({
  code,
  title,
  desc,
  action,
}: {
  code?: ErrorCode;
  title?: string;
  desc?: string;
  action?: ReactNode;
}) {
  const preset = code ? MESSAGES[code] : undefined;
  return (
    <div className="state-screen">
      <div className="state-emoji">{preset?.emoji ?? '😵'}</div>
      <h2 className="title">{title ?? preset?.title ?? '문제가 생겼어요'}</h2>
      <p className="muted">{desc ?? preset?.desc ?? '잠시 후 다시 시도해 주세요.'}</p>
      {action && <div style={{ marginTop: 8, width: '100%', maxWidth: 240 }}>{action}</div>}
    </div>
  );
}

/** 홈으로 돌아가는 기본 액션 버튼 */
export function GoHomeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      홈으로
    </Button>
  );
}
