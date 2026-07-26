import { Button, TrashIcon } from '../../../shared/ui';

/**
 * 호스트(어드민)가 방을 삭제하거나 나를 강퇴해 메인 화면으로 돌아온 참가자에게 뜨는 알림 모달.
 * 확인을 누르면 알림을 닫는다(이미 메인 화면에 있다). ResultModal 과 같은 셸을 써 톤을 맞춘다.
 * title/subtitle 로 상황(방 삭제·강퇴)에 맞는 문구를 넣는다.
 */
export function RoomClosedModal({
  onConfirm,
  title = '어드민이 방을 삭제했습니다',
  subtitle = '방장이 방을 닫아 메인 화면으로 돌아왔어요.',
}: {
  onConfirm: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ textAlign: 'center' }}>
        <div style={{ margin: '4px 0 8px' }}>
          <TrashIcon size={44} />
        </div>
        <p className="title center" style={{ fontSize: 20, marginTop: 0 }}>
          {title}
        </p>
        <p className="subtitle center">{subtitle}</p>
        <div className="modal-actions">
          <Button block onClick={onConfirm}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
