# Spec — Repair Café

**Що і навіщо.** HTTP API черги ремонтів на сесіях Repair Café. Інваріанти: (I1) у речі в роботі рівно
один майстер, і він уміє лагодити її категорію; (I2) майстер має ≤ 1 річ `in_repair`; (I3) активних
речей у сесії ≤ `ticket_limit`; (I4) повтор запиту з тим самим `Idempotency-Key` не створює дубль, а
той самий ключ з іншим тілом — помилка. **Інваріанти I2–I4 тримає БД** (lock / constraint), а не лише код.

## 1. Модулі та межі

`modules/{events,volunteers,tickets}` — domain → service → ports. `adapters/{memory,postgres}` — реалізації
портів; `app.ts` обирає одну за `STORAGE`. `platform/http` — маршрути й мапінг помилок. `shared` — `DomainError`,
`UnavailableError`, `Id`, `Category`. Правила R1–R6 (`make deps`): модуль бачать лише через `index.ts`;
`domain.ts` залежить лише від `shared`; модулі не знають про `platform`/`adapters`; адаптери — тільки з `app.ts`.
Read model, що з'єднує таблиці двох модулів (дошка сесії), живе в адаптері — модулі один одного не імпортують.

## 2. Дані

Схема — [migrations/](migrations/): `events`, `volunteers`, `tickets`, `ticket_transitions` (історія, не видаляється).
Ключові обмеження: `tickets.idempotency_key UNIQUE` (I4), частковий унікальний індекс
`tickets(volunteer_id) WHERE status='in_repair'` (I2), CHECK на статуси й довжини. Міграції не редагуються після застосування.

## 3. Сценарії → очікувана поведінка (HTTP)

| #     | Сценарій                                        | Запити (в одній транзакції)                                                                   | Успіх            | Помилки                                                                  |
| ----- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| S1–S2 | `POST /events/:id/tickets` + `Idempotency-Key`  | ключ? → `events FOR UPDATE` → count активних → `INSERT … ON CONFLICT DO NOTHING` → transition | 201 / 200 повтор | 400 схема, 404 сесія, 409 `closed`/`QUEUE_FULL`/`IDEMPOTENCY_KEY_REUSED` |
| S5    | `POST /tickets/:id/claim`                       | `tickets FOR UPDATE` → навичка → перехід → `UPDATE` (I2 — індекс) → transition                | 200 `in_repair`  | 400 навичка, 404, 409 `VOLUNTEER_BUSY`/`ILLEGAL_TRANSITION`              |
| S6–S8 | `POST /tickets/:id/{complete,requeue,withdraw}` | `FOR UPDATE` → перевірка переходу/виконавця → `UPDATE` → transition                           | 200              | 409 `NOT_ASSIGNEE`/`ILLEGAL_TRANSITION`                                  |
| S10   | `GET /events/:id/queue`                         | один `SELECT … LEFT JOIN volunteers`                                                          | 200              | 404                                                                      |

## 4. Збої джерела даних

БД недоступна / таймаут (5 с statement, 2 с connect) → **503 + `Retry-After: 5`**, деталі не витікають, процес живий;
`/health` — liveness (200), `/health/ready` — readiness (503). Deadlock/serialization → транзакція повторюється
цілком ≤ 3 разів з backoff. Клієнт повторює POST з тим самим ключем — дубля не буде (I4).

## 5. Критерії прийняття (Лаба 2)

- [x] AC6 S1–S10 зелені і на статиці, і на БД — `make scenarios`, `make scenarios-db`.
- [x] AC7 Той самий ключ з іншим тілом → 409 `IDEMPOTENCY_KEY_REUSED` — тест C5.
- [x] AC8 I1–I4 під паралельними запитами — C1–C4, `make race` 20/20.
- [x] AC9 Дошка сесії: ≤ 2 SQL-запити незалежно від N — Q1, `make n1-report`.
- [x] AC10 Падіння БД → 503 + Retry-After, readiness 503, liveness 200 — F1–F3, `make chaos`.
- [x] AC11 Deadlock → повтор, інші помилки — без повтору — R1–R3.
