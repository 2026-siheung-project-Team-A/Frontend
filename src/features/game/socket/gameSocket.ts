import type { Socket } from 'socket.io-client';

/**
 * 게임 관련 소켓 이벤트 헬퍼 (항목·게임진행·투표).
 * TODO: 결과 이벤트를 game store/UI에 연결
 */
export const gameSocket = {
  // 항목 (host)
  addItem: (socket: Socket, label: string) => socket.emit('item:add', { label }),
  removeItem: (socket: Socket, itemId: string) =>
    socket.emit('item:remove', { itemId }),
  reorderItems: (socket: Socket, order: string[]) =>
    socket.emit('item:reorder', { order }),

  // 게임 진행 (host)
  selectGame: (socket: Socket, gameType: string) =>
    socket.emit('game:select', { gameType }),
  startGame: (socket: Socket) => socket.emit('game:start', {}),
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
