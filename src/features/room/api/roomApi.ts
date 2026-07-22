import { api } from '../../../shared/lib/axios';
import type {
  ApiResponse,
  CreateRoomInput,
  CreateRoomResponse,
  RoomSummary,
} from '../../../shared/types/api';

/**
 * 방 REST 호출.
 * TanStack Query의 queryFn/mutationFn 으로 사용.
 * 백엔드는 실패 시 4xx + { success:false, error:{ code } } 로 응답 → axios가 reject한다.
 * 호출부는 onError에서 shared/lib/apiError 의 getApiErrorCode(err) 로 코드를 꺼내 처리한다.
 */
export const roomApi = {
  /** POST /api/rooms — 방 생성(게임 종류·방 이름·비밀방 옵션 포함) */
  async create(body: CreateRoomInput) {
    const res = await api.post<ApiResponse<CreateRoomResponse>>('/rooms', body);
    return res.data.data;
  },

  /** GET /api/rooms/:roomId — 입장 전 방 조회 */
  async get(roomId: string) {
    const res = await api.get<ApiResponse<RoomSummary>>(`/rooms/${roomId}`);
    return res.data.data;
  },
};
