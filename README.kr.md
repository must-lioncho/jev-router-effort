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

Node.js 20.12 이상과 [Claude Code](https://code.claude.com/docs/en/setup) 또는
[OpenAI Codex](https://developers.openai.com/codex/cli)가 필요합니다.

```bash
git clone https://github.com/must-lioncho/jev-router-effort.git
cd jev-router-effort
npm install
npm link
echo "JEV_API_KEY=..." > ~/.jev-router.env
jev-claude
# 또는 jev-codex
```

[TypeSafe](https://docs.typesafe.ai)에서 Jev API 키를 받을 수 있습니다. `jev-claude`와
`jev-codex`는 각각 기존 CLI의 로그인과 도구를 사용합니다. `JEV_API_KEY`가 없으면
라우팅 없이 해당 CLI를 실행합니다. `npm install -g jev-router`는 이 버전이 아닌
원작자의 npm 패키지를 설치합니다.

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
