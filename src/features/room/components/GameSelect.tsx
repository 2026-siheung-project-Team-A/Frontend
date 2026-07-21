import type { GameType } from '../../../shared/types/api';
import { Screen, TopBar } from '../../../shared/ui';

/** ② 게임 방식 선택 — 6종 전부 활성. */
const GAMES: { type: GameType; label: string; emoji: string; ready: boolean }[] = [
  { type: 'roulette', label: '룰렛', emoji: '🎯', ready: true },
  { type: 'vote', label: '투표하기', emoji: '🗳️', ready: true },
  { type: 'draw', label: '제비뽑기', emoji: '🎋', ready: true },
  { type: 'order', label: '순서 정하기', emoji: '🔢', ready: true },
  { type: 'balloon', label: '풍선 터뜨리기', emoji: '🎈', ready: true },
  { type: 'ladder', label: '사다리타기', emoji: '🪜', ready: true },
];

/**
 * 게임 방식 선택. 고르면 onSelect(gameType) → 호스트가 game:select emit.
 * 아직 UI 미구현 게임은 disabled + "준비중" 뱃지.
 */
export function GameSelect({
  onSelect,
  onBack,
}: {
  onSelect: (gameType: GameType) => void;
  onBack?: () => void;
}) {
  return (
    <Screen>
      <TopBar title="어떻게 정할까요?" onBack={onBack} />
      <div className="game-grid">
        {GAMES.map((g) => (
          <button
            key={g.type}
            className="game-card"
            disabled={!g.ready}
            onClick={() => onSelect(g.type)}
          >
            <span className="game-emoji">{g.emoji}</span>
            <span className="game-label">{g.label}</span>
            {!g.ready && <span className="game-badge">준비중</span>}
          </button>
        ))}
      </div>
    </Screen>
  );
}
