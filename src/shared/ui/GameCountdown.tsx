import { useEffect, useState } from 'react';
import { useRoomStore } from '../../features/room/store/roomStore';

/**
 * 게임 시작 3·2·1 카운트다운 오버레이 — 호스트가 '게임 시작 ▶'을 누르면 서버가 준 시각(countdownStartAt)
 * 까지 전원이 같은 숫자를 함께 본다(각자 로컬 시계로 계산해 동기화). 0이 되면 오버레이가 사라지고
 * 게임 화면이 드러난다. 전역에 한 번 마운트한다(App). index.css 를 안 건드리게 스타일은 CSS 클래스로.
 */
export function GameCountdown() {
  const startAt = useRoomStore((s) => s.countdownStartAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startAt) return;
    setNow(Date.now());
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      // 시작 시각에 도달하면 오버레이를 내린다(게임 화면 공개).
      if (t >= startAt) useRoomStore.getState().setCountdownStartAt(null);
    }, 100);
    return () => clearInterval(id);
  }, [startAt]);

  if (!startAt) return null;
  const secs = Math.ceil((startAt - now) / 1000);
  if (secs <= 0) return null;

  return (
    <div className="gc-overlay" role="status" aria-live="assertive">
      <p className="gc-label">곧 시작해요</p>
      {/* key 로 매 초 숫자를 리마운트해 팝 애니메이션을 다시 재생한다. */}
      <div className="gc-num" key={secs}>
        {secs}
      </div>
    </div>
  );
}
