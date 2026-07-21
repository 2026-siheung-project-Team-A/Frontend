import { useEffect, useRef, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';
import { connectRoom } from '../../../shared/lib/socket';
import { useRoomStore } from '../store/roomStore';
import type {
  ErrorCode,
  GameResult,
  Item,
  ParticipantChangePayload,
  RoomStatePayload,
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
    socket.on('game:started', () => {
      useRoomStore.getState().setStatus('playing');
    });
    socket.on('game:result', (p: { result: GameResult }) => {
      const st = useRoomStore.getState();
      st.setResult(p.result);
      st.setStatus('finished');
    });
    socket.on('game:reset', () => {
      const st = useRoomStore.getState();
      st.setResult(null);
      st.setStatus('waiting');
    });

    // ── 종료·에러 ───────────────────────────────────────────────────
    socket.on('room:closed', () => {
      useRoomStore.getState().setClosed(true);
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
