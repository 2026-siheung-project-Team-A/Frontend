import { io, Socket } from 'socket.io-client';

/**
 * WebSocket(Socket.io) 연결 — 실시간 게임 전용.
 * 방마다 연결을 만들고, roomId·role·token을 핸드셰이크 쿼리로 전달.
 * (백엔드 게이트웨이 namespace: '/rooms')
 */
const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

export function connectRoom(params: {
  roomId: string;
  role: 'host' | 'participant';
  token?: string;
}): Socket {
  return io(`${WS_URL}/rooms`, {
    query: params,
    autoConnect: true,
  });
}
