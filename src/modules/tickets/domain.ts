import type { Category } from '../../shared/categories.js';
import { CATEGORIES } from '../../shared/categories.js';
import { DomainError } from '../../shared/errors.js';
import type { Id } from '../../shared/ids.js';

/**
 * Життєвий цикл речі на ремонті:
 * queued → in_repair → fixed | not_fixable | needs_parts;  needs_parts → queued (принесли деталь)
 * queued | needs_parts → withdrawn (власник забрав без ремонту)
 */
export type TicketStatus =
  'queued' | 'in_repair' | 'fixed' | 'not_fixable' | 'needs_parts' | 'withdrawn';

export type Outcome = 'fixed' | 'not_fixable' | 'needs_parts';
export const OUTCOMES: readonly Outcome[] = ['fixed', 'not_fixable', 'needs_parts'];
export const ACTIVE_STATUSES: readonly TicketStatus[] = ['queued', 'in_repair', 'needs_parts'];

export const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  queued: ['in_repair', 'withdrawn'],
  in_repair: ['fixed', 'not_fixable', 'needs_parts'],
  needs_parts: ['queued', 'withdrawn'],
  fixed: [],
  not_fixable: [],
  withdrawn: [],
};

export interface Ticket {
  id: Id;
  eventId: Id;
  visitorName: string;
  itemDescription: string;
  category: Category;
  status: TicketStatus;
  volunteerId: Id | null;
  idempotencyKey: string;
  createdAt: Date;
}

export interface TicketTransition {
  ticketId: Id;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  volunteerId: Id | null;
  at: Date;
}

export interface RegistrationInput {
  eventId: Id;
  visitorName: string;
  itemDescription: string;
  category: Category;
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: TicketStatus, to: TicketStatus): void {
  if (!canTransition(from, to)) {
    throw new DomainError('CONFLICT', `Illegal transition ${from} -> ${to}`, 'ILLEGAL_TRANSITION');
  }
}

/** Майстер може взяти річ, лише якщо вміє лагодити її категорію. */
export function canRepair(skills: readonly Category[], category: Category): boolean {
  return skills.includes(category);
}

/** Той самий Idempotency-Key має право повторювати лише той самий запит (spec AC7). */
export function isSameRegistration(t: Ticket, input: RegistrationInput): boolean {
  return (
    t.eventId === input.eventId &&
    t.visitorName === input.visitorName.trim() &&
    t.itemDescription === input.itemDescription.trim() &&
    t.category === input.category
  );
}

export function validateRegistration(input: RegistrationInput): void {
  const name = input.visitorName.trim();
  const item = input.itemDescription.trim();
  if (name.length < 1 || name.length > 100) {
    throw new DomainError('VALIDATION', 'visitorName must be 1..100 chars');
  }
  if (item.length < 3 || item.length > 500) {
    throw new DomainError('VALIDATION', 'itemDescription must be 3..500 chars');
  }
  if (!(CATEGORIES as readonly string[]).includes(input.category)) {
    throw new DomainError('VALIDATION', `Unknown category ${input.category}`);
  }
}
