/**
 * Бюджет SQL-запитів (standards/db.md, DB-04): кількість запитів на список не залежить від N.
 * Регресійний тест на знахідку №3 аудиту Лаби 2 (N+1 у дошці сесії).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPostgresStorage } from '../src/adapters/postgres/index.js';
import { createEventService } from '../src/modules/events/index.js';
import { createTicketService } from '../src/modules/tickets/index.js';
import { createVolunteerService } from '../src/modules/volunteers/index.js';
import { resetDatabase } from '../scripts/db.js';
import { EVENT_OPEN, OLENA, config } from './helpers.js';

test(
  'Q1 GET /events/:id/queue: ≤ 2 запити і для 1, і для 15 речей',
  { skip: config.storage !== 'postgres' },
  async () => {
    const counts: number[] = [];
    for (const n of [1, 15]) {
      await resetDatabase(config.databaseUrl);
      const storage = createPostgresStorage(config.databaseUrl);
      const events = createEventService(storage.events);
      const tickets = createTicketService(
        storage.tickets,
        events,
        createVolunteerService(storage.volunteers),
      );
      for (let i = 0; i < n; i++) {
        const { ticket } = await tickets.register({
          eventId: EVENT_OPEN,
          visitorName: `Гість ${i}`,
          itemDescription: 'Тостер не вмикається',
          category: 'appliances',
          idempotencyKey: `budget-${n}-${i}-xxxxxxxx`,
        });
        await tickets.claim(ticket.id, OLENA);
        await tickets.complete(ticket.id, OLENA, 'fixed');
      }
      const before = storage.db.queries;
      await tickets.queue(EVENT_OPEN);
      counts.push(storage.db.queries - before);
      await storage.db.close();
    }
    assert.ok(
      counts.every((c) => c <= 2),
      `queries per N: ${counts.join(', ')}`,
    );
  },
);
