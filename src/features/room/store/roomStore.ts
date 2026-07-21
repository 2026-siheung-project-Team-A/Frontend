import { create } from 'zustand';
import type {
  ErrorCode,
  GameResult,
  GameType,
  Item,
  RoomStatePayload,
  RoomStatus,
} from '../../../shared/types/api';

/** 소켓 연결 상태 — 끊김 배너 표시에 사용 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/**
 * 방 클라이언트 상태 (Zustand).
 * 서버 상태(참가자·항목·결과 등 실시간)는 socket의 `room:state`/이벤트로 여기 반영하고,
 * REST 캐시성 데이터는 TanStack Query가 따로 관리.
 * 화면은 이 store의 `status`를 보고 분기한다(waiting→playing→finished).
 * 참가자는 백엔드 계약대로 닉네임 문자열 배열이다.
 */
interface RoomState {
  // 내 세션
  roomId: string | null;
  nickname: string | null;
  role: 'host' | 'participant' | null;
  hostToken: string | null;

  // 방 스냅샷(서버 → room:state / 이벤트)
  status: RoomStatus;
  gameType: GameType | null;
  participants: string[]; // 닉네임 목록
  items: Item[];
  result: GameResult | null;

  // 연결·에러
  connection: ConnectionStatus;
  roomError: ErrorCode | null; // error 이벤트/ack 실패 코드 (방없음·닉네임중복 등)
  closed: boolean; // host가 room:close → room:closed 수신

  // actions
  setRoom: (roomId: string, role: 'host' | 'participant') => void;
  setNickname: (nickname: string) => void;
  setHostToken: (token: string) => void;
  setConnection: (connection: ConnectionStatus) => void;
  /** 서버 room:state 스냅샷을 통째로 반영 */
  applyRoomState: (state: RoomStatePayload) => void;
  setStatus: (status: RoomStatus) => void;
  setGameType: (gameType: GameType | null) => void;
  setItems: (items: Item[]) => void;
  setParticipants: (participants: string[]) => void;
  setResult: (result: GameResult | null) => void;
  setError: (code: ErrorCode | null) => void;
  setClosed: (closed: boolean) => void;
  reset: () => void;
}

const initial = {
  roomId: null,
  nickname: null,
  role: null,
  hostToken: null,
  status: 'waiting' as RoomStatus,
  gameType: null,
  participants: [] as string[],
  items: [] as Item[],
  result: null as GameResult | null,
  connection: 'idle' as ConnectionStatus,
  roomError: null as ErrorCode | null,
  closed: false,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initial,

  setRoom: (roomId, role) => set({ roomId, role }),
  setNickname: (nickname) => set({ nickname }),
  setHostToken: (hostToken) => set({ hostToken }),
  setConnection: (connection) => set({ connection }),
  applyRoomState: (state) =>
    set({
      roomId: state.roomId,
      status: state.status,
      gameType: state.gameType,
      participants: state.participants,
      items: state.items,
    }),
  setStatus: (status) => set({ status }),
  setGameType: (gameType) => set({ gameType }),
  setItems: (items) => set({ items }),
  setParticipants: (participants) => set({ participants }),
  setResult: (result) => set({ result }),
  setError: (roomError) => set({ roomError }),
  setClosed: (closed) => set({ closed }),
  reset: () => set({ ...initial }),
}));
