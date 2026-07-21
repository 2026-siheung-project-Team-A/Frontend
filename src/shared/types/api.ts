// 백엔드 API 명세와 공유하는 타입 정의.
// ⚠️ 확정 계약은 백엔드가 소유한다:
//   REST/소켓 payload → Backend/src/modules/room/room.types.ts, game/game.types.ts
//   이 파일은 그 계약을 프론트에서 그대로 미러링한 것 (필드명·형태를 임의로 바꾸지 말 것).

/** 게임 종류 6종 (Backend/src/common/constants/game-type.ts) */
export type GameType =
  | 'roulette' // 룰렛
  | 'draw' // 제비뽑기
  | 'slot' // 슬롯머신
  | 'balloon' // 풍선터뜨리기
  | 'ladder' // 사다리타기
  | 'vote'; // 투표하기

/** 방 진행 상태 */
export type RoomStatus = 'waiting' | 'playing' | 'finished';

/** 에러 코드 (Backend/src/common/constants/error-code.ts 와 동일) */
export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_EXPIRED'
  | 'ROOM_FULL'
  | 'NOT_HOST'
  | 'NICKNAME_TAKEN'
  | 'NEED_MORE_ITEMS'
  | 'GAME_RUNNING'
  | 'VALIDATION_ERROR';

/** REST 공통 응답 봉투 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: ErrorCode; message: string };
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
  status: RoomStatus;
  gameType: GameType | null;
  participantCount: number;
}

/** GET /api/stats 응답 */
export interface Stats {
  totalRooms: number;
  totalPlays: number;
  totalParticipants: number;
}

// ---------------------------------------------------------------------------
// 실시간(Socket) 공유 모델 — Backend/src/modules/room/room.types.ts 미러
// ---------------------------------------------------------------------------

/** 게임에 쓰이는 항목 하나. 백엔드가 id 기반으로 remove/reorder 한다. */
export interface Item {
  id: string;
  label: string;
}

/**
 * `room:state` 페이로드 — connection 직후 접속자에게 보내는 방 전체 스냅샷.
 * 재접속·새로고침 시 이 하나로 화면을 복원한다(WS2). 참가자는 닉네임 문자열 배열.
 */
export interface RoomStatePayload {
  roomId: string;
  title: string;
  status: RoomStatus;
  gameType: GameType | null;
  items: Item[];
  participants: string[]; // 닉네임 목록
  participantCount: number;
  onlineCount: number; // 이 방에 연결된 소켓 수(닉네임 확정 전 포함)
}

/** `participant:joined` / `participant:left` broadcast 페이로드 (전체 목록 포함) */
export interface ParticipantChangePayload {
  nickname: string;
  participants: string[];
  participantCount: number;
}

// ---------------------------------------------------------------------------
// 게임 결과 — Backend/src/modules/game/game.types.ts 미러 (type 필드로 판별)
//   winner/winners/matching/tally 는 모두 Item(객체)이다 (label 문자열이 아님).
// ---------------------------------------------------------------------------

/** 룰렛·슬롯: 1개 당첨 */
export interface SingleWinnerResult {
  type: 'roulette' | 'slot';
  winner: Item;
}

/** 제비뽑기·풍선터뜨리기: N개 당첨 */
export interface MultiWinnerResult {
  type: 'draw' | 'balloon';
  winners: Item[];
  winnerCount: number;
}

/** 사다리 매칭 한 줄 — 시작 항목 → 도착 항목 */
export interface LadderMatch {
  from: Item;
  to: Item;
}

/** 사다리타기: 항목 무작위 재배치 매핑 */
export interface LadderResult {
  type: 'ladder';
  matching: LadderMatch[];
}

/** 투표 집계 한 줄 — 항목과 득표 수 */
export interface VoteTallyEntry {
  item: Item;
  count: number;
}

/** 투표: 집계 + 최다 득표 */
export interface VoteResult {
  type: 'vote';
  tally: VoteTallyEntry[]; // 득표 0 항목도 포함, 항목 순서대로
  winner: Item; // 최다 득표(동점이면 항목 순서상 먼저)
}

/** 게임 결과 통합 — `result.type` 으로 좁혀서 화면 분기 */
export type GameResult =
  | SingleWinnerResult
  | MultiWinnerResult
  | LadderResult
  | VoteResult;
