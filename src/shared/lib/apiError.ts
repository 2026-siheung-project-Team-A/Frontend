import { AxiosError } from 'axios';
import type { ApiResponse, ErrorCode } from '../types/api';

/**
 * axios 에러에서 백엔드 에러 봉투({ success:false, error:{ code } })의 code를 뽑는다.
 * 백엔드는 4xx로 응답하므로 axios가 reject → 이 헬퍼로 code를 꺼내 사용자 문구를 고른다.
 * 코드가 없으면(네트워크 오류 등) null.
 */
export function getApiErrorCode(error: unknown): ErrorCode | null {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiResponse<unknown> | undefined;
    return body?.error?.code ?? null;
  }
  return null;
}
