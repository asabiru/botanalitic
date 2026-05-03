# /incident-report

Создать incident report по шаблону раздела 54 ТЗ.

Inputs:
- severity (SEV-1..4)
- title

Output:
- Создать docs/runbooks/incidents/INC-YYYYMMDD-XX.md.
- Заполнить: severity, owner, technical owner, comms owner, timeline, impact, resolution, postmortem TODO.
- Update docs/known-risks-register.md если применимо.
