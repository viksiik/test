# DEFENSE — Завдання 1: Фундамент і структура застосунку

**Що реалізовано.** Каркас Repair Café — черги ремонтів для волонтерських зустрічей — з модульною
структурою, виведеною зі [spec.md](spec.md), власними стандартами ([standards/](standards/)) і
конвеєром якості, де межі модулів перевіряються машинно, а hook реально блокує брудний коміт.

**Топ-3 розбіжності зі spec (знайдено → виправлено правилом/spec)** — деталі: [docs/audit-lab1.md](docs/audit-lab1.md)

1. `tickets → volunteers/ports` — обхід публічного API модуля (R1). → `VolunteerService` + правило `module-public-api-only`. Коміт: `<sha>`
2. `tickets/domain → volunteers/domain` через `Category` — помилка в самій spec: спільне поняття без власника. → правка spec §1, `Category` у `shared`. Коміт: `<sha>`
3. `tickets/domain → fastify` — доменне правило знало про HTTP (R2). → `DomainError` + правило `domain-is-pure` + тест. Коміт: `<sha>`

Вихід перевірок до виправлень: [reports/lab1-audit-before.txt](reports/lab1-audit-before.txt).

**Ключове рішення.** Модульний моноліт з межами, які перевіряє dependency-cruiser
([adr/0001](adr/0001-modular-monolith.md)). Альтернативи: шари по проєкту (фіча розмазана, межі
не перевірні) і мікросервіси («перевір навичку + візьми річ» стає розподіленою операцією). Стек —
[adr/0002](adr/0002-fastify-typescript.md); розподіл перевірок commit/push — [adr/0003](adr/0003-quality-gate.md).

**Перевірка.**

| Команда                     | Результат                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `make check`                | формат ✔ · ESLint 0 помилок · tsc ✔ · `no dependency violations found` · smoke 5/5 · збірка ✔ |
| `make hook-demo`            | `OK: hook заблокував брудний коміт`                                                           |
| `make run` + `make version` | `{"name":"repair-cafe","version":"<sha>"}`                                                    |

Версія `/version`: `<sha>` · Шлях: з AI, слід — [ai/](ai/).
