import type { ReactNode } from 'react';
import { Button } from '../../../../shared/ui';

/**
 * 결과 전용 화면 대신, 방금까지 보던 게임 화면 위에 뜨는 모달.
 * 게임 비주얼(룰렛 휠·투표 목록·즉시게임 스테이지)은 뒤에 그대로 남아있고,
 * 이 모달이 결과 내용(children)과 공통 액션(다시하기/홈으로)을 덮어 보여준다.
 * 6개 게임 전부 이 셸을 공유하고, 게임별 결과 내용만 children으로 갈아끼운다.
 */
export function ResultModal({
  isHost,
  onReplay,
  onHome,
  children,
}: {
  isHost: boolean;
  onReplay?: () => void;
  onHome?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {children}
        <div className="modal-actions">
          {isHost ? (
            <div className="grid-2">
              <Button variant="secondary" onClick={onReplay}>
                같은 항목으로 다시하기
              </Button>
              <Button onClick={onHome}>홈으로</Button>
            </div>
          ) : (
            <Button onClick={onHome}>홈으로</Button>
          )}
        </div>
      </div>
    </div>
  );
}
