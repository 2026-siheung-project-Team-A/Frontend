import { create } from 'zustand';
import type { GameType } from '../../../shared/types/api';

/**
 * 방 클라이언트 상태 (Zustand).
 * 서버 상태(참가자 목록 등 실시간)는 socket 이벤트로 여기 반영하고,
 * REST 캐시성 데이터는 TanStack Query가 따로 관리.
 */
interface RoomState {
  roomId: string | null;
  nickname: string | null;
  role: 'host' | 'participant' | null;
  gameType: GameType | null;
  participants: string[];
  items: { itemId: string; label: string }[];

  setRoom: (roomId: string, role: 'host' | 'participant') => void;
  setNickname: (nickname: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  nickname: null,
  role: null,
  gameType: null,
  participants: [],
  items: [],

  setRoom: (roomId, role) => set({ roomId, role }),
  setNickname: (nickname) => set({ nickname }),
  reset: () =>
    set({
      roomId: null,
      nickname: null,
      role: null,
      gameType: null,
      participants: [],
      items: [],
    }),
}));
