/**
 * Міграції, seed і скидання БД. Запуск: `make migrate`, `make seed`.
 * Міграції — прості .sql у migrations/, застосовуються по порядку, кожна в транзакції.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { SEED_EVENTS, SEED_VOLUNTEERS } from '../src/adapters/seed-data.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));
const defaultUrl = () =>
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/repair_cafe';

export async function migrate(url = defaultUrl()): Promise<string[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const done = new Set(
      (await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
        (r) => r.name,
      ),
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
    const applied: string[] = [];
    for (const f of files.filter((x) => !done.has(x))) {
      const sql = await readFile(MIGRATIONS_DIR + f, 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        applied.push(f);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f} failed: ${(err as Error).message}`, { cause: err });
      }
    }
    return applied;
  } finally {
    await client.end();
  }
}

/** Ідемпотентний seed: повторний запуск нічого не дублює. */
export async function seed(url = defaultUrl()): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    for (const e of SEED_EVENTS) {
      await client.query(
        `INSERT INTO events (id, title, starts_at, ends_at, ticket_limit, status)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, ticket_limit = EXCLUDED.ticket_limit,
           status = EXCLUDED.status, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at`,
        [e.id, e.title, e.startsAt, e.endsAt, e.ticketLimit, e.status],
      );
    }
    for (const v of SEED_VOLUNTEERS) {
      await client.query(
        `INSERT INTO volunteers (id, name, skills) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, skills = EXCLUDED.skills`,
        [v.id, v.name, v.skills],
      );
    }
  } finally {
    await client.end();
  }
}

/** Для тестів: порожня черга + свіжий seed. */
export async function resetDatabase(url = defaultUrl()): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('TRUNCATE ticket_transitions, tickets RESTART IDENTITY CASCADE');
  } finally {
    await client.end();
  }
  await seed(url);
}

const cmd = process.argv[2];
if (cmd === 'migrate') {
  const applied = await migrate();
  // eslint-disable-next-line no-console
  console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date');
} else if (cmd === 'seed') {
  await seed();
  // eslint-disable-next-line no-console
  console.log(`seeded ${SEED_EVENTS.length} events, ${SEED_VOLUNTEERS.length} volunteers`);
}
