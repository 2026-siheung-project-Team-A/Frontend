---
name: ⚡ Performance
about: 성능 문제 / 최적화 / 부하 테스트 결과 기반 개선 이슈
title: "[PERF] "
labels: type/perf, area/service
assignees: ''
---

## ⚡ 성능 문제 개요
<!-- 어떤 동작이 느린지 1~2줄 요약. 예: 룰렛 위젯 초기 로드 시 LCP 5초 초과 -->


## 📊 현재 측정 결과 (AS-IS)
| 지표 | 값 | 측정 조건 |
|------|----|---------|
| LCP (최대 콘텐츠 페인트) |  |  |
| FCP (첫 콘텐츠 페인트) |  |  |
| CLS (누적 레이아웃 이동) |  |  |
| 번들 크기 |  |  |
| Lighthouse 점수 |  |  |
| 측정 도구 | Lighthouse / Chrome DevTools / WebVitals | |

<details>
<summary>측정 환경 / 명령어</summary>

```bash
# 예시
npm run build && npx vite preview
npx lighthouse http://localhost:4173 --output json --output-path ./lighthouse-report.json
```

</details>

## 🎯 목표 (TO-BE)
- LCP < 
- CLS < 
- Lighthouse 점수 ≥ 

## 🔍 원인 가설
- [ ] 번들 크기 과다 / 코드 스플리팅 미적용
- [ ] 불필요한 리렌더링
- [ ] 이미지 / 폰트 최적화 미흡
- [ ] 레이아웃 쓰래싱 (Layout Thrashing)
- [ ] 메인 스레드 블로킹
- [ ] 캐시 미적용 (HTTP 캐시 / 메모이제이션)
- [ ] 기타:

## 🛠️ 개선 방안 후보
| 옵션 | 장점 | 단점 / 트레이드오프 |
|------|------|------|
| A.  |  |  |
| B.  |  |  |
| C.  |  |  |

## ✅ 수락 기준 (Acceptance Criteria)
- [ ] AS-IS 대비 LCP X% 이상 개선
- [ ] Lighthouse 동일 시나리오 재측정 결과 첨부
- [ ] Chrome DevTools Performance 탭으로 개선 구간 검증
- [ ] 회귀 방지 Lighthouse CI 설정 추가/갱신

## 🔗 관련 자료
- Lighthouse 리포트:
- Chrome DevTools 스냅샷:
- 관련 이슈/PR:
