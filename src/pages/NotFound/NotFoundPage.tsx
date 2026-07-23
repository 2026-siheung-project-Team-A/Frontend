import { useNavigate } from 'react-router-dom';
import { ErrorView, GoHomeButton } from '../../shared/ui';
import { homePath } from '../../shared/lib/embed';

/**
 * 방 없음 / 만료 / 잘못된 주소.
 * 참가자가 만료된 QR 링크로 들어오는 경우가 대표 케이스라
 * 기본 문구를 ROOM_NOT_FOUND로 둔다.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <ErrorView code="ROOM_NOT_FOUND" action={<GoHomeButton onClick={() => navigate(homePath())} />} />
  );
}
