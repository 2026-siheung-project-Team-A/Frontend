// 백엔드 API 명세와 공유하는 타입 정의.
// ⚠️ 확정 계약은 백엔드가 소유한다:
//   REST/소켓 payload → Backend/src/modules/room/room.types.ts, game/game.types.ts
//   이 파일은 그 계약을 프론트에서 그대로 미러링한 것 (필드명·형태를 임의로 바꾸지 말 것).

/** 게임 종류 6종 (Backend/src/common/constants/game-type.ts) */
export type GameType =
  | 'roulette' // 룰렛
  | 'draw' // 제비뽑기
  | 'order' // 순서 정하기
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
  | 'NOT_ENOUGH_STICKS'
  | 'NEED_MORE_PLAYERS'
  | 'NOT_YOUR_TURN'
  | 'PUMP_LIMIT'
  | 'PUMP_FIRST'
  | 'ROOM_LOCKED'
  | 'ROOM_NOT_STARTED'
  | 'PLAYERS_NOT_READY'
  | 'WRONG_PASSWORD'
  | 'VOTE_NOT_OPEN'
  | 'VOTE_NO_VOTES'
  | 'VALIDATION_ERROR';

/** REST 공통 응답 봉투 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: ErrorCode; message: string };
}

/** POST /api/rooms 요청 body */
export interface CreateRoomInput {
  title?: string;
  gameType?: GameType;
  /** 비밀방 여부. true 면 password(숫자 최대 6자리) 필수. */
  isSecret?: boolean;
  password?: string;
  /** 방 유효기간 시작(ISO 8601). 이 시각부터 참가자 입장 가능. 없으면 즉시. */
  startAt?: string;
  /** 방 유효기간 종료(ISO 8601). 이 시각이 지나면 방이 사라진다. 시작~종료 최대 7일. */
  endAt?: string;
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
  isSecret: boolean; // 비밀방이면 입장 시 비밀번호 필요(입력칸 노출)
  startAt: number; // 유효기간 시작(epoch ms). now 보다 크면 아직 시작 전 → 입장 불가. 0=즉시.
  endAt: number; // 유효기간 종료(epoch ms). 0=미설정(레거시).
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
  isSecret: boolean; // 비밀방 여부(자물쇠 표시용). 비밀번호는 포함되지 않는다.
  startAt: number; // 유효기간 시작(epoch ms). 0=즉시(레거시).
  endAt: number; // 유효기간 종료(epoch ms). 이 시각이 지나면 방이 사라진다. 0=미설정(레거시).
  items: Item[];
  participants: string[]; // 닉네임 목록
  participantCount: number;
  maxParticipants: number; // 방 정원(선택 게임 종류로 정해짐) — 대기 화면 "최대 N명" 표시용
  onlineCount: number; // 이 방에 연결된 소켓 수(닉네임 확정 전 포함)
  // 사다리가 진행 중이면 그 구조·상하단 라벨(build 스냅샷)·이미 공개된 시작칸 — 재접속/늦은 입장 복원.
  ladder: LadderStructure | null;
  ladderTopLabels: string[]; // 상단 라벨(이름)
  ladderBottomLabels: string[]; // 하단 라벨(당첨항목)
  ladderRevealed: number[]; // 이미 공개된 시작칸 index 들
  // 제비뽑기가 진행 중이면 그 판(제비 수·꽝 수·뽑힌 제비들). 뽑힌 제비만 blank 공개(스포일러 방지).
  draw: DrawState | null;
  // 풍선 게임이 진행 중이면 그 상태(총 개수·터진 풍선·턴 순서·현재 턴·걸린 사람). 폭탄 위치는 비밀.
  balloon: BalloonState | null;
  // 다음 게임을 위해 로비로 돌아온 참가자 닉네임들. 호스트는 현재 참가자 전원이 여기 있어야 새 게임을 시작할 수 있다.
  ready: string[];
  // 투표 라이프사이클 — 재접속·늦은 입장이 현재 단계·카운트다운을 복원한다.
  voteStatus: VoteStatus;
  voteCloseAt: number | null;
  voteAuto?: boolean; // closing 이 '전원 투표' 자동 마감이면 true
}

/** `room:readyUpdate` — 로비로 돌아온 참가자 목록이 바뀔 때마다(입장·복귀·퇴장). 호스트 UI 가 시작 버튼을 연다. */
export interface RoomReadyUpdatePayload {
  ready: string[];
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

/** 룰렛: 1개 당첨 */
export interface SingleWinnerResult {
  type: 'roulette';
  winner: Item;
}

/** 풍선터뜨리기: N개 당첨 (제비뽑기는 game:result 를 쓰지 않고 draw:* 이벤트로 진행) */
export interface MultiWinnerResult {
  type: 'draw' | 'balloon';
  winners: Item[];
  winnerCount: number;
}

/** 순서 정하기: 항목을 무작위 순열로 1등~N등 줄 세운 결과. order[0] = 1등 */
export interface OrderResult {
  type: 'order';
  order: Item[];
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
  count: number; // 제비 수
  blanks: number; // 꽝 개수
  perPick: number; // 참가자 1인당 뽑기 상한(= ceil(제비수/사람수), 보통 1). 제비수 > 사람수면 2 이상
  picks: DrawPick[]; // 이미 뽑힌 제비들(순서 무관)
}

/**
 * `draw:draft` — 제비뽑기 설정 실시간 미리보기(저장 안 됨). 호스트가 제비 수·꽝 개수를 정하는 동안
 * 참가자도 같은 설정을 실시간으로 본다. roulette:draft / ladder:draft 와 같은 relay.
 */
export interface DrawDraftPayload {
  count: number;
  blanks: number;
}

/** `draw:shuffled` — 새 라운드 시작 신호(꽝 위치는 숨김). 전원이 섞기 애니메이션을 함께 본다. */
export interface DrawShuffledPayload {
  count: number;
  blanks: number;
  perPick: number; // 참가자 1인당 뽑기 상한(제비수 > 사람수면 2 이상)
}

// ---------------------------------------------------------------------------
// 풍선 터뜨리기 (러시안 룰렛식, 턴제) — game:result 없이 balloon:* 이벤트로 진행.
//   host 가 풍선 크기(=최대 펌프 수)를 정해 시작(balloon:start)하면 서버가 1..크기 사이의
//   비밀 '터지는 순번'을 정한다. 호스트 포함 참가자들이 순서대로 자기 턴에 최대 maxPerTurn 번
//   펌프(balloon:pump)하고, 1번 이상 펌프한 뒤 '넘기기'(balloon:pass)로 다음 사람에게 넘긴다.
//   누적 펌프가 그 순번에 도달하는 순간 펌프한 사람이 걸린다(caughtBy). 순번은 걸리기 전까지 안 온다.
// ---------------------------------------------------------------------------

/** 풍선 게임 상태 — 재접속/늦은 입장 복원(room:state.balloon). burstAt(터지는 순번)은 서버 비밀이라 없다. */
export interface BalloonState {
  capacity: number; // 풍선 크기(이만큼 펌프하면 반드시 터짐)
  pumps: number; // 지금까지 누적 펌프 수
  turnPumps: number; // 이번 턴에 펌프한 수(0..maxPerTurn)
  maxPerTurn: number; // 한 턴에 펌프할 수 있는 최대 횟수
  turnOrder: string[]; // 턴 순서(호스트 포함, '호스트' 로 표기)
  turn: string | null; // 현재 턴(걸린 뒤 null). 호스트 차례면 '호스트'
  turnDeadline: number | null; // 현재 턴 제한시각(epoch ms) — 60초 카운트다운. 걸린 뒤엔 null.
  caughtBy: string | null; // 풍선을 터뜨려 걸린 참가자(진행 중이면 null)
}

/** `balloon:started` — 게임 시작(터지는 순번은 비밀). turnOrder 는 호스트를 포함한다. */
export interface BalloonStartedPayload {
  capacity: number;
  turnOrder: string[]; // 호스트 포함
  turn: string; // 첫 턴
  maxPerTurn: number;
  turnDeadline: number; // 첫 턴 제한시각(epoch ms)
}

/** `balloon:pumped` — 현재 턴 참가자가 풍선을 한 번 펌프할 때마다(턴은 유지된다). */
export interface BalloonPumpedPayload {
  by: string; // 이번에 펌프한 참가자('호스트' 포함)
  pumps: number; // 갱신된 누적 펌프 수
  turnPumps: number; // 갱신된 이번 턴 펌프 수
  turn: string | null; // 유지되는 현재 턴 — 걸렸으면 null
  turnDeadline: number | null; // 현재 턴 제한시각(턴이 바뀌면 새 값) — 걸렸으면 null
  caughtBy: string | null; // 이 펌프로 터져 걸렸으면 그 사람, 아니면 null
  burst: boolean; // 이 펌프로 풍선이 터졌는지
}

/** `balloon:passed` — 현재 턴 참가자가 '넘기기'로 다음 사람에게 턴을 넘길 때. */
export interface BalloonPassedPayload {
  by: string; // 넘긴 사람('호스트' 포함)
  turn: string; // 다음 턴 참가자
  turnDeadline: number; // 새 턴 제한시각(epoch ms)
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

/**
 * `ladder:draft` — 사다리 편집 실시간 미리보기(저장 안 됨). 호스트가 목록을 정하는 동안
 * 참가자도 같은 상·하단 라벨을 실시간으로 본다. roulette:draft 와 같은 relay.
 */
export interface LadderDraftPayload {
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

/**
 * 투표 라이프사이클 상태.
 *  preparing : 항목 준비 중(투표 불가) · open : 투표 시작(투표 가능)
 *  closing   : 마감 카운트다운 중(취소·재마감 가능) · closed : 결과 확정
 */
export type VoteStatus = 'preparing' | 'open' | 'closing' | 'closed';

/** `vote:state` — 투표 상태 변경 broadcast. closeAt(마감 시각 epoch ms)은 closing 일 때만. */
export interface VoteStatePayload {
  status: VoteStatus;
  closeAt: number | null;
  auto?: boolean; // closing 이 '전원 투표' 자동 마감이면 true — 안내 문구 구분용
}

/** 투표: 집계 + 최다 득표 */
export interface VoteResult {
  type: 'vote';
  tally: VoteTallyEntry[]; // 득표 0 항목도 포함, 항목 순서대로
  winner: Item; // 최다 득표 대표값(하위호환) — winners[0] 과 같다
  winners: Item[]; // 최다 득표 전원(동점이면 공동 1위로 여럿)
}

/**
 * 게임 결과 통합 — `result.type` 으로 좁혀서 화면 분기.
 * 사다리는 game:result 를 쓰지 않고 ladder:* 이벤트로 진행하므로 여기 없다.
 */
export type GameResult =
  | SingleWinnerResult
  | MultiWinnerResult
  | OrderResult
  | VoteResult;
