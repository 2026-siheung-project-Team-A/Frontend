/**
 * 게임별 UI가 들어갈 자리.
 * TODO: gameType에 따라 룰렛/제비/슬롯/풍선/사다리/투표 컴포넌트로 분기.
 *   - Roulette.tsx, Draw.tsx, Slot.tsx, Balloon.tsx, Ladder.tsx, Vote.tsx
 */
export function GamePlaceholder({ gameType }: { gameType: string }) {
  return <div>게임 화면: {gameType} (TODO)</div>;
}
