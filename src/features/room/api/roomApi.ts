import { api } from '../../../shared/lib/axios';
import type {
  ApiResponse,
  CreateRoomResponse,
  RoomSummary,
} from '../../../shared/types/api';

/**
 * 방 REST 호출.
 * TanStack Query의 queryFn/mutationFn 으로 사용.
 * TODO: 에러 응답(error.code) 처리
 */
export const roomApi = {
  /** POST /api/rooms — 방 생성 */
  async create(body: { title?: string; gameType?: string }) {
    const res = await api.post<ApiResponse<CreateRoomResponse>>('/rooms', body);
    return res.data.data;
  },

  /** GET /api/rooms/:roomId — 입장 전 방 조회 */
  async get(roomId: string) {
    const res = await api.get<ApiResponse<RoomSummary>>(`/rooms/${roomId}`);
    return res.data.data;
  },
};
