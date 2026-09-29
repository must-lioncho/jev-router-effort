# jev-router

[그림으로 보는 모델·effort 자동 선택 (English / 한국어)](https://htmlpreview.github.io/?https://github.com/must-lioncho/jev-router-effort/blob/master/docs/story.html) · [HTML 원본](docs/story.html)

![Codex에서 자동 effort 선택을 초록색으로 강조한 화면](docs/assets/codex-effort-highlight.png)

실제 Codex 화면의 `effort auto → low (0.63)`과 [Claude Code의 모델·effort 선택 화면](docs/assets/claude-routing-evidence.png)을 확인할 수 있습니다. 화면은 라우팅 결과의 증거이며, 속도 비교나 시장 최초 주장의 증거는 아닙니다. [제작 배경과 그림, 다음 계획 보기 →](https://htmlpreview.github.io/?https://github.com/must-lioncho/jev-router-effort/blob/master/docs/story.html)

[English (default)](README.md)

[라우터 Q&A (한국어)](docs/QNA-kr.md) · [Router Q&A (English)](docs/QNA.md)

이 저장소는 원작자와 기여자들이 만든 [gargpratyush/jev-router](https://github.com/gargpratyush/jev-router)를
바탕으로 한 파생 버전입니다. 비상업적 프로젝트로 운영하지만, MIT 라이선스에 따라
누구나 상업적 목적을 포함해 사용·수정·배포·포크할 수 있습니다. 재배포할 때는 원작의
저작권 및 라이선스 고지를 유지해야 합니다. 전문은 [LICENSE](LICENSE)에 있습니다.

이 버전에는 Codex의 추론 노력(reasoning effort) 자동 선택과 계정의 모델 목록에 표시된
노력 단계 선택 기능을 추가했습니다. 시작 시 계정의 실제 모델 목록을 가져오고, 요청
형식과 맞지 않는 모델을 제외하며, 도구 실행이 이어지는 동안 선택한 모델과 노력 단계를
유지해 모델 선택 오류를 수정했습니다.

## 설치

Node.js 20.12 이상과 [Claude Code](https://code.claude.com/docs/en/setup),
[OpenAI Codex](https://developers.openai.com/codex/cli), AGY(Antigravity CLI) 중 하나가 필요합니다.

```bash
git clone https://github.com/must-lioncho/jev-router-effort.git
cd jev-router-effort
npm install
npm link
echo "JEV_API_KEY=..." > ~/.jev-router.env
jev-claude
# 또는 jev-codex
# AGY: jev-agy
# GLM: jev-glm
```

[TypeSafe](https://docs.typesafe.ai)에서 Jev API 키를 받을 수 있습니다. `jev-claude`와
`jev-codex`는 각각 기존 CLI의 로그인과 도구를 사용합니다. `JEV_API_KEY`가 없으면
라우팅 없이 해당 CLI를 실행합니다. `npm install -g jev-router`는 이 버전이 아닌
원작자의 npm 패키지를 설치합니다.

## GLM: `jev-glm`

`jev-glm`은 ZAI CLI(`glm` 런처, 없으면 `zai`)를 열고 매 턴 `glm-5.3-flash`, `glm-5.2`,
`glm-5.3` 중 모델과 z.ai `reasoning_effort`(`low`/`high`/`max`)를 Jev가 고릅니다. CLI 선택기에는
glm-4.6/4.5/4.5-air만 있어 프록시가 모델을 바꿔 보냅니다. thinking을 끄면(`T`) effort는 보내지 않습니다.
ZAI CLI는 응답 스트림이 끝나야 화면을 그리므로, 프록시가 매 턴 첫 응답으로 `echo '[Jev] routed this turn to …'`
도구 호출을 돌려주고 CLI가 그것을 즉시(약 0.4초) 표시합니다. 그 결과가 돌아오면 프록시가 그 교환을 지우고
실제 요청을 선택된 모델로 보내므로 모델은 이 줄을 읽지 않습니다.

## Antigravity: `jev-agy`

공식 CLI 이름인 `agy`에 맞춘 `jev-agy`로 원래 터미널 화면을 엽니다.
`jev -A`, `jev-a`, `jev-anti`, `jev-antigravity`도 같은 실행기입니다.

```bash
jev-agy
jev -A
jev-agy -p "코드에서 경쟁 상태를 찾아줘"
jev-antigravity --model gemini-3.1-pro-low -p "이 파일을 요약해줘"
```

`jev-agy`는 `/model`에 **Jev Router (auto)**를 추가하고 그 항목으로 시작합니다. 대화 중
사용자가 보내는 매 턴마다 Jev가 계정의 실제 Gemini 모델 목록(`gemini-3.8-flash-low`,
`gemini-3.1-pro-low`, `gemini-pro-agent` 등)에서 모델을 고르며, 답변 첫 줄에
`[Jev] routed this turn to …`로 결과를 보여 줍니다. 이 줄은 모델의 첫 응답을 기다리지 않고
Jev가 결정하는 즉시(약 0.5초) 표시됩니다. `-p`/`--print`도 같은 방식입니다.
다른 모델을 직접 고르면 라우팅이 멈추고, 다시 **Jev Router (auto)**를 고르면 재개됩니다.
도구 실행이 이어지는 동안에는 그 턴에 고른 모델을 유지합니다. AGY 라우팅은 현재 Gemini 모델만
대상으로 합니다. AGY를 거친 Claude는 서명 없이 다시 보낸 thinking 부분을 거부하므로 제외했습니다.

스크린샷을 로컬 경로로 붙여 넣으면(예: Orca의 `/var/folders/…/orca-paste-….png`) 새 턴에서
처리합니다. 프롬프트 안의 절대 경로 중 `png`, `jpg`, `jpeg`, `gif`, `webp`이고 실제로 있으며
7 MB 이하인 파일은 이미지 데이터로 전달 메시지에 붙이므로, 모델이 도구를 호출하지 않아도
이미지를 봅니다. Jev는 텍스트만 읽으므로, 프록시가 먼저 로그인된 계정 카탈로그의 빠른 이미지
지원 Gemini 모델(AGY가 제목 생성에 쓰는 모델, 작성 시점 `gemini-3.5-flash-lite`)에게 각
이미지를 짧게 설명하게 하고, Jev에는 경로를 `[image: <설명>]`으로 바꾼 프롬프트를 보냅니다.
설명은 라우팅 입력으로만 쓰이며 모델은 실제 이미지를 받습니다. 호출은 해당 턴과 같은 업스트림과
전달된 헤더를 씁니다. 측정 비용은 이미지가 있는 턴마다 1.7–2.9초(실제 실행 6회, 중앙값 약 2.2초)이며, 그만큼 결정 줄이 늦게 나타납니다. 이 단계는 4초 제한이 있고, 시간 초과나 오류가
나면 Jev에 `[image attached: <파일 이름>, not described]`를 보내고 그대로 라우팅합니다. 텍스트만
있는 턴에서는 추가 호출이 없습니다. AGY 기록에는 붙인 이미지가 남지 않으므로, 같은 대화의 도구 실행
이어가기와 이후 턴에서는 대화별 캐시에서 같은 바이트를 다시 붙이고(파일이 바뀌면 다시 읽고, 없어지면
뺍니다) 설명은 다시 요청하지 않습니다. 파일은 매직 바이트로 확인하며, 요청 하나에 붙는 이미지는 최신
턴부터 합계 약 14 MB까지입니다. 프록시가 캐시에 보관하는 이미지는 약 64 MB까지이며, 넘으면 가장 오래
쓰지 않은 대화의 캐시를 비웁니다. 이미지를 붙인 요청을 업스트림이 400, 413, 422로 거부하면 먼저 최신
턴의 이미지만 붙여(413이거나 여러 턴에 이미지가 있던 400일 때) 다시 보내고, 그래도 거부되면 이미지 없이
보냅니다. 429와 5xx 같은 다른 오류는 이미지를 유지한 채 기존 재시도 경로를 따릅니다.

AGY는 `CLOUD_CODE_URL` 환경 변수로 API 서버 주소를 바꿀 수 있습니다. `jev-agy`는 이 값을
자식 프로세스에만 지정해 로컬 프록시를 거치게 하며, AGY 설치 파일과 `settings.json`,
`config.json`은 바꾸지 않습니다. `jev-agy models` 같은 하위 명령은 프록시 없이 실행합니다.

Codex에서는 모델 선택기에서 **Jev Router**를 고르면 매 턴 모델을 선택합니다.
추론 노력은 기본값 `auto`에서 자동으로 선택하며, 계정의 모델 목록이 지원하는
단계를 직접 지정할 수도 있습니다. 특정 모델을 직접 고르면 자동 라우팅이 멈춥니다.
Claude Code에서는 `/model`에서 **Jev Router (auto model + effort)**를 선택하면
Jev가 모델과 추론 노력(`low`·`medium`·`high`)을 함께 고릅니다. 응답 첫 줄과 상태
표시줄에서 실제 선택 결과를 볼 수 있습니다. Claude Code의 기본 effort 선택 메뉴에는
외부 프로그램이 `auto` 항목을 추가할 수 없어, `/model`의 Jev Router가 자동 선택
스위치 역할을 합니다. 기본 effort 표시에는 Claude Code의 설정값이 남을 수 있습니다.

설정과 동작의 전체 설명은 [영어 README](README.md)를 참고하세요. 테스트는 `npm test`로
실행합니다. 이 버전의 문제는 [이 저장소의 이슈](https://github.com/must-lioncho/jev-router-effort/issues)에,
원작의 문제는 [원작 저장소의 이슈](https://github.com/gargpratyush/jev-router/issues)에 남겨 주세요.
