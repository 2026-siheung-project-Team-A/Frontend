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

  // 게임 진행 (host)
  selectGame: (socket: Socket, gameType: string) =>
    socket.emit('game:select', { gameType }),
  startGame: (socket: Socket) => socket.emit('game:start', {}),
  resetGame: (socket: Socket) => socket.emit('game:reset'),

  // 투표
  castVote: (socket: Socket, optionId: string) =>
    socket.emit('vote:cast', { optionId }),
  closeVote: (socket: Socket) => socket.emit('vote:close'),

  // Server → Client
  onResult: (socket: Socket, cb: (result: unknown) => void) =>
    socket.on('game:result', cb),
  onVoteUpdated: (socket: Socket, cb: (tally: unknown) => void) =>
    socket.on('vote:updated', cb),
};
