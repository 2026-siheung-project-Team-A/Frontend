/**
 * 텍스트 클립보드 복사 — 임베드(Zoom 웹뷰·크롬 익스텐션 iframe 등)까지 커버하는 폴백 포함.
 *
 * 왜 필요한가:
 *  - 비동기 Clipboard API(`navigator.clipboard.writeText`)는 보안 컨텍스트 + `clipboard-write`
 *    권한이 있어야 한다. Zoom 데스크톱의 임베디드 브라우저(CEF 웹뷰)는 이 권한을 안 줘서
 *    호출이 `NotAllowedError` 로 거부되거나 `navigator.clipboard` 자체가 없다.
 *  - 그 경우 레거시 `document.execCommand('copy')` 는 사용자 제스처(클릭) 안에서 동기로 실행되면
 *    웹뷰에서도 동작한다. 이게 임베드 환경의 표준 폴백이다.
 *
 * 반드시 클릭 등 사용자 제스처 핸들러 안에서 호출할 것(제스처가 있어야 복사가 허용된다).
 * @returns 복사 성공 여부
 */
export async function copyText(text: string): Promise<boolean> {
  // 1) 비동기 Clipboard API (가능하면 최우선 — HTTPS + 권한 필요)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한 거부(Zoom 등) — 아래 레거시 폴백으로 넘어간다.
  }

  // 2) 레거시 execCommand 폴백 (Zoom 웹뷰·제한된 iframe에서 동작)
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    // 화면 밖으로 밀되 포커스/선택은 가능하게(display:none 이면 선택이 안 된다).
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
    ta.style.padding = '0';
    ta.style.border = 'none';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);

    const sel = document.getSelection();
    const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length); // iOS 사파리 대응

    const ok = document.execCommand('copy');

    document.body.removeChild(ta);
    // 원래 사용자 선택을 복원(있었다면).
    if (savedRange && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    return ok;
  } catch {
    return false;
  }
}
