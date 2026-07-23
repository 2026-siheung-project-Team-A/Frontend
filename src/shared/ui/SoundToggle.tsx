import { useState } from 'react';
import { isMuted, toggleMuted } from '../lib/sound';
import { SoundOnIcon, SoundOffIcon } from './icons';

/**
 * 효과음 켜기/끄기 버튼. 설정은 localStorage 에 저장된다.
 * 스타일은 index.css 를 건드리지 않도록 인라인으로 둔다.
 *
 *  - floating(기본): 화면 우상단에 절대위치로 떠 있다(대부분의 화면).
 *  - floating=false: 절대위치 없이 흐름에 배치된다 — 홈의 브랜드 줄에 "Pick Me Now"와
 *    같은 선상으로 넣을 때 쓴다.
 */
export function SoundToggle({ floating = true }: { floating?: boolean } = {}) {
  const [muted, setMuted] = useState(isMuted());

  return (
    <button
      type="button"
      onClick={() => setMuted(toggleMuted())}
      aria-label={muted ? '효과음 켜기' : '효과음 끄기'}
      aria-pressed={muted}
      title={muted ? '효과음 켜기' : '효과음 끄기'}
      style={{
        ...(floating
          ? {
              position: 'absolute',
              top: 'max(12px, env(safe-area-inset-top))',
              right: '12px',
              zIndex: 50,
            }
          : null),
        width: 40,
        height: 40,
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: muted ? 'var(--muted)' : 'var(--ink)',
        lineHeight: 1,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        opacity: 0.9,
      }}
    >
      {muted ? <SoundOffIcon size={20} /> : <SoundOnIcon size={20} />}
    </button>
  );
}
