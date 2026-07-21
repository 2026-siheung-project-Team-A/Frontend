import { useState } from 'react';
import type { GameResult } from '../../../../shared/types/api';
import { Button } from '../../../../shared/ui';
import { shareResult } from '../../../../shared/lib/share';

/**
 * ⑬ 뽑기 결과 (룰렛·슬롯·제비·풍선 공용).
 * result.type으로 1개 당첨 / N개 당첨을 구분해 렌더.
 * 사다리(matching)·투표(tally)는 별도 결과 컴포넌트가 담당한다.
 * "모든 참가자 화면에 동시 표시"가 이 화면의 핵심(WS4).
 * '결과 저장'은 네이티브 공유/클립보드 복사로 자체 처리한다.
 */
export function DrawResult({
  result,
  isHost,
  onReplay,
}: {
  result: GameResult;
  isHost: boolean;
  onReplay?: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);

  // winner/winners 는 Item 객체(백엔드 계약). 화면엔 label 을 쓴다.
  const winnerLabels =
    result.type === 'roulette' || result.type === 'slot'
      ? [result.winner.label]
      : result.type === 'draw' || result.type === 'balloon'
        ? result.winners.map((w) => w.label)
        : [];

  const save = async () => {
    const text = `오늘은 ${winnerLabels.join(', ')}! 🎉 (Pick Me Up)`;
    const outcome = await shareResult(text);
    setToast(
      outcome === 'copied'
        ? '결과를 복사했어요'
        : outcome === 'shared'
          ? '공유했어요'
          : '저장하지 못했어요',
    );
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      <div className="topbar">
        <h1>결과</h1>
      </div>

      <div className="spacer" />
      <div className="result-card">
        <p className="section-label" style={{ color: 'var(--accent)' }}>
          당첨!
        </p>
        {winnerLabels.map((w) => (
          <p key={w} className="result-winner">
            {w}
          </p>
        ))}
        <p className="muted">오늘은 {winnerLabels.join(', ')}! 🎉</p>
      </div>
      <p className="center muted" style={{ fontSize: 13, marginTop: 16 }}>
        모든 참가자 화면에 동시 표시돼요
      </p>
      <div className="spacer" />

      <div className="grid-2">
        {isHost ? (
          <Button variant="secondary" onClick={onReplay}>
            다시 하기
          </Button>
        ) : (
          <span />
        )}
        <Button variant="secondary" onClick={save}>
          결과 저장
        </Button>
      </div>
    </>
  );
}
