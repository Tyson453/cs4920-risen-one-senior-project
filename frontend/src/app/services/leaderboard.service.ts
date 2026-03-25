import { Injectable } from '@angular/core';
import { Difficulty, LeaderboardEntry } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly STORAGE_KEY = 'fire_planner_leaderboard';
  private readonly MAX_ENTRIES = 10;

  getScores(difficulty?: Difficulty): LeaderboardEntry[] {
    const all = this.loadAll();
    const filtered = difficulty ? all.filter(e => e.difficulty === difficulty) : all;
    return filtered.sort((a, b) => b.score - a.score).slice(0, this.MAX_ENTRIES);
  }

  /**
   * Upsert a score for the given user + difficulty.
   * If an entry already exists for this user on this difficulty, it is only
   * replaced when the new score is strictly higher. This ensures each user
   * appears at most once per difficulty on the board.
   */
  addScore(entry: LeaderboardEntry): void {
    const all = this.loadAll();
    const existingIndex = all.findIndex(
      e => e.userId === entry.userId && e.difficulty === entry.difficulty
    );

    if (existingIndex !== -1) {
      if (entry.score > all[existingIndex].score) {
        all[existingIndex] = entry;
      } else {
        return; // existing score is better — do nothing
      }
    } else {
      all.push(entry);
    }

    this.saveAll(all);
  }

  /**
   * Returns true when the given score beats the user's current personal best
   * for that difficulty (or they have no entry yet).
   */
  isPersonalBest(userId: string, score: number, difficulty: Difficulty): boolean {
    const all = this.loadAll();
    const existing = all.find(e => e.userId === userId && e.difficulty === difficulty);
    return !existing || score > existing.score;
  }

  private loadAll(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveAll(entries: LeaderboardEntry[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
  }
}
