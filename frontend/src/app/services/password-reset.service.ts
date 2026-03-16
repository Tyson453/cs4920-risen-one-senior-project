import { Injectable } from '@angular/core';

interface ResetContext {
  username: string;
  code: string;
}

const STORAGE_KEY = 'passwordResetContext';

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  setResetContext(username: string, code: string): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ username, code }));
  }

  getResetContext(): ResetContext | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const ctx = JSON.parse(raw);
      if (ctx?.username && ctx?.code) return ctx;
      return null;
    } catch {
      return null;
    }
  }

  hasResetContext(): boolean {
    return this.getResetContext() !== null;
  }

  clearResetContext(): void {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
