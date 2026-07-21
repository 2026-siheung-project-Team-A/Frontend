/**
 * 전체 화면 로딩 — 방 조회(GET /rooms/:id)·소켓 연결 대기 시.
 */
export function Loading({ message = '불러오는 중…' }: { message?: string }) {
  return (
    <div className="state-screen">
      <div className="spinner" />
      <p className="muted">{message}</p>
    </div>
  );
}
