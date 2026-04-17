import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Difficulty, LeaderboardEntry, SubmitScoreResponse } from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getScores(): Promise<LeaderboardEntry[]> {
    return firstValueFrom(
      this.http.get<LeaderboardEntry[]>(`${this.apiUrl}/leaderboard/scores`)
    );
  }

  submitScore(score: number, difficulty: Difficulty, turn: number): Promise<SubmitScoreResponse> {
    return firstValueFrom(
      this.http.post<SubmitScoreResponse>(`${this.apiUrl}/leaderboard/scores`, {
        score,
        difficulty,
        turn,
      })
    );
  }
}
