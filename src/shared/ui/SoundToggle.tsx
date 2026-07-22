import { useState } from 'react';
import { isMuted, toggleMuted } from '../lib/sound';

/**
 * 효과음 켜기/끄기 버튼 — 화면 우상단 고정. 설정은 localStorage 에 저장된다.
 * 스타일은 index.css 를 건드리지 않도록 인라인으로 둔다.
 */
export function SoundToggle() {
  const [muted, setMuted] = useState(isMuted());

  return (
    <button
      type="button"
      onClick={() => setMuted(toggleMuted())}
      aria-label={muted ? '효과음 켜기' : '효과음 끄기'}
      aria-pressed={muted}
      title={muted ? '효과음 켜기' : '효과음 끄기'}
      style={{
        position: 'fixed',
        top: 'max(12px, env(safe-area-inset-top))',
        right: '12px',
        zIndex: 50,
        width: 40,
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--ink)',
        fontSize: 18,
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        opacity: 0.9,
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
