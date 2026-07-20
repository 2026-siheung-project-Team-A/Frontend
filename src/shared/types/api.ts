// 백엔드 API 명세와 공유하는 타입 정의
// (백엔드 Backend/src/common/constants 와 값이 동일해야 함)

/** 게임 종류 6종 */
export type GameType =
  | 'roulette' // 룰렛
  | 'draw' // 제비뽑기
  | 'slot' // 슬롯머신
  | 'balloon' // 풍선터뜨리기
  | 'ladder' // 사다리타기
  | 'vote'; // 투표하기

/** REST 공통 응답 봉투 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** POST /api/rooms 응답 */
export interface CreateRoomResponse {
  roomId: string;
  joinUrl: string;
  hostToken: string;
}

/** GET /api/rooms/:roomId 응답 */
export interface RoomSummary {
  roomId: string;
  title: string;
  status: 'waiting' | 'playing' | 'finished';
  gameType: GameType | null;
  participantCount: number;
}

/** GET /api/stats 응답 */
export interface Stats {
  totalRooms: number;
  totalPlays: number;
  totalParticipants: number;
}
