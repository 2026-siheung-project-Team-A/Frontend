import { io, Socket } from 'socket.io-client';

/**
 * WebSocket(Socket.io) 연결 — 실시간 게임 전용.
 * 백엔드 RoomGateway 는 handshake.auth 에서 { roomId, hostToken } 을 읽어
 * roomId 유효성·host 여부를 판별한다(role 은 서버가 정하므로 보내지 않는다).
 * (namespace: '/rooms')
 */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function connectRoom(params: {
  roomId: string;
  role: 'host' | 'participant';
  token?: string; // hostToken (host 만 보유). participant 는 없음.
}): Socket {
  return io(`${WS_URL}/rooms`, {
    auth: { roomId: params.roomId, hostToken: params.token },
    autoConnect: true,
  });
}
