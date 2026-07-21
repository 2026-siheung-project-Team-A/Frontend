import type { GameResult } from '../../../../shared/types/api';

/** 1·2·3등은 메달, 그 아래는 숫자로 표시 */
const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * 순서 정하기 결과 — 항목을 1등부터 순서대로 보여준다(위→아래로 하나씩 공개되는 애니메이션).
 * ResultModal 안에 렌더된다. order[0] 이 1등.
 */
export function OrderResult({ result }: { result: GameResult }) {
  if (result.type !== 'order') return null;
  return (
    <div className="result-card">
      <p className="section-label" style={{ color: 'var(--accent)' }}>
        순서가 정해졌어요!
      </p>
      <ol className="order-result-list">
        {result.order.map((it, i) => (
          <li
            key={it.id}
            className="order-result-row"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <span className="order-rank">{MEDAL[i] ?? i + 1}</span>
            <span className="order-name">{it.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
