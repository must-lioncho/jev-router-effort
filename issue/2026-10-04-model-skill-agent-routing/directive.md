# 구현 인계

담당자는 intend.md를 읽고 이번 이슈를 구현한다. 사용자 요청은 설계 제안만이 아니라 모델·스킬·선택적 에이전트 라우팅과 평가용 로그의 개선이다.

## 실행 환경과 보호

- 작업 폴더: <jev-router checkout>
- 실행: native Claude Code, jev-router-improver, claude-opus-5-5, 기본 effort. 실제 모델·effort는 결과에 기록한다.
- 체크포인트 commit: 6b9385eb44338f57c987276e980286131c90b776
- 체크포인트 ref: refs/jev/checkpoints/2026-10-04-model-skill-agent-routing/20261004T112604782Z-6b9385eb4433
- HEAD·index·사용자 파일을 바꾸지 않고 tracked 및 non-ignored untracked 파일을 보호했다. .zai/, Analyzer/private/, node_modules/ 등 ignored 경로는 보호하지 않는다.
- 초기 unrelated untracked: english_voice_tutor.html, server.mjs. 수정·삭제·커밋에 포함하지 않는다.
- 다른 세션도 저장소를 사용할 수 있다. 다른 작성자의 변경을 되돌리지 않는다. 충돌을 발견하면 중단하고 보고한다. 자동 worktree 생성과 파괴적 복구는 금지한다.

## 소유권

jev-router-improver가 이번 이슈의 단일 작성자다. issue/2026-10-04-model-skill-agent-routing/와 이 요구사항에 필요한 src/, bin/, Analyzer/, test/, docs/ 및 필요한 패키지 설정 변경만 소유한다. 먼저 기존 코드를 조사하고 이 문서에 정확한 변경 파일·검증 명령을 확정한다. 무관한 파일이나 과거 이슈를 수정하지 않는다. 새 에이전트/스킬 정의를 추가한다면 해당 빌드·독립 검토 규칙을 적용한다.

## 작업과 검증

CLAUDE.md, AGENTS.md, Intend.md, DIRECTIVE.md와 jev-router-improvement 스킬을 준수한다. 체크포인트 ref와 commit을 검증하고, 필요하면 작업 시작 상태의 새 체크포인트를 생성한다. 런타임 후보 검색·판단·적용과 로컬 이벤트 로그·라벨·평가 리포트를 구현한다. 기존 모델·effort 및 권한 계약을 보존한다. npm test, 새 회귀 검사, 무해한 실제 연동 검사를 실행한다. 비교 성능은 근거가 있을 때만 주장한다.

완료한 이번 이슈의 소유 경로만 scoped commit한다. push·publish·새 cron은 하지 않는다. result.md에 변경, 검사 결과와 exit code, 커밋, 로그와 평가 명령, 활성화 범위, 미검증 사항·블로커를 기록한다. 이 인계는 비감독 full handoff다. 별도 orchestration task나 worker_done을 만들지 말고 본인 터미널에서 결과를 보고한 뒤 종료한다.

## 확정한 변경 파일과 검사 (jev-router-improver, 2026-10-04)

실행 확인: native Claude Code, `jev-router-improver`, 시스템이 보고한 모델 `claude-opus-5-5`. Lion이 TUI에서 high effort를 확인했다. 이 세션은 effort 값을 직접 읽을 수 없다.

체크포인트 확인: `refs/jev/checkpoints/2026-10-04-model-skill-agent-routing/20261004T112604782Z-6b9385eb4433` → `6b9385eb44338f57c987276e980286131c90b776`. 부모는 HEAD `1147f74`이고 untracked `english_voice_tutor.html`, `server.mjs`를 담는다. 작업 시작 시 HEAD와 index는 변경되지 않았다.

단일 작성자 소유 파일:

- 신규 `src/capabilities.mjs`: Claude/Codex 스킬·에이전트 카탈로그 탐색(메타데이터와 해시만), 부서 프리픽스, 후보 축소, 명시 지정·opt-out 감지, 선택 판단, 요청 본문 적용, tool_use 관찰
- 신규 `src/routing-log.mjs`: 비공개 이벤트 로그, 마스킹, 라벨, 성능 리포트, 보존 기간 정리
- 신규 `src/capability-runtime.mjs`(구현 중 추가): Claude/Codex 프록시가 공유하는 재시도 연결, 결정 기록, 주입, tool 관찰
- `src/router.mjs`: 같은 JEV 호출에 skill/agent choice 질문 추가, 판단 모델·토큰 사용량 반환
- `src/proxy.mjs`: Claude 경로 적용과 이벤트 기록
- `src/codex-proxy.mjs`: Codex 경로 스킬 적용, 에이전트는 추천만
- `src/task-runtime.mjs`: 작업 ID 조회, 설정 노출, 새 작업 판별 함수 export만 추가
- `bin/jev-maintain.mjs`: `capabilities`, `routing-label`, `routing-report`, `routing-prune` 명령
- 신규 `test/capabilities.test.mjs`, `test/routing-log.test.mjs`
- 신규 `docs/capability-routing.md`, `docs/improvement-harness.md`의 활성화 설명, `package.json`의 `files`
- 이 이슈 폴더의 `directive.md`, `result.md`, `smoke.mjs`(실행 출력은 Git 제외 `private/`)

활성화: 기본값은 꺼짐이다. `~/.config/jev-router/runtime.json`의 `capabilityRouting.mode`가 `apply` 또는 `recommend`일 때만 동작한다. 이 이슈는 Lion의 사용자 설정을 바꾸지 않는다. 실제 검사는 임시 `JEV_RUNTIME_CONFIG`로 수행한다.

검사 명령:

```sh
node --test test/capabilities.test.mjs test/routing-log.test.mjs
npm test
node issue/2026-10-04-model-skill-agent-routing/smoke.mjs   # 실제 카탈로그 + 실제 JEV + 임시 상태 폴더
```
