import { Button, TrashIcon } from '../../../shared/ui';

/**
 * 호스트(어드민)가 방을 삭제해 메인 화면으로 돌아온 참가자에게 뜨는 알림 모달.
 * 확인을 누르면 알림을 닫는다(이미 메인 화면에 있다). ResultModal 과 같은 셸을 써 톤을 맞춘다.
 */
export function RoomClosedModal({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ textAlign: 'center' }}>
        <div style={{ margin: '4px 0 8px' }}>
          <TrashIcon size={44} />
        </div>
        <p className="title center" style={{ fontSize: 20, marginTop: 0 }}>
          어드민이 방을 삭제했습니다
        </p>
        <p className="subtitle center">
          방장이 방을 닫아 메인 화면으로 돌아왔어요.
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
