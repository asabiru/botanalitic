# Claude Hooks

Hooks для policy enforcement (раздел 59.5 ТЗ).

## Recommended hooks

- `pre-edit-critical-paths`: блокировать edits в money modules без linked Founder decision/RFC reference в commit message или PR description.
- `post-edit-money-files`: предложить запустить /money-feature-check.
- `post-edit-ledger`: напомнить про tests и audit log.
- `post-edit-decision-board`: rebuild summary view.
- `pre-commit-marketing`: проверить запрещенные phrases (см. .claude/settings.json policies.forbiddenPhrases).

## Status

TODO: реализовать после установки Claude Code в проекте.
