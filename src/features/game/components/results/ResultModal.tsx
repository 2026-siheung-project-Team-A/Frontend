import type { ReactNode } from 'react';
import { Button } from '../../../../shared/ui';

/**
 * 결과 전용 화면 대신, 방금까지 보던 게임 화면 위에 뜨는 모달.
 * 게임 비주얼(룰렛 휠·투표 목록·즉시게임 스테이지)은 뒤에 그대로 남아있고,
 * 이 모달이 결과 내용(children)과 공통 액션을 덮어 보여준다.
 * 6개 게임 전부 이 셸을 공유하고, 게임별 결과 내용만 children으로 갈아끼운다.
 *
 * 결과가 나오면 host·참가자 모두 '방으로 돌아가기'(onReturn) 하나로 로비(대기방)로 돌아간다.
 *  - host: room:return 으로 라운드를 접고(데이터 삭제·대기 전환) 로비에서 게임을 다시 고른다.
 *  - 참가자: 각자 눌러 로비로 온다. 1분 안에 안 누르면 강퇴 안내가 대신 뜬다(부모가 처리).
 *    countdown 을 넘기면 버튼에 남은 초를 표시한다(0 이 되면 강퇴).
 */
export function ResultModal({
  onReturn,
  countdown,
  children,
}: {
  onReturn?: () => void;
  countdown?: number; // 남은 초(참가자 전용). 있으면 버튼에 '(초)' 표시.
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {children}
        <div className="modal-actions">
          <Button block onClick={onReturn}>
            방으로 돌아가기
            {typeof countdown === 'number' && (
              <span className="rm-count"> ({countdown})</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
