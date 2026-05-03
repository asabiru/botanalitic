# Changelog

## 2025-05-03

### Вебхук — Payment Engineer

- Добавлена верификация IP-адресов ЮKassa
- Реализована идемпотентная обработка webhook
- Добавлена retry-логика отправки аналитики
- Добавлено структурированное логирование webhook events
- Добавлена zod-валидация тела webhook
- Добавлено уведомление админа при ошибках

Новые файлы:
- `services/telegram-bot/src/middleware/webhook-validation.ts`
- `services/telegram-bot/src/utils/logger.ts`

Изменённые файлы:
- `services/telegram-bot/src/server.ts`
