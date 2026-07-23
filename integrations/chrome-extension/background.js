// 툴바 아이콘을 누르면 사이드 패널이 열리도록 한다(별도 팝업 없이 바로 패널).
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});
