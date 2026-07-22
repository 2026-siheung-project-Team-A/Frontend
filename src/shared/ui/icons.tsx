import type { ReactNode } from 'react';
import type { GameType } from '../types/api';

/**
 * Pick Me Up 커스텀 아이콘 세트 — 기존 이모지(🎯🗳️🎋🔢🎈🪜·🔊·👑)를 대체한다.
 * 깔끔한 플랫·둥근·듀오톤 스타일로 앱의 밝은 카드 UI와 팔레트에 맞춘다.
 * 모든 아이콘은 24x24 그리드. size(px)로 크기를 조절한다(기본 24).
 * 게임 아이콘은 자체 색을 가지며, 라인 아이콘(sound)은 currentColor 를 따른다.
 */

type IconProps = {
  size?: number;
  className?: string;
  title?: string;
};

function Svg({
  size = 24,
  className,
  title,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** 룰렛 — 색색 세그먼트 원판 + 위쪽 포인터 + 중심 허브. */
export function RouletteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 12 L12 3 A9 9 0 0 1 21 12 Z" fill="#e5644d" />
      <path d="M12 12 L21 12 A9 9 0 0 1 12 21 Z" fill="#f5b13f" />
      <path d="M12 12 L12 21 A9 9 0 0 1 3 12 Z" fill="#4aa06a" />
      <path d="M12 12 L3 12 A9 9 0 0 1 12 3 Z" fill="#4a90e2" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="#2a2e3a" strokeOpacity="0.12" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="#fff" stroke="#2a2e3a" strokeOpacity="0.15" strokeWidth="1" />
      <path d="M12 6.2 L9.6 1.8 L14.4 1.8 Z" fill="#2f3446" />
    </Svg>
  );
}

/** 투표하기 — 투표함 + 체크된 투표용지가 투입구로 들어가는 모습. */
export function VoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="2.5" width="10" height="11" rx="1.8" fill="#fff" stroke="#c9d3e0" strokeWidth="1.3" />
      <path d="M9.6 7.4 l1.9 1.9 L15 5.4" stroke="#3aa76d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 12.5 h17 a1.5 1.5 0 0 1 1.5 1.5 v5.5 a1.5 1.5 0 0 1 -1.5 1.5 h-17 a1.5 1.5 0 0 1 -1.5 -1.5 v-5.5 a1.5 1.5 0 0 1 1.5 -1.5 Z" fill="#5b8fd6" />
      <rect x="8.5" y="12.2" width="7" height="2.6" rx="1.3" fill="#3a6bb0" />
    </Svg>
  );
}

/** 제비뽑기 — 접힌 제비 두 장, 앞의 한 장이 뽑혀 살짝 들려 있다. */
export function DrawIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <g transform="rotate(-11 12 13)">
        <rect x="6.5" y="8" width="8" height="12.5" rx="1.6" fill="#f0b64a" />
        <path d="M6.5 8 h8 v3 l-4 2 l-4 -2 Z" fill="#000" fillOpacity="0.08" />
      </g>
      <g transform="rotate(12 12 11)">
        <rect x="10" y="3.5" width="8" height="13" rx="1.6" fill="#e5644d" />
        <path d="M10 3.5 h8 v3 l-4 2 l-4 -2 Z" fill="#fff" fillOpacity="0.18" />
        <path d="M13.8 9.5 v3.5" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </Svg>
  );
}

/** 순서 정하기 — 1·2·3 시상대(가운데가 제일 높은 순위) + 1위 메달. */
export function OrderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="13" width="6" height="8" rx="1.4" fill="#c3c9d4" />
      <rect x="15.5" y="15.5" width="6" height="5.5" rx="1.4" fill="#dca06a" />
      <rect x="9" y="8.5" width="6" height="12.5" rx="1.4" fill="#f5c451" />
      <circle cx="12" cy="5" r="2.6" fill="#f5c451" stroke="#fff" strokeWidth="1.2" />
      <path d="M5.5 15.5 v3 M18.5 17.6 v1.6" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
}

/** 풍선 터뜨리기 — 매듭·실이 달린 풍선 + 하이라이트. */
export function BalloonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5 C8.4 2.5 5.8 5.2 5.8 9 C5.8 13 8.7 16 12 16.4 C15.3 16 18.2 13 18.2 9 C18.2 5.2 15.6 2.5 12 2.5 Z" fill="#e5644d" />
      <ellipse cx="9.6" cy="7.2" rx="1.6" ry="2.2" fill="#fff" fillOpacity="0.35" transform="rotate(-20 9.6 7.2)" />
      <path d="M12 16.2 l-1.4 1.6 h2.8 Z" fill="#c94f3b" />
      <path d="M12 17.6 c1.8 1.6 -1.8 2.8 0 4.4" stroke="#9aa1ad" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** 사다리타기 — 두 세로 기둥 + 가로줄, 한 줄은 강조색. */
export function LadderIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="5.6" y="2.5" width="2.4" height="19" rx="1.2" fill="#d99a41" />
      <rect x="16" y="2.5" width="2.4" height="19" rx="1.2" fill="#d99a41" />
      <rect x="5.6" y="6" width="12.8" height="2.1" rx="1" fill="#c07f2e" />
      <rect x="5.6" y="15.9" width="12.8" height="2.1" rx="1" fill="#c07f2e" />
      <rect x="5.6" y="10.95" width="12.8" height="2.1" rx="1" fill="#4aa06a" />
    </Svg>
  );
}

/** 방장 왕관 — currentColor(배경색에 맞춰 색을 넘겨 쓴다. 로비 금색 원 위에서는 흰색). */
export function CrownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.5 L6.7 12.8 L12 5.5 L17.3 12.8 L21 8.5 L19.4 18.5 A1 1 0 0 1 18.4 19.3 H5.6 A1 1 0 0 1 4.6 18.5 Z" fill="currentColor" />
      <path d="M6.2 16 H17.8" stroke="#000" strokeOpacity="0.12" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="3" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="21" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="5" r="1.7" fill="currentColor" />
    </Svg>
  );
}

/** 소리 켜짐 — 스피커 + 음파. currentColor. */
export function SoundOnIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9 H7 L11 5.5 V18.5 L7 15 H4 A1 1 0 0 1 3 14 V10 A1 1 0 0 1 4 9 Z" fill="currentColor" />
      <path d="M14.5 9 A4 4 0 0 1 14.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M16.8 6.5 A7 7 0 0 1 16.8 17.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** 소리 꺼짐 — 스피커 + X. currentColor. */
export function SoundOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9 H7 L11 5.5 V18.5 L7 15 H4 A1 1 0 0 1 3 14 V10 A1 1 0 0 1 4 9 Z" fill="currentColor" />
      <path d="M15 9.5 L20 14.5 M20 9.5 L15 14.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

/** 비밀방 자물쇠 — 둥근 금색 몸통 + 고리(shackle) + 열쇠구멍. 자체 색(듀오톤)이라 currentColor 아님. */
export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M7.7 10.6 V8.2 A4.3 4.3 0 0 1 16.3 8.2 V10.6"
        fill="none"
        stroke="#c88a2e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <rect x="4.6" y="10.3" width="14.8" height="10.4" rx="2.4" fill="#f5b13f" />
      <path d="M6.4 12.9 h11.2" stroke="#fff" strokeOpacity="0.28" strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="14.7" r="1.7" fill="#8a5713" />
      <path d="M11.25 15.1 h1.5 l-0.35 3 h-0.8 Z" fill="#8a5713" />
    </Svg>
  );
}

/** GameType → 게임 아이콘 매핑. */
export function GameIcon({
  type,
  size,
  className,
  title,
}: IconProps & { type: GameType }) {
  const p = { size, className, title };
  switch (type) {
    case 'roulette':
      return <RouletteIcon {...p} />;
    case 'vote':
      return <VoteIcon {...p} />;
    case 'draw':
      return <DrawIcon {...p} />;
    case 'order':
      return <OrderIcon {...p} />;
    case 'balloon':
      return <BalloonIcon {...p} />;
    case 'ladder':
      return <LadderIcon {...p} />;
    default:
      return <RouletteIcon {...p} />;
  }
}
