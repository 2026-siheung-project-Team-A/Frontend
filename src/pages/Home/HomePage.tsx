import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { roomApi } from '../../features/room/api/roomApi';
import { getApiErrorCode } from '../../shared/lib/apiError';
import { useRoomStore } from '../../features/room/store/roomStore';
import { Screen, Button } from '../../shared/ui';
import heroImg from '../../assets/hero.png';

/**
 * ① 홈 — 호스트 진입(방 만들기) + 참가자 진입(참여 코드 입력).
 * Phase 1은 룰렛 고정이므로 게임 선택(②) 없이 바로 방을 만든다.
 *   방 만들기 → POST /api/rooms → /host/:roomId
 *   코드 입력 → /r/:code (참가자 입장)
 */
export function HomePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const create = useMutation({
    // 게임 종류는 방 안에서 호스트가 고른다(② GameSelect → game:select).
    mutationFn: () => roomApi.create({}),
    onSuccess: (data) => {
      if (!data) return;
      // 이전 방의 잔여 상태(items·result·status 등)를 비우고 새 방으로 진입한다.
      const st = useRoomStore.getState();
      st.reset();
      st.setRoom(data.roomId, 'host');
      st.setHostToken(data.hostToken);
      navigate(`/host/${data.roomId}`);
    },
  });

  const enter = () => {
    const c = code.trim().replace(/^#/, '').toUpperCase();
    if (c) navigate(`/r/${c}`);
  };

  return (
    <Screen>
      <p className="brand">Pick Me Up</p>

      <div style={{ marginTop: 32 }}>
        <h1 className="title">오늘 뭐 정할까요?</h1>
        <p className="subtitle">6가지 방식으로 다 같이 결정</p>
      </div>

      <img
        src={heroImg}
        alt=""
        className="placeholder-box"
        style={{ width: '100%', height: 180, objectFit: 'cover', marginTop: 28 }}
      />

      <div className="spacer" />

      <div className="stack">
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending ? '방 만드는 중…' : '방 만들기 (호스트)'}
        </Button>

        {create.isError && (
          <p className="center" style={{ color: 'var(--danger)', fontSize: 14 }}>
            {getApiErrorCode(create.error) === 'VALIDATION_ERROR'
              ? '입력을 확인해 주세요.'
              : '방을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'}
          </p>
        )}

        <p className="center muted" style={{ fontSize: 14 }}>또는</p>

        <div style={{ display: 'flex', gap: 12 }}>
          <input
            className="input"
            placeholder="참여 코드 입력"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && enter()}
            inputMode="text"
            autoCapitalize="characters"
          />
          <Button variant="secondary" block={false} onClick={enter} style={{ flexShrink: 0 }}>
            입장
          </Button>
        </div>
      </div>
    </Screen>
  );
}
