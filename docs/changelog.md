# Changelog

Все заметные изменения в проекте документируются в этом файле.

---

## 2025-05-03

### Девопс — DevOps Engineer
- Создан Dockerfile (multi-stage build)
- Создан docker-compose.yml для локальной разработки
- Настроен CI pipeline (.github/workflows/ci.yml)
- Настроен ESLint + Prettier
- Добавлены скрипты lint, format

### Призма — DB Architect
- Добавлен PostgreSQL + Prisma ORM
- Создана schema с моделями User, Order, Payment, Delivery
- Создан repository-слой
- Заменено файловое хранилище на БД
- Добавлен docker-compose.yml с PostgreSQL
- Обратная совместимость: файловый fallback при отсутствии DATABASE_URL

### Вебхук — Payment Engineer
- Добавлена верификация IP-адресов ЮKassa
- Реализована идемпотентная обработка webhook
- Добавлена retry-логика отправки аналитики
- Добавлено структурированное логирование webhook events
- Добавлена zod-валидация тела webhook
- Добавлено уведомление админа при ошибках

### Аналитик — AI Engineer
- Подключен OpenAI SDK
- Созданы prompt templates для каждого класса активов
- Реализован structured output (обзор, уровни, сценарии, риски, идея для клиента)
- Добавлен fallback на demo-генератор если нет API key
- Контроль max_tokens и error handling
- Disclaimer в каждом ответе
