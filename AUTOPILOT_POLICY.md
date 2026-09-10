# My Life Room Autopilot Policy

이 저장소의 자동개선 시스템은 **안전한 제안 → 검증 → 사람의 최종 병합 → 기존 main 자동배포** 순서를 지킨다.

## 자동으로 허용되는 일

- 실제 서비스의 홈, health API, PWA, V20 pose runtime 상태 점검
- main이 이미 10회 preflight + Wrangler dry-run을 통과했을 때 장애 복구 목적의 동일 버전 재배포
- npm/GitHub Actions 의존성 업데이트 PR 제안
- 기존 프런트엔드 파일 한 곳에 대한 저위험 UX, 접근성, 성능, 방어적 오류처리 개선안 작성
- 개선안에 대한 문법검사, production audit, 10회 preflight, Wrangler dry-run
- 검증을 통과한 AI 개선안을 별도 `autopilot/*` 브랜치와 PR로 제안

## 자동으로 금지되는 일

- AI가 main에 직접 커밋하거나 직접 병합
- 인증, 비밀키, 결제, 개인정보, 데이터 삭제 정책 변경
- D1/R2 스키마 또는 migration 자동변경
- Cloudflare Worker 이름, binding, 배포 설정 자동변경
- 기존 reset 의미, API 인증 계약, 서버 저장 계약 자동변경
- 테스트를 우회하거나 실패한 코드를 배포
- 두 개 이상의 대규모 기능을 한 PR에 묶기

## 최종 원칙

AI 개선안은 작은 변경만 만들고, 검증된 PR까지만 자동으로 준비한다. `main` 병합은 최종 승인 단계이며, 병합 후 기존 Cloudflare 배포 워크플로가 다시 전체 검증과 실배포, 실제 URL 끝단 검증을 수행한다.
