/**
 * 결과 저장/공유 — 모바일 우선.
 * 네이티브 공유 시트(navigator.share) 우선, 없으면 클립보드 복사로 폴백.
 * 반환값으로 UI가 토스트 문구를 고른다.
 */
export type ShareOutcome = 'shared' | 'copied' | 'failed';

export async function shareResult(text: string): Promise<ShareOutcome> {
  // 1) 네이티브 공유 (모바일). 사용자가 취소하면 AbortError → 폴백하지 않고 조용히 종료.
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title: 'Pick Me Up', text });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
      // 공유 실패 시 복사로 폴백
    }
  }
  // 2) 클립보드 복사
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch {
    /* fall through */
  }
  return 'failed';
}
