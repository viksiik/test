#!/usr/bin/env bash
# Гонки недетерміновані: один зелений прогін нічого не доводить. Проганяємо конкурентні сценарії N разів.
set -u
N=${N:-20}; fails=0
for i in $(seq 1 "$N"); do
  STORAGE=postgres node --import tsx --test test/concurrency.test.ts >/tmp/race.log 2>&1 || { fails=$((fails+1)); grep -E 'codes|got' /tmp/race.log; }
done
echo "concurrency suite: $((N-fails))/$N прогонів зелені"
[ "$fails" -eq 0 ]
