export type UserSession = {
  selectedInstrumentId?: string;
  ticker?: string;
  investorProfile?: string;
  lastPaymentId?: string;
};

export class SessionStore {
  private sessions = new Map<number, UserSession>();

  get(userId: number): UserSession {
    return this.sessions.get(userId) ?? {};
  }

  patch(userId: number, patch: Partial<UserSession>) {
    const current = this.get(userId);
    this.sessions.set(userId, { ...current, ...patch });
  }

  clear(userId: number) {
    this.sessions.delete(userId);
  }
}