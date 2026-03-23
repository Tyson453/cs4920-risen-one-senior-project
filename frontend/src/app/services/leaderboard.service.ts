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

  addScore(entry: LeaderboardEntry): void {
    const all = this.loadAll();
    all.push(entry);
    all.sort((a, b) => b.score - a.score);

    const byDifficulty = new Map<string, LeaderboardEntry[]>();
    for (const e of all) {
      const list = byDifficulty.get(e.difficulty) ?? [];
      list.push(e);
      byDifficulty.set(e.difficulty, list);
    }

    const trimmed: LeaderboardEntry[] = [];
    for (const entries of byDifficulty.values()) {
      trimmed.push(...entries.slice(0, this.MAX_ENTRIES));
    }

    this.saveAll(trimmed);
  }

  isHighScore(score: number, difficulty: Difficulty): boolean {
    const scores = this.getScores(difficulty);
    return scores.length < this.MAX_ENTRIES || score > (scores[scores.length - 1]?.score ?? 0);
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
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Ignore storage errors to avoid breaking score submission when localStorage is unavailable or full.
    }
  }
}
