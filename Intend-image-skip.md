# Intend: image turns only pay for a description when the text alone is too thin to route

Date: 2026-09-29.

Every CLI (`jev-claude`, `jev-codex`, `jev-agy`) now describes a new turn's images with its
cheapest vision model before asking Jev, because Jev reads text only. That description costs
up to 4 s on every image turn. The user wants the router to *feel* fast.

## Rule (user's words, decided)

- **No image** → route immediately (Jev alone, ~0.3 s). Unchanged.
- **Image + prompt text ≥ 200 characters** → the text already explains the task well enough
  for Jev to judge difficulty. Skip the description; route immediately.
- **Image + prompt text < 200 characters** (e.g. "이미지 확인해줘", "이거 봐봐, 이런 게 있잖아")
  → the text alone cannot tell Jev what the task is. Describe the image first, then route on
  text + description.

## Required outcome

- One shared threshold: 200 characters, counted on the user's own text after the proxy's
  existing cleanup (system reminders removed). Image file paths written into the prompt
  (AGY/Orca pastes such as `/var/folders/…/orca-paste-….png`) do not count toward the 200,
  since they say nothing about the task and would otherwise push a 3-word prompt over the
  line.
- Applies identically to Claude, Codex and AGY.
- When the description is skipped, Jev still learns an image is attached
  (`[image N attached, not described]` / AGY's existing `[image attached: <name>, not described]`).
- The working model always receives the original images, described or not.
- Unit tests for both sides of the threshold on each CLI; all existing tests stay green.

## Not in scope

- Changing the 200 value per CLI, or making it configurable by the user.
- Live-account verification (tracked separately from the image-description change).
