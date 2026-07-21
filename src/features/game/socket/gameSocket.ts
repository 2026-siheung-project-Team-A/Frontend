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
  removeItem: (socket: Socket, itemId: string) =>
    socket.emit('item:remove', { itemId }),
  reorderItems: (socket: Socket, order: string[]) =>
    socket.emit('item:reorder', { order }),

  // 게임 진행 (host)
  selectGame: (socket: Socket, gameType: string) =>
    socket.emit('game:select', { gameType }),
  /** 즉시게임 실행. draw/balloon 은 options.count(뽑을 개수)를 넘길 수 있다. */
  startGame: (socket: Socket, options?: Record<string, unknown>) =>
    socket.emit('game:start', { options }),
  resetGame: (socket: Socket) => socket.emit('game:reset'),

  // 투표 (참가자 vote:cast / host vote:close) — 백엔드는 payload.itemId 를 읽는다
  castVote: (socket: Socket, itemId: string) =>
    socket.emit('vote:cast', { itemId }),
  closeVote: (socket: Socket) => socket.emit('vote:close'),

  // Server → Client
  // ⚠️ 미사용. game:result 구독은 useRoomConnection이 소유한다(store에 반영).
  //   여기서 socket.on()을 추가로 붙이면 같은 이벤트에 리스너가 중복 등록되므로,
  //   새 서버 이벤트 구독은 헬퍼가 아니라 useRoomConnection에 추가할 것.
  //   vote:updated는 Phase 2(투표) 때 useRoomConnection에 편입 예정.
  onResult: (socket: Socket, cb: (result: unknown) => void) =>
    socket.on('game:result', cb),
  onVoteUpdated: (socket: Socket, cb: (tally: unknown) => void) =>
    socket.on('vote:updated', cb),
};
