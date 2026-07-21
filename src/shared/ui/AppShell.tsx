import type { ReactNode } from 'react';

/**
 * 모바일 앱 셸 — 폭 100%(최대 480px 중앙), 세로 100dvh.
 * 데스크톱 화면공유 상황에서도 폰 비율을 유지하도록 가운데 정렬한다.
 * 모든 페이지의 최상위 래퍼.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-shell">{children}</div>;
}

/**
 * 화면 뼈대 — 스크롤되는 본문 + (선택) 하단 고정 액션 영역.
 * 와이어프레임의 "하단 고정 버튼" 패턴을 실사용 셸로 옮긴 것.
 */
export function Screen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="screen">
      <div className="screen-body">{children}</div>
      {footer && <div className="screen-footer">{footer}</div>}
    </div>
  );
}

/** 뒤로가기 화살표 + 제목 헤더 (와이어프레임 ②③④ 상단) */
export function TopBar({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
      )}
      <h1>{title}</h1>
      {trailing && <div style={{ marginLeft: 'auto' }}>{trailing}</div>}
    </div>
  );
}
