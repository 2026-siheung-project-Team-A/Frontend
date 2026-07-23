# Pick Me Now — Zoom App (인-클라이언트 사이드 패널)

Zoom 데스크톱 클라이언트 안에서 `www.pickmenow.co.kr/embed` 를 사이드 패널로 띄우는 임베디드 앱.
게임 로직·화면은 웹앱에서 로드하고, Zoom Apps SDK로 회의 컨텍스트만 주고받는다.
웹앱을 배포하면 Zoom 앱에도 자동 반영된다(껍데기 재작업 불필요).

## 웹 쪽 구성 (이미 반영됨)

| 항목 | 위치 |
| --- | --- |
| Zoom SDK 초기화 | `src/shared/lib/zoom.ts` (`initZoomApp()`) — `EmbedPage` 마운트 시 호출. Zoom 밖에선 무해하게 무시 |
| OWASP 보안 헤더 | `vercel.json` — `/embed` 에만 적용(메인 사이트·크롬 익스텐션 영향 없음) |
| Home URL | `https://www.pickmenow.co.kr/embed` |

### CSP ↔ Domain Allow List 일치 (중요)
`vercel.json` 의 `connect-src` 에 넣은 도메인과 Marketplace **Domain Allow List** 를 반드시 똑같이 맞춘다.
현재 CSP 허용: `self`(www.pickmenow.co.kr), `api.pickmenow.co.kr`(https+wss), `appssdk.zoom.us`.
→ WebSocket을 쓰므로 `wss://api.pickmenow.co.kr` 가 빠지면 소켓이 CSP에 막힌다.

## Zoom Marketplace 설정 (함께 진행)

1. https://marketplace.zoom.us → Develop → **Build App** → **General App** 생성.
2. **Surface**: "Zoom App"(embedded browser / in-client) 활성화.
3. **Home URL**: `https://www.pickmenow.co.kr/embed`
4. **OAuth**
   - Redirect URL for OAuth: (데모용 임시) `https://www.pickmenow.co.kr/embed`
   - OAuth Allow List: `https://www.pickmenow.co.kr/embed`
   - (General App은 OAuth 필드를 채워야 저장된다. 인-클라이언트 데모는 SDK 컨텍스트만 쓰고 실제 토큰 교환은 최소화.)
5. **Domain Allow List** (CSP와 일치): `pickmenow.co.kr`, `www.pickmenow.co.kr`, `api.pickmenow.co.kr`, `appssdk.zoom.us`
6. **Embed → Zoom App SDK**: 사용할 capabilities 등록 — `getRunningContext`, `getMeetingContext`, `getMeetingUUID`, `openUrl`, `shareApp` (코드의 `config()` 와 일치).

## 도메인 검증

Marketplace가 주는 검증 파일을 배치한다(택1):
- **HTML 파일**: Zoom이 준 파일을 `Frontend/public/zoomverify/verifyzoom.html` 로 커밋 → `https://www.pickmenow.co.kr/zoomverify/verifyzoom.html` 로 서빙됨.
- 또는 DNS TXT / 홈 `<head>` meta 태그 / 지원팀 수동 승인.
(계정 단위 검증 — 같은 도메인의 여러 앱은 한 번만.)

## 데모(미게시) 테스트

- 빌드 플로우에서 **Add App**(Local Test) → 본인 개발자 계정에 설치 → **실제 Zoom 회의에서 사이드 패널로 실행**. 리뷰 불필요.
- **같은 Zoom 조직(org) 사용자**에게는 리뷰 없이 공유 가능. 조직 **외부** 테스터는 Beta 승인 필요(영업일 3~4일).
- 데모 목적이면 본인 계정 + 같은 org 로 충분.

## 확인 포인트

- 패널에 `/embed` 런처(게임 카드)가 뜨는지
- 게임 생성 → QR → 폰으로 입장 → 실시간 동작(소켓이 CSP에 안 막히는지 콘솔 확인)
- Zoom 클라이언트 콘솔에 "Missing OWASP secure headers" / "Refused to load ... Content-Security-Policy" 가 없는지 → 뜨면 해당 도메인을 `vercel.json` CSP + Domain Allow List 양쪽에 추가
