import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { roomApi } from '../../features/room/api/roomApi';
import { getApiErrorCode } from '../../shared/lib/apiError';
import { useRoomStore } from '../../features/room/store/roomStore';
import { Screen, Button, GameIcon } from '../../shared/ui';
import { SoundToggle } from '../../shared/ui/SoundToggle';
import { initZoomApp } from '../../shared/lib/zoom';
import { initMeetAddon } from '../../shared/lib/meet';
import { markEmbedEntry } from '../../shared/lib/embed';
import type { CreateRoomInput, GameType } from '../../shared/types/api';

/**
 * 임베드 호스트 런처 — Zoom/Meet/Slack/크롬 익스텐션의 패널(iframe/웹뷰) 안에서 로드된다.
 *
 * 일반 홈(/)과 달리 "참여 코드 입력"을 빼고 호스트 진입만 남긴다: 회의 진행자는 항상 호스트이고,
 * 참가자는 패널이 아니라 각자 폰에서 QR/링크로 들어오기 때문이다. 게임 하나를 고르면 곧바로
 * 방을 만들고 호스트 화면(/host/:roomId)으로 떨어져, 슬라이도처럼 "열자마자 방 준비 완료"가 된다.
 *
 * 이 라우트는 게임 로직을 새로 갖지 않는다 — 방 생성·호스트 화면은 기존 웹앱을 그대로 재사용하므로
 * 앞으로 웹앱을 배포하면 모든 임베드 채널에 자동 반영된다.
 */

const GAMES: { type: GameType; label: string; desc: string }[] = [
  { type: 'roulette', label: '룰렛', desc: '원판을 돌려 하나를 뽑아요' },
  { type: 'vote', label: '투표하기', desc: '다 같이 투표해 최다 득표를 정해요' },
  { type: 'draw', label: '제비뽑기', desc: '제비를 뽑아 꽝을 피해요' },
  { type: 'order', label: '순서 정하기', desc: '무작위 순서로 줄 세워요' },
  { type: 'balloon', label: '풍선 터뜨리기', desc: '돌아가며 펌프하다 터뜨린 사람이 걸려요' },
  { type: 'ladder', label: '사다리타기', desc: '사다리를 타고 내려가 짝을 정해요' },
];

export function EmbedPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  // 임베드 런처로 진입했음을 세션에 기록한다 — 이후 방을 나갈 때 홈(/)이 아니라
  // 다시 이 런처(/embed)로 돌아오게 하기 위함(Zoom 은 iframe 이 아니라 최상위 웹뷰라 이 플래그로 판별).
  // 또한 Zoom/Meet 클라이언트 안이면 각 SDK를 초기화한다(밖이면 무해하게 무시).
  // 두 SDK 모두 서로 다른 클라이언트에서만 성공하므로 한쪽이 실패해도 다른 쪽·일반 웹앱에 영향 없다.
  // Zoom config()는 SDK의 첫 호출이어야 하므로 진입 화면인 여기서 마운트 시 한 번 실행한다.
  useEffect(() => {
    markEmbedEntry();
    void initZoomApp();
    void initMeetAddon();
  }, []);

  // 참여 코드로 입장 — 진행자가 아니라 이 기기로 직접 참가할 때. 홈(/)과 같은 규칙으로
  // 코드를 정규화(앞의 # 제거·대문자)한 뒤 참가자 입장 경로(/r/:code)로 보낸다.
  const enter = () => {
    const c = code.trim().replace(/^#/, '').toUpperCase();
    if (c) navigate(`/r/${c}`);
  };

  const create = useMutation({
    mutationFn: (input: CreateRoomInput) => roomApi.create(input),
    onSuccess: (data, variables) => {
      if (!data) return;
      const st = useRoomStore.getState();
      st.reset();
      st.setRoom(data.roomId, 'host');
      st.setHostToken(data.hostToken);
      // 고른 게임을 넘겨 호스트가 게임 선택 화면을 건너뛰고 바로 로비(QR 대기)로 들어가게 한다.
      navigate(`/host/${data.roomId}`, { state: { gameType: variables.gameType } });
    },
  });

  const err = create.isError
    ? getApiErrorCode(create.error) === 'VALIDATION_ERROR'
      ? '입력을 확인해 주세요.'
      : '방을 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
    : null;

  return (
    <Screen>
      {/* 브랜드 줄 — "Pick Me Now" 와 효과음 토글을 같은 선상에 둔다(홈과 동일). */}
      <div className="brand-row">
        <p className="brand">Pick Me Now</p>
        <SoundToggle floating={false} />
      </div>

      <div className="home-headline">
        <h1 className="title">회의에서 바로 정해요</h1>
        <p className="subtitle">게임을 고르면 방이 만들어져요 · 참가자는 QR로 입장</p>
      </div>

      <div className="embed-grid">
        {GAMES.map((g) => (
          <button
            key={g.type}
            type="button"
            className="embed-card"
            disabled={create.isPending}
            onClick={() => create.mutate({ gameType: g.type })}
          >
            <GameIcon type={g.type} size={30} />
            <span className="embed-card-label">{g.label}</span>
            <span className="embed-card-desc">{g.desc}</span>
          </button>
        ))}
      </div>

      {create.isPending && <p className="center muted">방을 만드는 중…</p>}
      {err && <p className="center field-error">{err}</p>}

      {/* 코드로 입장하기 — 진행자가 아니라 이 기기로 직접 참가할 때(홈과 동일한 입력). */}
      <p className="center muted" style={{ fontSize: 14, marginTop: 'auto' }}>또는</p>
      <div className="home-join">
        <input
          className="input"
          placeholder="참여 코드로 입장"
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
    </Screen>
  );
}
