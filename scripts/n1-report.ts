/**
 * Скільки SQL-запитів робить GET /events/:id/queue залежно від кількості речей у сесії.
 * Якщо число росте разом з N — це N+1. Запуск: `make n1-report` (потрібна БД).
 */
import { createPostgresStorage } from '../src/adapters/postgres/index.js';
import { SEED_EVENTS, SEED_VOLUNTEERS } from '../src/adapters/seed-data.js';
import { createEventService } from '../src/modules/events/index.js';
import { createTicketService } from '../src/modules/tickets/index.js';
import { createVolunteerService } from '../src/modules/volunteers/index.js';
import { resetDatabase } from './db.js';

const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/repair_cafe';
const eventId = SEED_EVENTS[0]!.id;
const olena = SEED_VOLUNTEERS[0]!.id;

const lines: string[] = ['N речей | SQL-запитів на GET /events/:id/queue'];
for (const n of [1, 10, 50]) {
  await resetDatabase(url);
  const storage = createPostgresStorage(url);
  const events = createEventService(storage.events);
  const volunteers = createVolunteerService(storage.volunteers);
  const tickets = createTicketService(storage.tickets, events, volunteers);
  for (let i = 0; i < n; i++) {
    const { ticket } = await tickets.register({
      eventId,
      visitorName: `Гість ${i}`,
      itemDescription: 'Тостер не вмикається',
      category: 'appliances',
      idempotencyKey: `n1-${n}-${i}-xxxxxxxx`,
    });
    await tickets.claim(ticket.id, olena);
    await tickets.complete(ticket.id, olena, 'fixed');
  }
  const before = storage.db.queries;
  const queue = await tickets.queue(eventId);
  lines.push(
    `${String(n).padStart(7)} | ${storage.db.queries - before}   (рядків у відповіді: ${queue.length})`,
  );
  await storage.db.close();
}
// eslint-disable-next-line no-console
console.log(lines.join('\n'));
