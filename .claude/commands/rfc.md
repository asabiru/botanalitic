# /rfc

Создать новый RFC по шаблону docs/rfc/_template.md.

Inputs:
- title (required)
- author
- impacted modules

Steps:
1. Найти следующий свободный RFC-XXX номер.
2. Скопировать docs/rfc/_template.md в docs/rfc/XXX-{slug}.md.
3. Заполнить базовые поля.
4. Создать запись в docs/decision-board.md.
5. Открыть PR с label rfc + founder-approval-required.
