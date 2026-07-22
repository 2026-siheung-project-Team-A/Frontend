import type { Socket } from 'socket.io-client';

/**
 * 게임 관련 소켓 이벤트 헬퍼 (항목·게임진행·투표).
 */
export const gameSocket = {
  /**
   * 항목 추가 (host) — ack를 기다리는 Promise를 반환한다.
   * 백엔드 addItem은 room 해시를 읽고-수정하고-통째로 저장하는 원자적이지 않은 연산이라,
   * 확인 없이 여러 개를 연달아 쏘면 서로 겹쳐 실행되며 마지막 것만 남는 lost-update가 난다
   * (여러 항목을 한 번에 반영하려는 호출부에서 실제로 재현됨). 그런 경우 반드시 순차 await할 것 —
   * ItemEditor처럼 한 번에 하나씩(사람이 타이핑하는 속도) 호출하는 곳은 await 없이 호출해도 안전하다.
   */
  addItem: (socket: Socket, label: string) =>
    new Promise<{ ok: boolean }>((resolve) => {
      socket.emit('item:add', { label }, (ack: { ok: boolean }) => resolve(ack));
    }),
  /** 항목 삭제 (host) — ack를 기다리는 Promise. addItem과 같은 이유로 순차 처리가 필요한 곳(룰렛 동기화)에서 await한다. */
  removeItem: (socket: Socket, itemId: string) =>
    new Promise<{ ok: boolean }>((resolve) => {
      socket.emit('item:remove', { itemId }, (ack: { ok: boolean }) => resolve(ack));
    }),
  reorderItems: (socket: Socket, order: string[]) =>
    socket.emit('item:reorder', { order }),

  // 게임 진행 (host)
  selectGame: (socket: Socket, gameType: string) =>
    socket.emit('game:select', { gameType }),
  /**
   * '게임 시작 ▶' — 아직 결과도 항목 편집도 안 끝났지만, 참가자를 대기 화면에서
   * 실제 게임 화면으로 옮겨 호스트가 목록을 채우는 과정을 실시간으로 보게 한다.
   */
  /**
   * '게임 시작 ▶' — ack 를 기다리는 Promise. 이전 게임 참가자가 다 안 돌아왔으면
   * {ok:false, code:'PLAYERS_NOT_READY'} 로 거절되므로, 호출부가 이 값으로 화면 전환을 막고 안내한다.
   */
  beginGame: (socket: Socket) =>
    new Promise<{ ok: boolean; code?: string }>((resolve) => {
      socket.emit('game:begin', (ack: { ok: boolean; code?: string }) =>
        resolve(ack),
      );
    }),
  /** 즉시게임 실행. draw/balloon 은 options.count(뽑을 개수)를 넘길 수 있다. */
  startGame: (socket: Socket, options?: Record<string, unknown>) =>
    socket.emit('game:start', { options }),
  /**
   * host '방으로 돌아가기' — 라운드를 접어(결과·투표·사다리·제비뽑기 데이터 삭제) 방을 다시
   * 대기 상태로 되돌린다. 참가자를 강제 이동시키지 않는다 — 각자 결과창의 '방으로 돌아가기'로 로비에 온다.
   */
  returnToRoom: (socket: Socket) => socket.emit('room:return'),
  /**
   * 원판 실시간 편집 미리보기 — 저장하지 않는 relay. 호스트가 원판 칸에 타이핑하는 동안
   * 참가자도 같은 라벨을 실시간으로 본다('돌리기'를 눌러야 addItem 으로 실제 items 확정).
   */
  sendRouletteDraft: (socket: Socket, labels: string[]) =>
    socket.emit('roulette:draft', { labels }),

  // 투표 (참가자 vote:cast / host vote:close) — 백엔드는 payload.itemId 를 읽는다
  castVote: (socket: Socket, itemId: string) =>
    socket.emit('vote:cast', { itemId }),
  closeVote: (socket: Socket) => socket.emit('vote:close'),

  // 사다리 (host) — 서버가 구조를 만들어 ladder:built 로 전원 broadcast.
  //   build 는 칸마다 상단(이름)·하단(당첨항목)을 함께 보낸다(칸 수 = 두 배열 길이, 서로 같아야 함).
  buildLadder: (socket: Socket, topLabels: string[], bottomLabels: string[]) =>
    socket.emit('ladder:build', { topLabels, bottomLabels }),
  revealLadder: (socket: Socket, topIndex: number) =>
    socket.emit('ladder:reveal', { topIndex }),
  resultLadder: (socket: Socket) => socket.emit('ladder:result'),

  // 제비뽑기(인터랙티브) — host 가 인원수·꽝 개수로 섞고, host·참가자 누구나 제비를 뽑는다.
  //   섞기 결과는 draw:shuffled, 뽑힘은 draw:picked 로 서버가 전원 broadcast(useRoomConnection 구독).
  shuffleDraw: (socket: Socket, count: number, blanks: number) =>
    socket.emit('draw:shuffle', { count, blanks }),
  /**
   * 제비 뽑기 — ack 를 기다리는 Promise. 이미 뽑힌 제비면 {ok:false, code:'GAME_RUNNING'} 로 거절된다
   * (서버 HSETNX 원자적 잠금 — 먼저 뽑은 사람이 선점). 성공 시 값은 draw:picked broadcast 로 반영된다.
   */
  pickDraw: (socket: Socket, index: number) =>
    new Promise<{ ok: boolean; code?: string }>((resolve) => {
      socket.emit('draw:pick', { index }, (ack: { ok: boolean; code?: string }) =>
        resolve(ack),
      );
    }),

  // 풍선 러시안룰렛(턴제) — host 도 참가한다. 현재 턴 참가자가 자기 턴에 최대 3번 펌프하고 '넘기기'로 넘긴다.
  //   시작은 balloon:started, 펌프는 balloon:pumped, 넘기기는 balloon:passed 로 전원 broadcast(useRoomConnection 구독).
  /**
   * 풍선 게임 시작(host) — ack 를 기다리는 Promise. 참가자가 2명 미만이면
   * {ok:false, code:'NEED_MORE_PLAYERS'} 로 거절되므로, 호출부가 이 값으로 안내를 띄운다.
   * (예전엔 ack 없이 emit 만 해 실패해도 아무 반응이 없었다 — '작동 안 함'의 원인.)
   */
  startBalloon: (socket: Socket, total: number) =>
    new Promise<{ ok: boolean; code?: string }>((resolve) => {
      socket.emit(
        'balloon:start',
        { total },
        (ack: { ok: boolean; code?: string }) => resolve(ack),
      );
    }),
  /**
   * 풍선 펌프 — ack 를 기다리는 Promise. 내 턴이 아니면 {ok:false, code:'NOT_YOUR_TURN'},
   * 이번 턴 상한(3회) 도달 시 {ok:false, code:'PUMP_LIMIT'} 로 거절된다. 결과(누적/이번 턴 펌프 수·
   * 걸림 여부)는 balloon:pumped broadcast 로 반영된다. 펌프해도 턴은 유지된다(자동으로 안 넘어감).
   */
  pumpBalloon: (socket: Socket) =>
    new Promise<{ ok: boolean; code?: string }>((resolve) => {
      socket.emit('balloon:pump', {}, (ack: { ok: boolean; code?: string }) =>
        resolve(ack),
      );
    }),
  /**
   * '넘기기' — 1번 이상 펌프한 뒤 다음 사람에게 턴을 넘긴다. 아직 안 펌프했으면
   * {ok:false, code:'PUMP_FIRST'} 로 거절된다. 결과는 balloon:passed broadcast 로 반영된다.
   */
  passBalloon: (socket: Socket) =>
    new Promise<{ ok: boolean; code?: string }>((resolve) => {
      socket.emit('balloon:pass', {}, (ack: { ok: boolean; code?: string }) =>
        resolve(ack),
      );
    }),
  // 서버→클라 구독은 useRoomConnection이 단독 소유한다(store에 반영). 여기에 socket.on() 헬퍼를
  // 두면 같은 이벤트에 리스너가 중복 등록되므로, 새 서버 이벤트 구독은 useRoomConnection에 추가할 것.
};
