import type { Id } from '../../shared/ids.js';
import type { Ticket, TicketStatus, TicketTransition } from './domain.js';

/** Операції, доступні всередині однієї транзакції. */
export interface TicketTx {
  /** Читає тікет І блокує його до кінця транзакції (конкурентні зміни чекають). */
  findById(id: Id): Promise<Ticket | null>;
  findByIdempotencyKey(key: string): Promise<Ticket | null>;
  /** Серіалізує реєстрації в одну сесію: друга чекає, поки перша закомітить. */
  lockEventForRegistration(eventId: Id): Promise<void>;
  countActiveInEvent(eventId: Id): Promise<number>;
  findInRepairByVolunteer(volunteerId: Id): Promise<Ticket | null>;
  /** 'duplicate' — тікет з таким idempotency_key уже вставила інша транзакція. */
  insert(ticket: Ticket): Promise<'inserted' | 'duplicate'>;
  /** Кидає DomainError CONFLICT VOLUNTEER_BUSY, якщо порушено інваріант I2 на рівні БД. */
  save(ticket: Ticket): Promise<void>;
  addTransition(t: TicketTransition): Promise<void>;
}

/** Read model дошки сесії: тікет + ім'я майстра одним запитом (без N+1). */
export interface QueueItem {
  ticket: Ticket;
  volunteerName: string | null;
}

export interface TicketStore {
  /** Виконати fn атомарно: або всі зміни, або жодної. */
  transaction<T>(fn: (tx: TicketTx) => Promise<T>): Promise<T>;
  findById(id: Id): Promise<Ticket | null>;
  listQueue(eventId: Id): Promise<QueueItem[]>;
  history(ticketId: Id): Promise<TicketTransition[]>;
}

export type { TicketStatus };
