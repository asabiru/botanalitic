# /adr

Создать новый ADR по шаблону docs/adr/_template.md.

Inputs:
- title (required)
- context

Steps:
1. Найти следующий ADR-XXX номер.
2. Скопировать docs/adr/_template.md в docs/adr/XXX-{slug}.md.
3. Заполнить Context, Options, Decision, Consequences.
4. Создать запись в docs/decision-board.md.
