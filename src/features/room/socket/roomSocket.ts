import type { Socket } from 'socket.io-client';

/**
 * 방 관련 소켓 이벤트 송수신 헬퍼.
 * 컴포넌트에서 connectRoom()으로 받은 socket을 넘겨 사용.
 * TODO: 이벤트 핸들러를 useRoomStore에 연결
 */
export const roomSocket = {
  // Client → Server
  join: (socket: Socket, nickname: string) =>
    socket.emit('room:join', { nickname }),
  leave: (socket: Socket) => socket.emit('room:leave'),
  close: (socket: Socket) => socket.emit('room:close'),
  /** 참가자 '방으로 돌아가기' — 게임이 끝난 뒤 로비 복귀를 서버에 알린다(호스트의 새 게임 시작 게이트 통과). */
  ready: (socket: Socket) => socket.emit('room:ready'),

  // Server → Client 구독 (컴포넌트 mount 시 등록, unmount 시 off)
  onState: (socket: Socket, cb: (state: unknown) => void) =>
    socket.on('room:state', cb),
  onParticipantJoined: (socket: Socket, cb: (p: unknown) => void) =>
    socket.on('participant:joined', cb),
  onParticipantLeft: (socket: Socket, cb: (p: unknown) => void) =>
    socket.on('participant:left', cb),
};
