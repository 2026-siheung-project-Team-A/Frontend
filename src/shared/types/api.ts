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
  | 'ALREADY_PICKED'
  | 'ROOM_LOCKED'
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
  // 사다리가 진행 중이면 그 구조·상하단 라벨(build 스냅샷)·이미 공개된 시작칸 — 재접속/늦은 입장 복원.
  ladder: LadderStructure | null;
  ladderTopLabels: string[]; // 상단 라벨(이름)
  ladderBottomLabels: string[]; // 하단 라벨(당첨항목)
  ladderRevealed: number[]; // 이미 공개된 시작칸 index 들
  // 제비뽑기가 진행 중이면 그 판(제비 수·꽝 수·뽑힌 제비들). 뽑힌 제비만 blank 공개(스포일러 방지).
  draw: DrawState | null;
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

/** 풍선터뜨리기: N개 당첨 (제비뽑기는 game:result 를 쓰지 않고 draw:* 이벤트로 진행) */
export interface MultiWinnerResult {
  type: 'draw' | 'balloon';
  winners: Item[];
  winnerCount: number;
}

// ---------------------------------------------------------------------------
// 제비뽑기(인터랙티브) — game:result 를 쓰지 않고 draw:* 이벤트로 진행.
//   host 가 인원수(=제비 수)·꽝 개수를 정해 draw:shuffle → 서버가 꽝 위치를 무작위 배치해
//   전원에게 draw:shuffled 로 알린다(꽝 위치는 숨김, 다 함께 섞기 애니메이션).
//   host·참가자 누구나 draw:pick(index) → 먼저 뽑은 사람이 잠근다(HSETNX). 뽑는 순간
//   그 제비의 꽝 여부만 공개돼 draw:picked 로 broadcast. 이미 뽑힌 제비는 GAME_RUNNING 으로 거절.
// ---------------------------------------------------------------------------

/** 뽑힌 제비 하나 — index 제비를 by 가 뽑았고 꽝(blank) 여부가 공개됨. host 는 by='호스트'. */
export interface DrawPick {
  index: number;
  by: string;
  blank: boolean; // true=꽝, false=안전
}

/** 제비판 상태 — 재접속/늦은 입장 복원(room:state.draw). 뽑힌 제비만 blank 공개(스포일러 방지). */
export interface DrawState {
  count: number; // 제비 수(=인원수)
  blanks: number; // 꽝 개수
  picks: DrawPick[]; // 이미 뽑힌 제비들(순서 무관)
}

/** `draw:shuffled` — 새 라운드 시작 신호(꽝 위치는 숨김). 전원이 섞기 애니메이션을 함께 본다. */
export interface DrawShuffledPayload {
  count: number;
  blanks: number;
}

// ---------------------------------------------------------------------------
// 사다리타기(네이버 스타일) — game:result 를 쓰지 않고 ladder:* 이벤트로 진행.
//   host 가 칸마다 상단(이름)·하단(당첨항목)을 편집 → ladder:build → 서버가 가로줄 생성.
//   host 가 시작칸 클릭 → ladder:reveal, '결과 보기' → ladder:result.
// ---------------------------------------------------------------------------

/** 가로줄 하나 — row 행에서 세로줄 col 과 col+1 을 잇는다. */
export interface LadderRung {
  row: number;
  col: number;
}

/** 사다리 구조 — 서버가 한 번 생성해 전원에게 broadcast(같은 사다리를 그린다). */
export interface LadderStructure {
  columns: number; // 세로줄(칸) 수
  rows: number; // 행 수(가로줄 높이)
  rungs: LadderRung[]; // 놓인 가로줄들
  mapping: number[]; // mapping[i] = 시작칸 i 의 도착칸 (항상 순열)
}

/** `ladder:built` — 사다리 구조 + 상·하단 라벨 스냅샷 */
export interface LadderBuiltPayload {
  ladder: LadderStructure;
  topLabels: string[];
  bottomLabels: string[];
}

/** `ladder:revealed` — 방금 공개된 시작칸과 그 도착(상·하단 라벨 포함) */
export interface LadderRevealedPayload {
  topIndex: number;
  bottomIndex: number;
  topLabel: string;
  bottomLabel: string;
}

/** `ladder:result` — 전체 상단→하단 매칭(모달을 전원 동시에 연다) */
export interface LadderResultPayload {
  pairs: LadderRevealedPayload[]; // topIndex 0..columns-1 순서
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

/**
 * 게임 결과 통합 — `result.type` 으로 좁혀서 화면 분기.
 * 사다리는 game:result 를 쓰지 않고 ladder:* 이벤트로 진행하므로 여기 없다.
 */
export type GameResult = SingleWinnerResult | MultiWinnerResult | VoteResult;
