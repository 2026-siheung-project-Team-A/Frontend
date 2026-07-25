import { useEffect, useRef, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { connectRoom } from '../../../shared/lib/socket';
import { useRoomStore } from '../store/roomStore';
import type {
  BalloonPassedPayload,
  BalloonPumpedPayload,
  BalloonStartedPayload,
  DrawDraftPayload,
  DrawPick,
  DrawShuffledPayload,
  ErrorCode,
  GameResult,
  Item,
  LadderBuiltPayload,
  LadderDraftPayload,
  LadderResultPayload,
  LadderRevealedPayload,
  ParticipantChangePayload,
  RoomReadyUpdatePayload,
  RoomStatePayload,
  VoteStatePayload,
  VoteTallyEntry,
} from '../../../shared/types/api';

/** room:join / host 액션 ack 형태 (백엔드 gateway 공통) */
type Ack = { ok: true } | { ok: false; code: ErrorCode };

/**
 * 방 소켓 연결의 단일 소유자.
 * roomId/role 당 연결을 하나 만들고, 백엔드 RoomGateway/GameGateway 가 내보내는
 * 서버→클라 이벤트를 전부 roomStore 에 반영한다. 페이지는 이 훅을 마운트하고
 * 반환된 socketRef 로 emit(항목 추가·게임 시작 등) 한다.
 *
 * 이벤트 계약은 백엔드가 소유(room.types.ts / game.types.ts). payload 필드명·형태를
 * 임의로 바꾸지 말 것. 값(actions/nickname/token)은 리스너 안에서 getState()로 읽어
 * 스테일 클로저를 피한다.
 */
export function useRoomConnection(
  roomId: string,
  role: 'host' | 'participant',
): RefObject<Socket | null> {
  const socketRef = useRef<Socket | null>(null);
  // 한 번이라도 연결에 성공했는지. 최초 연결 전의 connect_error(백엔드 미기동 등)는
  // 빨간 배너 대신 조용한 'connecting'으로 두고, 실제 끊김(연결 후 드롭)에만 경고한다.
  const everConnected = useRef(false);
  // 내 닉네임 사본. 나가기(goHome→reset)가 store 닉네임을 먼저 비워도, 뒤이어 도착하는
  // 내 자신의 participant:left 를 '남'으로 오인해 "내이름님이 나갔어요"가 뜨는 걸 막는다.
  const myNickRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId) return;

    everConnected.current = false;
    const store = useRoomStore.getState();
    store.setConnection('connecting');
    store.setError(null);
    store.setClosed(false);

    const socket = connectRoom({
      roomId,
      role,
      token: store.hostToken ?? undefined,
    });
    socketRef.current = socket;

    // ── 연결 생명주기 ───────────────────────────────────────────────
    socket.on('connect', () => {
      everConnected.current = true;
      useRoomStore.getState().setConnection('connected');
      // 참가자는 연결되면 바로 입장. ack로 실패(닉네임중복·정원초과·비밀번호오류)를 받아 store에 반영.
      // 비밀방이면 joinPassword 를 함께 실어 보낸다(자유방이면 undefined).
      const { nickname, joinPassword } = useRoomStore.getState();
      if (role === 'participant' && nickname) {
        myNickRef.current = nickname; // 내 자신 판별용 사본(reset 에도 안 지워진다)
        socket.emit(
          'room:join',
          { nickname, password: joinPassword ?? undefined },
          (ack: Ack) => {
            if (ack && ack.ok === false) useRoomStore.getState().setError(ack.code);
          },
        );
      }
    });
    socket.on('disconnect', (reason) => {
      // NOTE(backend): reason === 'io server disconnect'는 socket.io가 자동 재연결하지 않는다
      //   (host room:close 등). room:closed 를 이미 받았다면 종료 화면이 우선한다.
      void reason;
      useRoomStore.getState().setConnection('disconnected');
    });
    socket.on('connect_error', () => {
      useRoomStore
        .getState()
        .setConnection(everConnected.current ? 'disconnected' : 'connecting');
    });

    // ── 방 스냅샷·참가자 ────────────────────────────────────────────
    socket.on('room:state', (state: RoomStatePayload) => {
      useRoomStore.getState().applyRoomState(state);
    });
    socket.on('participant:joined', (p: ParticipantChangePayload) => {
      useRoomStore.getState().setParticipants(p.participants);
    });
    socket.on('participant:left', (p: ParticipantChangePayload) => {
      const st = useRoomStore.getState();
      st.setParticipants(p.participants);
      // 누군가 방을 떠나면(직접 나가기 / 게임 후 60초 미복귀 자동강퇴) 남은 사람들에게 잠깐 알린다.
      // 내가 나가는 경우는 "방에서 나왔습니다"를 나가는 쪽(leaveRoom)에서 직접 띄우므로 여기선 건너뛴다.
      // (store 닉네임은 reset 으로 먼저 비워질 수 있어, 지워지지 않는 myNickRef 로 내 자신을 판별한다.)
      if (p.nickname && p.nickname !== myNickRef.current) {
        st.pushNotice(`${p.nickname}님이 방에서 나갔어요`);
      }
    });
    // 다음 게임 준비(로비로 돌아온 참가자) 목록 — 호스트 로비의 '게임 시작' 게이트에 쓴다.
    socket.on('room:readyUpdate', (p: RoomReadyUpdatePayload) => {
      useRoomStore.getState().setReadyPlayers(p.ready);
    });

    // ── 항목(호스트가 추가/삭제하면 전원에게 전체 목록 broadcast) ────
    const onItems = (p: { items: Item[] }) =>
      useRoomStore.getState().setItems(p.items);
    socket.on('item:added', onItems);
    socket.on('item:updated', onItems);
    socket.on('item:removed', onItems);
    socket.on('item:reordered', onItems);

    // ── 게임 진행·결과 ──────────────────────────────────────────────
    socket.on('game:selected', (p: { gameType: RoomStatePayload['gameType'] }) => {
      useRoomStore.getState().setGameType(p.gameType);
    });
    // 새 라운드 시작 — 이전 라운드 잔여물(결과·집계·사다리·제비·원판 초안)을 먼저 지운다.
    // 안 그러면 아직 방으로 안 돌아온 참가자 화면에 옛 결과 모달이 새 게임 위에 남고,
    // 강퇴 타이머가 안 꺼지며, 룰렛 당첨자가 옛 값으로 오염된다.
    // 이전 라운드 잔여물(결과·집계·사다리·제비·풍선·초안)만 지운다 — 화면 전환(status)은 분리.
    const resetRound = () => {
      const st = useRoomStore.getState();
      st.setResult(null);
      st.setTally([]);
      st.setVoteState({ status: 'preparing', closeAt: null });
      st.resetLadder();
      st.resetDraw();
      st.resetBalloon();
      st.setRouletteDraft([]);
      st.setOrderDraft('');
    };
    const startRound = () => {
      resetRound();
      useRoomStore.getState().setStatus('playing');
    };
    socket.on('game:started', startRound);
    // '게임 시작 ▶' — 서버가 준 startAt 까지 전원이 로비에 머문 채 'N초 뒤 게임으로 들어가요'
    // 카운트다운을 함께 본다(각자 로컬 시계로 동기화). 0이 되면 그제야 실제 게임 화면으로 전환한다.
    //
    // 중요: 리셋(resetBalloon 등)은 '즉시' 하고, 화면 전환(status='playing')만 카운트다운 종료로 미룬다.
    // 예전엔 리셋도 지연 setTimeout 안에서 돌아, 카운트다운 직후 도착하는 게임 시작 이벤트(balloon:started 등)를
    // 늦게 실행된 리셋이 나중에 덮어(null) 참가자가 "곧 게임이 시작돼요" 대기 화면에 갇혔다
    // — 특히 모바일은 setTimeout 스로틀링으로 리셋이 balloon:started 뒤에 실행되기 쉬웠다.
    let beginTimer: ReturnType<typeof setTimeout> | null = null;
    socket.on('game:begin', (p?: { gameType?: RoomStatePayload['gameType']; startAt?: number }) => {
      const startAt = typeof p?.startAt === 'number' ? p.startAt : Date.now();
      resetRound(); // 즉시 리셋 — 곧 도착할 시작 이벤트를 지연 리셋이 덮지 않게
      useRoomStore.getState().setCountdownStartAt(startAt);
      if (beginTimer) clearTimeout(beginTimer);
      beginTimer = setTimeout(() => {
        useRoomStore.getState().setStatus('playing'); // 화면 전환만 카운트다운 종료 시
        useRoomStore.getState().setCountdownStartAt(null);
      }, Math.max(0, startAt - Date.now()));
    });
    // 호스트가 게임을 취소하고 로비로 돌아감 — 참가자 전원을 로비로 되돌리고 안내 토스트를 띄운다.
    // (호스트 소켓은 이 이벤트를 받지 않는다 — 서버가 발신자를 제외하고 broadcast 한다.)
    socket.on('game:cancelled', () => {
      if (role !== 'participant') return;
      const st = useRoomStore.getState();
      st.setResult(null);
      st.setTally([]);
      st.resetLadder();
      st.resetDraw();
      st.resetBalloon();
      st.setRouletteDraft([]);
      st.setOrderDraft('');
      st.setCountdownStartAt(null); // 카운트다운 중 취소되면 즉시 내리고
      if (beginTimer) clearTimeout(beginTimer); // 예약된 게임 화면 전환도 취소한다.
      st.setStatus('waiting');
      st.pushNotice('방장이 게임을 취소하여 방으로 돌아왔습니다');
      // 로비 복귀를 서버에 알려(room:ready) 다음 게임 시작 게이트(전원 복귀)를 통과시킨다.
      socket.emit('room:ready');
    });
    // 원판 실시간 편집 미리보기 — 저장 없이 참가자에게만 relay 된다(발신자 제외).
    socket.on('roulette:draft', (p: { labels: string[] }) => {
      useRoomStore.getState().setRouletteDraft(p.labels ?? []);
    });
    // 순서 정하기 항목 실시간 미리보기 — 호스트가 입력 중인 항목을 참가자가 '입력 중' 칩으로 본다.
    socket.on('order:draft', (p: { label: string }) => {
      useRoomStore.getState().setOrderDraft(p.label ?? '');
    });
    socket.on('game:result', (p: { result: GameResult }) => {
      const st = useRoomStore.getState();
      st.setResult(p.result);
      // 룰렛·슬롯·제비·풍선·사다리는 각 컴포넌트가 애니메이션을 재생한 뒤 onFinish로 전환한다
      // (애니를 건너뛰지 않게). 투표는 애니가 없어 여기서 바로 전환.
      if (p.result.type === 'vote') st.setStatus('finished');
    });
    socket.on('vote:updated', (p: { tally: VoteTallyEntry[] }) => {
      useRoomStore.getState().setTally(p.tally);
    });
    // 투표 라이프사이클(준비/열림/마감카운트다운/마감) — 호스트 조작이 전원에게 반영된다.
    socket.on('vote:state', (p: VoteStatePayload) => {
      useRoomStore.getState().setVoteState(p);
    });

    // ── 사다리(네이버 스타일): 시작(built)·시작칸 공개(revealed)·결과 보기(result) ──
    // host·참가자 모두 같은 이벤트를 받아 같은 사다리·같은 내려가는 과정을 본다.
    // 사다리 편집 실시간 미리보기 — 저장 없이 참가자에게만 relay 된다(발신자 호스트 제외).
    socket.on('ladder:draft', (p: LadderDraftPayload) => {
      useRoomStore.getState().setLadderDraft(p);
    });
    socket.on('ladder:built', (p: LadderBuiltPayload) => {
      useRoomStore.getState().applyLadderBuilt(p);
    });
    socket.on('ladder:revealed', (p: LadderRevealedPayload) => {
      useRoomStore.getState().applyLadderRevealed(p);
    });
    socket.on('ladder:result', (p: LadderResultPayload) => {
      useRoomStore.getState().applyLadderResult(p);
    });

    // ── 제비뽑기(인터랙티브): 섞기(shuffled)·뽑힘(picked) ──
    // host·참가자 모두 같은 이벤트를 받아 같은 제비판을 본다(뽑힌 제비만 꽝 여부 공개).
    // 제비뽑기 설정 실시간 미리보기 — 저장 없이 참가자에게만 relay 된다(발신자 호스트 제외).
    socket.on('draw:draft', (p: DrawDraftPayload) => {
      useRoomStore.getState().setDrawDraft(p);
    });
    socket.on('draw:shuffled', (p: DrawShuffledPayload) => {
      useRoomStore.getState().applyDrawShuffled(p);
    });
    socket.on('draw:picked', (p: DrawPick) => {
      useRoomStore.getState().applyDrawPicked(p);
    });

    // ── 풍선 러시안룰렛(턴제): 시작(started)·펌프(pumped)·넘기기(passed) ──
    // host·참가자 모두 같은 이벤트를 받아 같은 풍선판·턴을 본다(폭탄 위치는 걸릴 때 드러난다).
    socket.on('balloon:started', (p: BalloonStartedPayload) => {
      useRoomStore.getState().applyBalloonStarted(p);
    });
    socket.on('balloon:pumped', (p: BalloonPumpedPayload) => {
      useRoomStore.getState().applyBalloonPumped(p);
    });
    socket.on('balloon:passed', (p: BalloonPassedPayload) => {
      useRoomStore.getState().applyBalloonPassed(p);
    });

    socket.on('online:count', (p: { onlineCount: number }) => {
      useRoomStore.getState().setOnlineCount(p.onlineCount);
    });

    // ── 종료·에러 ───────────────────────────────────────────────────
    // 방 삭제는 참가자만 '방이 삭제됨' 상태로 만든다. 호스트는 스스로 삭제하고 이미 홈으로
    // 이동하므로, 자기 broadcast(room:closed)를 받아 홈에서 삭제 모달이 뜨는 일을 막는다.
    socket.on('room:closed', () => {
      if (role === 'participant') useRoomStore.getState().setClosed(true);
    });
    // 호스트가 나를 강퇴함 — 안내 토스트 후 방 종료와 같은 경로로 홈으로 돌아간다.
    socket.on('room:kicked', () => {
      const st = useRoomStore.getState();
      st.pushNotice('호스트가 방에서 내보냈어요');
      st.setClosed(true);
    });
    socket.on('error', (e: { code: ErrorCode; message?: string }) => {
      if (!e?.code) return;
      // 투표 라이프사이클 경합(마감 직후 투표 시도 등)은 치명적이지 않다 — 전체 에러 화면 대신 조용히 무시.
      if (e.code === 'VOTE_NOT_OPEN' || e.code === 'VOTE_NO_VOTES') return;
      useRoomStore.getState().setError(e.code);
    });

    // 모바일에서 화면을 껐다 켜거나(백그라운드→포그라운드) 네트워크가 돌아오면 소켓이 끊긴 채
    // 남아 있을 수 있다. socket.io 자동 재연결은 백오프 타이머라(모바일 백그라운드에서 지연·정지)
    // 즉시 붙지 않으므로, 복귀 즉시 재연결을 시도해 'waiting' 상태에서 빨리 빠져나온다
    // ('connect' 핸들러가 room:join 으로 슬롯을 reclaim 한다).
    const resume = () => {
      if (document.visibilityState === 'visible' && socket.disconnected) {
        socket.connect();
      }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume);
    window.addEventListener('focus', resume);

    return () => {
      if (beginTimer) clearTimeout(beginTimer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', resume);
      window.removeEventListener('focus', resume);
      socket.off();
      socket.disconnect();
      socketRef.current = null;
      useRoomStore.getState().setConnection('idle');
    };
  }, [roomId, role]);

  return socketRef;
}
