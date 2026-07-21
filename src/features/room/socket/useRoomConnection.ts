import { useEffect, useRef, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { connectRoom } from '../../../shared/lib/socket';
import { useRoomStore } from '../store/roomStore';
import type {
  BalloonPoppedPayload,
  BalloonStartedPayload,
  DrawPick,
  DrawShuffledPayload,
  ErrorCode,
  GameResult,
  Item,
  LadderBuiltPayload,
  LadderResultPayload,
  LadderRevealedPayload,
  ParticipantChangePayload,
  RoomStatePayload,
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
      // 참가자는 연결되면 바로 입장. ack로 실패(닉네임중복·정원초과)를 받아 store에 반영.
      const { nickname } = useRoomStore.getState();
      if (role === 'participant' && nickname) {
        socket.emit('room:join', { nickname }, (ack: Ack) => {
          if (ack && ack.ok === false) useRoomStore.getState().setError(ack.code);
        });
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
      useRoomStore.getState().setParticipants(p.participants);
    });

    // ── 항목(호스트가 추가/삭제하면 전원에게 전체 목록 broadcast) ────
    const onItems = (p: { items: Item[] }) =>
      useRoomStore.getState().setItems(p.items);
    socket.on('item:added', onItems);
    socket.on('item:removed', onItems);
    socket.on('item:reordered', onItems);

    // ── 게임 진행·결과 ──────────────────────────────────────────────
    socket.on('game:selected', (p: { gameType: RoomStatePayload['gameType'] }) => {
      useRoomStore.getState().setGameType(p.gameType);
    });
    // 새 라운드 시작 — 이전 라운드 잔여물(결과·집계·사다리·제비·원판 초안)을 먼저 지운다.
    // 안 그러면 아직 방으로 안 돌아온 참가자 화면에 옛 결과 모달이 새 게임 위에 남고,
    // 강퇴 타이머가 안 꺼지며, 룰렛 당첨자가 옛 값으로 오염된다.
    const startRound = () => {
      const st = useRoomStore.getState();
      st.setResult(null);
      st.setTally([]);
      st.resetLadder();
      st.resetDraw();
      st.resetBalloon();
      st.setRouletteDraft([]);
      st.setStatus('playing');
    };
    socket.on('game:started', startRound);
    // '게임 시작 ▶' — 결과 전이지만 참가자도 곧장 게임 화면으로(대기 화면 탈출).
    socket.on('game:begin', startRound);
    // 원판 실시간 편집 미리보기 — 저장 없이 참가자에게만 relay 된다(발신자 제외).
    socket.on('roulette:draft', (p: { labels: string[] }) => {
      useRoomStore.getState().setRouletteDraft(p.labels ?? []);
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

    // ── 사다리(네이버 스타일): 시작(built)·시작칸 공개(revealed)·결과 보기(result) ──
    // host·참가자 모두 같은 이벤트를 받아 같은 사다리·같은 내려가는 과정을 본다.
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
    socket.on('draw:shuffled', (p: DrawShuffledPayload) => {
      useRoomStore.getState().applyDrawShuffled(p);
    });
    socket.on('draw:picked', (p: DrawPick) => {
      useRoomStore.getState().applyDrawPicked(p);
    });

    // ── 풍선 러시안룰렛(턴제): 시작(started)·터짐(popped) ──
    // host·참가자 모두 같은 이벤트를 받아 같은 풍선판·턴을 본다(폭탄 위치는 걸릴 때 드러난다).
    socket.on('balloon:started', (p: BalloonStartedPayload) => {
      useRoomStore.getState().applyBalloonStarted(p);
    });
    socket.on('balloon:popped', (p: BalloonPoppedPayload) => {
      useRoomStore.getState().applyBalloonPopped(p);
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
    socket.on('error', (e: { code: ErrorCode; message?: string }) => {
      if (e?.code) useRoomStore.getState().setError(e.code);
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
      useRoomStore.getState().setConnection('idle');
    };
  }, [roomId, role]);

  return socketRef;
}
