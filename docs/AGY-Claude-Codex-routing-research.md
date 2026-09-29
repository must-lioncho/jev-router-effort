# AGY·Claude Code·Codex: Jev 라우팅 연결 지점 비교

조사일: 2026-09-28. 웹 자료는 Genspark CLI(`gsk`)로 찾아 공식 문서 본문을 대조했다. **제품의 기능**, **이 저장소의 구현**, **실제 계정에서 검증된 동작**은 서로 다르다.

## 결론

사진 속 AGY의 `/model` 화면은 실제 모델·effort 선택기다. 더구나 AGY 1.1.27부터 `/model <name> <prompt>`로 **한 턴만** 다른 모델을 사용하고 이전 모델로 돌아갈 수 있다.[A1] 따라서 “AGY는 대화 도중 모델을 바꿀 수 없다”는 설명은 틀렸다. 다만 사용자가 수동으로 고르는 기능과, Jev가 **일반 프롬프트를 매 턴 가로채 자동 선택**하는 연결 지점은 별개의 문제다.

현재 작업 폴더에는 기존 진단 이후 `CLOUD_CODE_URL`과 `jev-router` 모델 행을 이용한 AGY 프록시가 추가되어 있다.[R3] 이것은 **구현·모의 테스트 통과**이지, 아래에서 말하는 공식 지원 또는 실제 AGY 로그인 상태에서의 연속 턴 성공 증거는 아니다. AGY 1.2.12 계정에서 모델 A→B 두 턴을 보내고 실제 상류 요청과 응답을 확인할 때까지 네이티브 자동 라우팅은 **미검증**으로 표시한다.

## 비교표

| 비교 축 | Claude Code (`jev-claude`) | Codex CLI (`jev-codex`) | AGY (`jev-agy`) |
| --- | --- | --- | --- |
| 사람이 모델을 고르는 방법 | `/model` 선택기·명령.[C1] | 모델 선택기·`--model` 및 설정.[O1] | `/model` 선택기와 `--model`; effort도 선택.[A1][A2] |
| **한 턴만 다른 모델** | 이 저장소는 새 턴의 프록시 요청을 재작성.[R1] | 이 저장소는 새 턴의 프록시 요청을 재작성.[R2] | 공식 `/model <name> <prompt>`: **수동 한 턴 선택 후 원래 모델 복귀**.[A1] |
| 선택기에 라우터 행 추가 | `ANTHROPIC_CUSTOM_MODEL_OPTION`으로 커스텀 `/model` 행 추가가 문서화됨.[C2] | 저장소의 프록시가 모델 카탈로그에 `jev-router` 행을 더함; 커스텀 provider 설정은 공식 지원.[R2][O1] | 저장소의 프록시가 AGY 카탈로그 응답에 `jev-router` 행을 더함. 이 방식은 AGY 공식 확장 계약으로 확인되지 않음.[R3] |
| 요청을 외부 프록시로 보내는 설정 | `ANTHROPIC_BASE_URL` 게이트웨이 설정.[C3] | `model_providers.<id>.base_url` 및 `model_provider`; 실행별 `--config` 가능.[O1] | 저장소는 `CLOUD_CODE_URL`을 사용. 공식 AGY 문서에서 동등한 프록시 계약을 확인하지 못함; 제3자 실측은 제어 API와 추론 API 분리 가능성을 제기.[R3][T1] |
| 공식 훅이 현재 모델을 **변경**하는 출력 | 라우터 구현은 훅 대신 프록시 요청을 재작성.[R1] | 라우터 구현은 훅 대신 프록시 요청을 재작성.[R2] | `PreInvocation` 입력에는 `modelName`이 있지만 문서화된 출력은 `injectSteps`이며 모델 변경 필드는 없다.[A3] |
| headless 입력으로 네이티브 화면을 대체할 수 있나 | 해당하지 않음: 프록시를 두고 원래 CLI 사용.[R1] | 해당하지 않음: 프록시를 두고 원래 CLI 사용.[R2] | 아니오. AGY의 `stream-json`은 headless이며 `/model` 슬래시 명령도 그 스트림에서 지원하지 않음.[A4] |
| 기존 로그인·인증 | Claude 게이트웨이는 로그인·게이트웨이 자격증명에 따라 과금·인증이 달라짐. 구독 인증을 프록시할 때 헤더 전달 조건 확인 필요.[C3] | `requires_openai_auth=true`는 OpenAI 인증을 사용하는 provider 설정.[O2][R2] | 프록시가 실제 OAuth 요청을 양쪽 경로에서 그대로 전달하는지 **실계정 검증 필요**.[R3][T1] |
| 이 저장소에서 확인된 수준 | 프록시 구현·테스트가 있으며 이전 실행 기록상 라우팅 사례가 있음.[R1] | 프록시 구현·테스트가 있으며 이전 실행 기록상 라우팅 사례가 있음.[R2] | 프록시 코드·모의 테스트가 있음. 조사 중 전체 테스트 **94개 통과**; 실제 AGY 네이티브 **연속 턴 성공은 아직 별도 미확인**.[R3] |

### 연결 구조 차트

```mermaid
flowchart LR
  U[사용자 프롬프트] --> C[Claude Code: Jev Router 행]
  U --> O[Codex: Jev Router 행]
  U --> A[AGY: Jev Router 행 시도]
  C --> CP[ANTHROPIC_BASE_URL 프록시]
  O --> OP[model_providers.base_url 프록시]
  A --> AP[CLOUD_CODE_URL 프록시]
  CP --> CJ[Jev 선택 → 요청 모델 재작성]
  OP --> OJ[Jev 선택 → 요청 모델 재작성]
  AP -. AGY 1.2.12 실계정 연속 턴 검증 필요 .-> AJ[Jev 선택 → 요청 모델 재작성]
```

차트의 AGY 점선은 **불가능 판정**이 아니라 **미검증 연결**이다. AGY가 지원하는 수동 `/model <name> <prompt>`는 별도로 동작하며, 자동 가로채기의 증거가 아니다.[A1]

## 왜 AGY에 더 엄격한 실측이 필요한가

Claude의 커스텀 모델 행과 게이트웨이, Codex의 사용자 정의 provider는 각각 공식 설정 문서에 있다.[C2][C3][O1] 반면 AGY에 관해서는 `CLOUD_CODE_URL` 동작을 설명하는 공식 프록시 계약을 찾지 못했다. 커뮤니티 조사에서는 이 변수가 제어 API에는 적용되지만 추론 호출은 별도 클라이언트를 사용할 수 있다고 주장한다.[T1] 이 보고는 **다른 버전 환경의 제3자 관측**이므로 AGY 1.2.12의 확정 사실로 승격하면 안 된다. 하지만 카탈로그 행만 보이고 실제 생성 요청이 프록시를 통과하지 않을 위험을 점검할 근거는 된다.

확정 절차: `jev-agy` 원래 화면에서 가벼운 첫 프롬프트와 복잡한 둘째 프롬프트를 순서대로 실행한다. 두 턴의 **AGY 프록시 수신 요청**, **Jev 결정**, **상류로 전송된 실제 모델 ID**, **응답 성공**을 한 세션에서 대조한다. 선택기 행의 표시와 모의 테스트만으로 성공을 선언하지 않는다. 실측 실패 시 기존 [드롭 리포트](../DROP_REPORT.md)에 해당 버전과 실패 지점을 추가해야 한다. 이 조사는 네트워크 전송이나 계정 설정을 바꾸지 않았다.

## 근거

- [A1] [AGY CLI 변경 기록](https://github.com/google-antigravity/antigravity-cli/blob/main/CHANGELOG.md), 1.1.27의 `/model <name> <prompt>` 및 1.1.5의 모델·effort 선택기.
- [A2] [AGY CLI 사용법](https://antigravity.google/docs/cli/using/), `/model`과 설정 화면.
- [A3] [AGY Hooks](https://antigravity.google/docs/hooks/), `PreInvocation` 입력·출력 계약.
- [A4] [AGY Headless mode](https://antigravity.google/docs/cli/headless/), `stream-json`의 `/model` 제한.
- [C1] [Claude Code model configuration](https://code.claude.com/docs/en/model-config), 선택기와 `/model`.
- [C2] [Claude Code environment variables](https://code.claude.com/docs/en/env-vars), `ANTHROPIC_CUSTOM_MODEL_OPTION`.
- [C3] [Claude Code LLM gateway](https://code.claude.com/docs/en/llm-gateway), `ANTHROPIC_BASE_URL` 및 구독·게이트웨이 인증 주의사항.
- [O1] [OpenAI Docs: Codex advanced configuration](https://developers.openai.com/codex/config-file/config-advanced), provider와 실행별 설정 덮어쓰기.
- [O2] [OpenAI Docs: Codex configuration reference](https://developers.openai.com/codex/config-reference), `base_url`, `wire_api`, `requires_openai_auth`.
- [T1] [9Router AGY 조사 이슈](https://github.com/decolua/9router/issues/1358), 제3자의 제어/추론 경로 분리 보고; 현재 AGY 버전으로 일반화 불가.
- [R1] 저장소 구현: [Claude launcher](../bin/jev-claude.mjs), [Claude proxy](../src/proxy.mjs).
- [R2] 저장소 구현: [Codex launcher](../src/codex-cli.mjs), [Codex proxy](../src/codex-proxy.mjs).
- [R3] 저장소 구현: [AGY launcher](../src/anti-cli.mjs), [AGY proxy](../src/agy-proxy.mjs), [AGY mock tests](../test/agy-proxy.test.mjs). 이 항목은 공식 문서나 실계정 성공 증거가 아니다.
