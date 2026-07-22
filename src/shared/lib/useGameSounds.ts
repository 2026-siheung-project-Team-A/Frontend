import { useEffect } from 'react';
import { useRoomStore } from '../../features/room/store/roomStore';
import { playSound } from './sound';

/**
 * 게임 효과음 배선 — roomStore 를 한 번만 구독해, 서버 이벤트로 바뀌는 상태 전이를 보고
 * 게임별로 어울리는 소리를 낸다. 게임 컴포넌트를 건드리지 않는 관찰자 방식이라,
 * 어떤 경로(호스트/참가자)든 같은 서버 이벤트 → 같은 store 변화 → 같은 소리를 듣는다.
 *
 * App 에서 한 번 마운트한다. 렌더를 유발하지 않도록 selector 대신 store.subscribe 로 직접 diff 한다.
 */
export function useGameSounds(): void {
  useEffect(() => {
    type Snap = ReturnType<typeof snap>;
    const snap = (s: ReturnType<typeof useRoomStore.getState>) => {
      const picks = s.draw?.picks ?? [];
      return {
        result: s.result,
        resultType: s.result?.type ?? null,
        balloonRound: s.balloonRound,
        pumps: s.balloon?.pumps ?? 0,
        capacity: s.balloon?.capacity ?? 12,
        caught: s.balloon?.caughtBy ?? null,
        drawRound: s.drawRound,
        picks: picks.length,
        lastBlank: picks.length > 0 ? picks[picks.length - 1].blank : false,
        ladderOn: !!s.ladder,
        revealed: s.ladderRevealed.length,
        ladderResult: s.ladderResult,
        tally: s.tally.reduce((a, t) => a + t.count, 0),
      };
    };

    let prev: Snap = snap(useRoomStore.getState());
    const timers: ReturnType<typeof setTimeout>[] = [];

    const unsub = useRoomStore.subscribe((state) => {
      const cur = snap(state);

      // 결과 도착 — 게임별로 다르게(룰렛은 회전 후 당첨, 순서는 공개 후 팡파레, 투표는 마감 당첨)
      if (cur.result && cur.result !== prev.result) {
        if (cur.resultType === 'roulette') {
          // 룰렛은 여기서 소리를 내지 않는다. 회전이 7초로 고정돼, 원판이 멈추는 순간(Roulette done)에
          // 당첨음을 내 소리·정지·'당첨!' 표시가 정확히 같은 시각에 일어난다.
        } else if (cur.resultType === 'order') {
          playSound('reveal');
          timers.push(setTimeout(() => playSound('win'), 1500));
        } else if (cur.resultType === 'vote') {
          playSound('win');
        }
      }

      // 풍선 러시안룰렛 — 시작(부풀기 시작)·펌프(점점 높은 음)·터짐(펑)
      if (cur.balloonRound > prev.balloonRound) playSound('start');
      if (cur.caught && !prev.caught) playSound('pop');
      else if (cur.pumps > prev.pumps) {
        playSound('pump', { level: cur.pumps / (cur.capacity || 12) });
      }

      // 제비뽑기 — 섞기·뽑기(안전/꽝 다른 소리)
      if (cur.drawRound > prev.drawRound) playSound('shuffle');
      if (cur.picks > prev.picks) playSound(cur.lastBlank ? 'pickBlank' : 'pickSafe');

      // 사다리타기 — 만들기(섞기)·시작칸 공개(내려가기)·결과(당첨)
      if (cur.ladderOn && !prev.ladderOn) playSound('shuffle');
      if (cur.revealed > prev.revealed) playSound('descend');
      if (cur.ladderResult && !prev.ladderResult) playSound('win');

      // 투표 — 한 표 들어올 때마다 부드러운 딩
      if (cur.tally > prev.tally) playSound('vote');

      prev = cur;
    });

    return () => {
      unsub();
      timers.forEach(clearTimeout);
    };
  }, []);
}
