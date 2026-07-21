import { Button } from '../../../shared/ui';

/**
 * 게임이 끝난 뒤 1분 넘게 방(로비)으로 돌아오지 않은 참가자에게 뜨는 강제 퇴장 알림.
 * 확인을 누르면 방에서 나가 메인 화면으로 돌아간다(onConfirm).
 * ResultModal 과 같은 셸(.modal-backdrop/.modal-card)을 써 톤을 맞춘다.
 */
export function KickModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 40, margin: '4px 0 8px' }}>⏰</p>
        <p className="title center" style={{ fontSize: 20, marginTop: 0 }}>
          방에서 나가게 됐어요
        </p>
        <p className="subtitle center">
          게임이 끝난 뒤 한동안 자리를 비우셔서 방에서 내보내드렸어요.
          다시 참여하려면 호스트에게 코드를 다시 받아 입장해 주세요.
        </p>
        <div className="modal-actions">
          <Button block onClick={onConfirm}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
