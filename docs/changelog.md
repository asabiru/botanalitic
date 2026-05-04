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
