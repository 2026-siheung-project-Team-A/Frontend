import { create } from 'zustand';
import type {
  ErrorCode,
  GameResult,
  GameType,
  Item,
  RoomStatePayload,
  RoomStatus,
  VoteTallyEntry,
} from '../../../shared/types/api';

/** 소켓 연결 상태 — 끊김 배너 표시에 사용 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

/**
 * 방 클라이언트 상태 (Zustand).
 * 서버 상태(참가자·항목·집계·결과 등 실시간)는 socket 이벤트로 여기 반영하고,
 * REST 캐시성 데이터는 TanStack Query가 따로 관리.
 * 화면은 gameType + status(waiting→playing→finished)로 분기한다.
 * (투표는 game:start 없이 status=waiting 인 채로 진행되다 vote:close 로 finished)
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
  tally: VoteTallyEntry[]; // 투표 실시간 집계 (vote:updated)
  onlineCount: number; // 이 방 접속 소켓 수 (online:count / room:state)

  // 연결·에러
  connection: ConnectionStatus;
  roomError: ErrorCode | null;
  closed: boolean;

  // actions
  setRoom: (roomId: string, role: 'host' | 'participant') => void;
  setNickname: (nickname: string) => void;
  setHostToken: (token: string) => void;
  setConnection: (connection: ConnectionStatus) => void;
  applyRoomState: (state: RoomStatePayload) => void;
  setStatus: (status: RoomStatus) => void;
  setGameType: (gameType: GameType | null) => void;
  setItems: (items: Item[]) => void;
  setParticipants: (participants: string[]) => void;
  setResult: (result: GameResult | null) => void;
  setTally: (tally: VoteTallyEntry[]) => void;
  setOnlineCount: (onlineCount: number) => void;
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
  tally: [] as VoteTallyEntry[],
  onlineCount: 0,
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
      onlineCount: state.onlineCount,
    }),
  setStatus: (status) => set({ status }),
  setGameType: (gameType) => set({ gameType }),
  setItems: (items) => set({ items }),
  setParticipants: (participants) => set({ participants }),
  setResult: (result) => set({ result }),
  setTally: (tally) => set({ tally }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setError: (roomError) => set({ roomError }),
  setClosed: (closed) => set({ closed }),
  reset: () => set({ ...initial }),
}));
