import { create } from 'zustand';
import type {
  BalloonPoppedPayload,
  BalloonStartedPayload,
  BalloonState,
  DrawPick,
  DrawShuffledPayload,
  DrawState,
  ErrorCode,
  GameResult,
  GameType,
  Item,
  LadderBuiltPayload,
  LadderResultPayload,
  LadderRevealedPayload,
  LadderStructure,
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

  // 사다리(네이버 스타일) — ladder:built/revealed/result + room:state 로 복원
  ladder: LadderStructure | null;
  ladderTopLabels: string[]; // 상단(이름) 스냅샷
  ladderBottomLabels: string[]; // 하단(당첨항목) 스냅샷
  ladderRevealed: number[]; // 공개된 시작칸 index 들
  ladderResult: LadderResultPayload | null; // '결과 보기' → 전체 매칭(모달 오픈 신호)

  // 제비뽑기(인터랙티브) — draw:shuffled/picked + room:state.draw 로 복원
  draw: DrawState | null; // 현재 제비판(제비 수·꽝 수·뽑힌 제비들). null=아직 안 섞음
  drawRound: number; // 섞기 라운드 nonce — 값이 바뀌면 섞기 애니메이션을 다시 재생

  // 풍선 러시안룰렛(턴제) — balloon:started/popped + room:state.balloon 로 복원
  balloon: BalloonState | null; // 진행 중 풍선 상태. null=아직 시작 전
  balloonRound: number; // 시작 라운드 nonce — 값이 바뀌면 풍선판을 다시 그린다

  // 원판(룰렛) 실시간 편집 미리보기 — roulette:draft. 저장 전 상태라 room:state 로 복원되지 않는다.
  rouletteDraft: string[];

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
  applyLadderBuilt: (payload: LadderBuiltPayload) => void;
  applyLadderRevealed: (payload: LadderRevealedPayload) => void;
  applyLadderResult: (payload: LadderResultPayload) => void;
  resetLadder: () => void;
  applyDrawShuffled: (payload: DrawShuffledPayload) => void;
  applyDrawPicked: (payload: DrawPick) => void;
  resetDraw: () => void;
  applyBalloonStarted: (payload: BalloonStartedPayload) => void;
  applyBalloonPopped: (payload: BalloonPoppedPayload) => void;
  resetBalloon: () => void;
  setRouletteDraft: (labels: string[]) => void;
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
  ladder: null as LadderStructure | null,
  ladderTopLabels: [] as string[],
  ladderBottomLabels: [] as string[],
  ladderRevealed: [] as number[],
  ladderResult: null as LadderResultPayload | null,
  draw: null as DrawState | null,
  drawRound: 0,
  balloon: null as BalloonState | null,
  balloonRound: 0,
  rouletteDraft: [] as string[],
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
      // 재접속/늦은 입장이면 진행 중 사다리를 그대로 복원.
      ladder: state.ladder,
      ladderTopLabels: state.ladderTopLabels ?? [],
      ladderBottomLabels: state.ladderBottomLabels ?? [],
      ladderRevealed: state.ladderRevealed ?? [],
      // 진행 중 제비판도 그대로 복원(뽑힌 제비만 blank 공개된 상태로 온다).
      draw: state.draw ?? null,
      balloon: state.balloon ?? null,
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

  // 사다리 '시작' — 서버가 만든 구조·라벨을 반영하고 화면을 진행(playing)으로.
  applyLadderBuilt: (payload) =>
    set({
      ladder: payload.ladder,
      ladderTopLabels: payload.topLabels,
      ladderBottomLabels: payload.bottomLabels,
      ladderRevealed: [],
      ladderResult: null,
      status: 'playing',
    }),
  // 시작칸 하나 공개 — 이미 있으면 중복 추가하지 않는다(멱등).
  applyLadderRevealed: (payload) =>
    set((s) =>
      s.ladderRevealed.includes(payload.topIndex)
        ? s
        : { ladderRevealed: [...s.ladderRevealed, payload.topIndex] },
    ),
  // '결과 보기' — 전체 시작칸 공개 + 결과 모달 오픈.
  applyLadderResult: (payload) =>
    set({
      ladderResult: payload,
      ladderRevealed: payload.pairs.map((p) => p.topIndex),
    }),
  resetLadder: () =>
    set({
      ladder: null,
      ladderTopLabels: [],
      ladderBottomLabels: [],
      ladderRevealed: [],
      ladderResult: null,
    }),

  // 제비 섞기 — 새 라운드. picks 비우고 라운드 nonce 를 올려 섞기 애니메이션을 재생, 화면은 진행(playing)으로.
  applyDrawShuffled: (payload) =>
    set((s) => ({
      draw: {
        count: payload.count,
        blanks: payload.blanks,
        perPick: payload.perPick,
        picks: [],
      },
      drawRound: s.drawRound + 1,
      status: 'playing',
    })),
  // 제비 하나 뽑힘 — 그 제비를 picks 에 추가(같은 index 중복 방지, 멱등). draw 가 없으면 무시.
  applyDrawPicked: (payload) =>
    set((s) => {
      if (!s.draw) return s;
      if (s.draw.picks.some((p) => p.index === payload.index)) return s;
      return { draw: { ...s.draw, picks: [...s.draw.picks, payload] } };
    }),
  resetDraw: () => set({ draw: null }),

  // 풍선 시작 — 서버가 정한 크기·턴 순서로 새 판을 그린다. 라운드 nonce 올려 애니 재생, 진행(playing).
  applyBalloonStarted: (payload) =>
    set((s) => ({
      balloon: {
        capacity: payload.capacity,
        pumps: 0,
        turnOrder: payload.turnOrder,
        turn: payload.turn,
        caughtBy: null,
      },
      balloonRound: s.balloonRound + 1,
      status: 'playing',
    })),
  // 풍선 한 번 펌프 — 누적 펌프 수·턴·걸린 사람을 서버 값으로 갱신. balloon 없으면 무시.
  applyBalloonPopped: (payload) =>
    set((s) => {
      if (!s.balloon) return s;
      // 늦게 도착한 옛 이벤트가 최신 펌프 수를 되돌리지 않게 한다(멱등·단조 증가).
      if (payload.pumps < s.balloon.pumps) return s;
      return {
        balloon: {
          ...s.balloon,
          pumps: payload.pumps,
          turn: payload.turn,
          caughtBy: payload.caughtBy,
        },
      };
    }),
  resetBalloon: () => set({ balloon: null }),

  setRouletteDraft: (rouletteDraft) => set({ rouletteDraft }),

  reset: () => set({ ...initial }),
}));
