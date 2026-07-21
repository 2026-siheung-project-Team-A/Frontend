import type { LadderResult as LadderResultData } from '../../../../shared/types/api';

/**
 * 사다리 결과 콘텐츠 — 항목별 매칭(from → to). ResultModal 안에 렌더된다.
 * 백엔드 사다리 엔진은 항목들을 무작위 재배치해 from→to 매핑을 만든다.
 */
export function LadderResult({ result }: { result: LadderResultData }) {
  return (
    <>
      <p className="muted center">항목별 매칭 결과</p>

      <div className="stack-sm" style={{ marginTop: 16 }}>
        {result.matching.map((m) => (
          <div key={m.from.id} className="ladder-match">
            <span className="ladder-from">{m.from.label}</span>
            <span className="ladder-arrow">→</span>
            <span className="ladder-to">{m.to.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}
