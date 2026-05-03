# Changelog

Все заметные изменения в проекте документируются в этом файле.

---

## [Unreleased]

### Призма — DB Architect
- Добавлен PostgreSQL + Prisma ORM
- Создана schema с моделями User, Order, Payment, Delivery
- Создан repository-слой
- Заменено файловое хранилище на БД
- Добавлен docker-compose.yml с PostgreSQL
- Обратная совместимость: файловый fallback при отсутствии DATABASE_URL
