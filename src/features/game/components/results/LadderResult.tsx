import type { LadderResultPayload } from '../../../../shared/types/api';

/**
 * 사다리 결과 콘텐츠 — 시작칸(이름) → 도착칸(당첨항목) 매칭. ResultModal 안에 렌더된다.
 * 서버 ladder:result 의 pairs(topIndex 순서)를 그대로 보여준다.
 */
export function LadderResult({ result }: { result: LadderResultPayload }) {
  return (
    <>
      <p className="muted center">사다리 결과</p>

      <div className="stack-sm" style={{ marginTop: 16 }}>
        {result.pairs.map((p) => (
          <div key={p.topIndex} className="ladder-match">
            <span className="ladder-from">{p.topLabel || '　'}</span>
            <span className="ladder-arrow">→</span>
            <span className="ladder-to">{p.bottomLabel || '　'}</span>
          </div>
        ))}
      </div>
    </>
  );
}
