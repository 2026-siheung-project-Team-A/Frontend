import { useEffect, useState } from 'react';
import { useRoomStore } from '../../features/room/store/roomStore';

/**
 * 방 안내 토스트 — 참가자 퇴장(직접 나가기·게임 후 60초 미복귀 자동강퇴) 같은 일이 생기면
 * 남은 사람들에게 하단 중앙에서 잠깐 떴다 사라진다. store 의 notice(key nonce)를 관찰한다.
 *
 * index.css 를 건드리지 않도록 스타일은 인라인으로 두고, 나타남/사라짐은 visible 상태로 트랜지션한다.
 */
const SHOW_MS = 3200; // 화면에 머무는 시간
const FADE_MS = 260; // 사라지는 트랜지션 시간

export function RoomToast() {
  const notice = useRoomStore((s) => s.notice);
  const [shown, setShown] = useState<{ text: string; key: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    setVisible(true);
    const hide = setTimeout(() => setVisible(false), SHOW_MS);
    const clear = setTimeout(() => setShown(null), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
    // pushNotice 는 매번 새 notice 객체(오르는 key nonce)를 만들어, 같은 문구가 다시 와도 토스트가 재생된다.
  }, [notice]);

  if (!shown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        zIndex: 60,
        transform: `translateX(-50%) translateY(${visible ? 0 : 10}px)`,
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        maxWidth: 'min(92vw, 420px)',
        padding: '10px 16px',
        borderRadius: 999,
        background: 'var(--ink, #22242b)',
        color: 'var(--surface, #fff)',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.3,
        textAlign: 'center',
        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0,0,0,0.18))',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {shown.text}
    </div>
  );
}
