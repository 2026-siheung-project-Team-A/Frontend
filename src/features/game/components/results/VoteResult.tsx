import type { VoteResult as VoteResultData } from '../../../../shared/types/api';
import { ConfettiIcon } from '../../../../shared/ui';

/**
 * 투표 결과 콘텐츠 — 득표순 정렬 막대 + 최다 득표(당첨). ResultModal 안에 렌더된다.
 */
export function VoteResult({ result }: { result: VoteResultData }) {
  const total = result.tally.reduce((s, t) => s + t.count, 0);
  const ranked = [...result.tally].sort((a, b) => b.count - a.count);
  const max = ranked[0]?.count ?? 0;

  return (
    <>
      <p className="muted center">총 {total}표</p>

      <div className="stack-sm" style={{ marginTop: 16 }}>
        {ranked.map((t, i) => {
          const pct = max > 0 ? Math.round((t.count / max) * 100) : 0;
          const isWinner = t.item.id === result.winner.id;
          return (
            <div key={t.item.id} className={`vote-result-row${isWinner ? ' winner' : ''}`}>
              <span className="vote-rank">{i + 1}위</span>
              <span className="vote-label">{t.item.label}</span>
              <span className="vote-count">{t.count}표</span>
              <span className="vote-bar">
                <span className="vote-bar-fill" style={{ width: `${pct}%` }} />
              </span>
            </div>
          );
        })}
      </div>

      <div className="result-card" style={{ marginTop: 20, padding: 20 }}>
        <p className="section-label" style={{ color: 'var(--accent)' }}>당첨!</p>
        <p className="result-winner" style={{ fontSize: 30, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {result.winner.label} <ConfettiIcon size={26} />
        </p>
      </div>
    </>
  );
}
