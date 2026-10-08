#!/usr/bin/env bash
# Живий збій БД: сервер працює, PostgreSQL зупиняємо й піднімаємо (spec §4, AC11).
# Потрібно: `make db-up migrate seed` і запущений `STORAGE=postgres make run` в іншому терміналі.
set -u
URL=${URL:-http://localhost:3000}
EV=11111111-1111-4111-8111-111111111111
KEY="chaos-$(date +%s)-xxxxxxxx"
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
post() {
  code -X POST "$URL/events/$EV/tickets" -H "idempotency-key: $KEY" -H 'content-type: application/json' \
    -d '{"visitorName":"Ірина","itemDescription":"Чайник не гріє","category":"appliances"}'
}
echo "1) БД працює:   ready=$(code "$URL/health/ready")"
docker compose stop db >/dev/null 2>&1
echo "2) БД зупинено: live=$(code "$URL/health") ready=$(code "$URL/health/ready") POST=$(post)  (очікуємо 200 503 503)"
docker compose start db >/dev/null 2>&1
until [ "$(code "$URL/health/ready")" = 200 ]; do sleep 1; done
echo "3) БД піднято:  POST-повтор=$(post) ще раз=$(post)  (очікуємо 201 200 — один тікет, без дубля)"
