import { useState } from 'react';
import type { VoteResult as VoteResultData } from '../../../../shared/types/api';
import { Button } from '../../../../shared/ui';
import { shareResult } from '../../../../shared/lib/share';

/**
 * ⑮ 투표 결과 — 득표순 정렬 막대 + 최다 득표(당첨).
 * 모든 참가자 화면에 동시 표시(WS4·WS7).
 */
export function VoteResult({
  result,
  isHost,
  onReplay,
  onHome,
}: {
  result: VoteResultData;
  isHost: boolean;
  onReplay?: () => void;
  onHome?: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);

  const total = result.tally.reduce((s, t) => s + t.count, 0);
  const ranked = [...result.tally].sort((a, b) => b.count - a.count);
  const max = ranked[0]?.count ?? 0;

  const save = async () => {
    const text = `투표 결과: ${result.winner.label} 당첨! (총 ${total}표 · Pick Me Up)`;
    const outcome = await shareResult(text);
    setToast(outcome === 'copied' ? '결과를 복사했어요' : outcome === 'shared' ? '공유했어요' : '저장하지 못했어요');
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <h1>투표 결과</h1>
      </div>
      <p className="muted">총 {total}표</p>

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
        <p className="result-winner" style={{ fontSize: 30 }}>{result.winner.label} 🎉</p>
      </div>

      <div className="spacer" />
      <div className="stack-sm" style={{ width: '100%' }}>
        <div className="grid-2">
          {isHost ? (
            <Button variant="secondary" onClick={onReplay}>다시 하기</Button>
          ) : (
            <Button variant="secondary" onClick={save}>결과 저장</Button>
          )}
          {isHost ? (
            <Button variant="secondary" onClick={save}>결과 저장</Button>
          ) : (
            <Button onClick={onHome}>홈으로</Button>
          )}
        </div>
        {isHost && <Button onClick={onHome}>홈으로</Button>}
      </div>
    </>
  );
}
