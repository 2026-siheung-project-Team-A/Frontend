# Pick Me Now — Google Meet Add-on (인-회의 사이드 패널)

Google Meet 통화 안에서 `www.pickmenow.co.kr/embed` 를 애드온 **사이드 패널**(iframe)로 띄우는 임베디드 앱.
Zoom 앱과 같은 구조 — 게임 로직·화면은 웹앱에서 로드하고, Meet Add-ons SDK로 회의 컨텍스트만 주고받는다.
웹앱을 배포하면 Meet 애드온에도 자동 반영된다(껍데기 재작업 불필요).

## 웹 쪽 구성 (이미 반영됨)

| 항목 | 위치 |
| --- | --- |
| Meet SDK 초기화 | `src/shared/lib/meet.ts` (`initMeetAddon()`) — `EmbedPage` 마운트 시 호출. Meet 밖에선 무해하게 무시 |
| SDK 패키지 | `@googleworkspace/meet-addons` (npm, 번들에 포함) |
| 프로젝트 번호 주입 | `.env` 의 `VITE_MEET_CLOUD_PROJECT_NUMBER` — 없으면 Meet 초기화 건너뜀(다른 채널 영향 없음) |
| OWASP 보안 헤더 | `vercel.json` — `/embed` 에만 적용. `connect-src` 에 `https://meet.google.com` 추가됨 |
| Side Panel URL | `https://www.pickmenow.co.kr/embed` |

### 왜 별도 세팅이 필요한가 (Zoom과 차이)
Meet 애드온은 **Google Cloud 프로젝트 번호**로 SDK 세션을 만든다(`createAddonSession({ cloudProjectNumber })`).
그래서 Zoom과 달리 프로젝트를 하나 만들고 그 **번호를 빌드에 주입**해야 실제 회의에서 패널이 뜬다.
번호가 없으면 코드가 조용히 초기화를 건너뛰므로, 배포 전까지 다른 채널(크롬·Zoom·웹)엔 전혀 영향이 없다.

## Google Cloud / Marketplace 설정 (함께 진행)

1. **프로젝트 준비**: https://console.cloud.google.com → 프로젝트 생성(또는 기존 사용).
   좌측 상단 프로젝트 선택기에서 **프로젝트 번호**(숫자)를 복사 → `.env` 의 `VITE_MEET_CLOUD_PROJECT_NUMBER` 에 넣고 프론트 재배포.
2. **API 사용 설정**: "API 및 서비스" → 다음 두 개 사용 설정
   - **Google Workspace Marketplace SDK** (⚠️ API 말고 **SDK**)
   - **Google Workspace Add-ons API**
3. **Marketplace SDK → App Configuration**: 앱 이름·로고·지원 링크 등 기본 정보 입력.
4. **Deployment 만들기**: Marketplace SDK 화면에서 **Create new deployment** → **HTTP** 선택 →
   아래 매니페스트(`addon-manifest.json`)를 붙여넣는다. (핵심 필드는 이미 채워져 있음)
   - `sidePanelUrl`: `https://www.pickmenow.co.kr/embed`
   - `addOnOrigins`: `["https://www.pickmenow.co.kr"]` — sidePanelUrl 의 오리진과 **반드시 일치**해야 실행 허용됨.
5. **설치(테스트)**: 배포 화면의 **Install** 클릭 → 본인 계정에 미게시 상태로 설치.

## 데모(미게시) 테스트

- 위 **Install** 후 **실제 Google Meet 통화 시작 → 우하단 액티비티(퍼즐) 아이콘 → Pick Me Now** 실행 → 사이드 패널에 `/embed` 런처(게임 카드)가 뜬다.
- 게시·심사 불필요. 단, 애드온 설치·테스트는 보통 **Google Workspace 계정**(조직 계정)에서 동작한다 — 개인 Gmail은 제약이 있을 수 있음.
- 데모 목적이면 본인 Workspace 계정 하나로 충분. 참가자는 패널이 아니라 각자 폰에서 QR/링크로 입장한다.

## 매니페스트

`addon-manifest.json` 참고. `logoUrl` 은 공개 URL이어야 하며 현재 앱 아이콘(`/apple-touch-icon.png`)을 가리킨다.
메인 무대(모두에게 전체화면 공유)까지 쓰려면 매니페스트에 `mainStageUrl` 을 추가하고 코드에서
`sidePanelClient.startActivity({ mainStageUrl })` 를 호출하면 되지만, 데모(사이드 패널 + 폰 QR)에는 불필요하다.

## 확인 포인트

- 사이드 패널에 `/embed` 런처(게임 카드)가 뜨는지
- 게임 생성 → QR → 폰으로 입장 → 실시간 동작(소켓이 CSP에 안 막히는지 콘솔 확인)
- Meet 콘솔에 "Refused to connect ... Content-Security-Policy" 가 없는지 → 뜨면 해당 도메인을 `vercel.json` CSP 에 추가
- 패널이 안 뜨면: (1) `VITE_MEET_CLOUD_PROJECT_NUMBER` 가 배포 빌드에 들어갔는지, (2) `addOnOrigins` 가 sidePanelUrl 오리진과 일치하는지 확인
