export class ApplicationError extends Error {
  constructor(message: string, public data: Record<string, any> = {}) {
    super(message);
  }
}

export class UserError extends ApplicationError {}

export class BookingBlackoutError extends UserError {
  blackout?: Record<string, any>

  constructor(message: string, blackout?: Record<string, any>) {
    super(message, blackout ? { blackout } : {})
    this.name = 'BookingBlackoutError'
    this.blackout = blackout
  }
}