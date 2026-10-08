# Аудит Лаби 1: структура проти spec

**Метод.** Правила R1–R5 зі spec §1 записані як машинні перевірки (`.dependency-cruiser.cjs`,
ESLint `no-restricted-properties`) і прогнані по першому чорновику структури: 4 порушення
архітектури + 2 помилки лінтера. Сирий вихід «до» — [reports/lab1-audit-before.txt](../reports/lab1-audit-before.txt),
«після» — `make check` (`no dependency violations found`).

## Топ-3 неправильні залежності

### 1. `tickets/service → volunteers/ports` (порушує R1)

**Що було:** сервіс тікетів отримував `VolunteerRepository`, сам робив `findById` і перевірку на `null`.
**Чому погано:** tickets знає, _як volunteers зберігає дані_; «майстра не знайдено» продубльовано
у двох модулях; у Лабі 2 зміна сховища волонтерів зламала б тікети.
**Виправлення:** залежність від публічного `VolunteerService` через `volunteers/index.ts`
(`getVolunteer` сам кидає `NOT_FOUND`). **Закріплено** правилом `module-public-api-only`.

### 2. `tickets/domain → volunteers/domain` заради типу `Category` (порушує R1 і R2)

**Що було:** категорії речей були оголошені в модулі volunteers, а домен тікетів їх імпортував.
**Чому погано:** це найцікавіша знахідка — вона виявила **помилку в spec, а не лише в коді**.
`Category` — поняття, яке потрібне обом доменам (що зламалось / що вміє майстер), і жоден модуль
ним не «володіє». Імпорт через `volunteers/index` теж не рятує: тоді домен тікетів залежить від
модуля волонтерів, і R2 порушено.
**Виправлення через spec:** у spec §1 додано правило «поняття, спільне для доменів двох модулів, живе
в `shared`» і `Category` в опис `shared`; тип перенесено в `shared/categories.ts`.
**Закріплено** правилами `domain-is-pure` + `module-public-api-only`.

### 3. `tickets/domain → fastify` (порушує R2)

**Що було:** `assertTransition` кидав `FastifyError` зі `statusCode = 409`.
**Чому погано:** машина статусів — чисте доменне правило, а знало про HTTP; його не можна
перевикористати (наприклад, у CLI для організатора) і HTTP-статус вирішував не той шар.
**Виправлення:** `DomainError('CONFLICT')`, мапінг у статус — `platform/http/errors.ts`.
**Закріплено** правилом `domain-is-pure` + smoke-тест на тип помилки.

## Поза топ-3

`platform/version → process.env` — конфіг поза `config`. Виправлено: sha через `AppConfig`;
закріплено ESLint-правилом (C-07).
