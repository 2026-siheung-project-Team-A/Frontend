import axios from 'axios';

/**
 * REST 호출용 axios 인스턴스.
 * 방 생성·조회·통계 같은 1회성 요청에 사용 (실시간은 socket).
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  withCredentials: true,
});
