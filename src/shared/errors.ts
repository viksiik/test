export type DomainErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT';

/** Помилка предметної області. Не знає про HTTP — мапінг у platform/http/errors.ts. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Джерело даних недоступне (БД лежить, таймаут). Клієнт може повторити запит пізніше. */
export class UnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UnavailableError';
  }
}
