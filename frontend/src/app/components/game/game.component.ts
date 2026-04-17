import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GameBoardComponent } from './game-board/game-board.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import { ScoreDisplayComponent } from './score-display/score-display.component';
import { GameEngineService } from '../../services/game-engine.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { AuthService } from '../../services/auth.service';
import {
  GameState, Difficulty, ActionMode, PlayerAction,
  Tile, LeaderboardEntry, GAME_CONSTANTS,
} from '../../models/game.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    GameBoardComponent,
    ControlPanelComponent,
    ScoreDisplayComponent,
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css',
})
export class GameComponent implements OnDestroy {
  gameState: GameState | null = null;
  selectedDifficulty: Difficulty = 'medium';
  currentMode: ActionMode = 'firefighter';
  pendingActions: PlayerAction[] = [];
  highlightedTiles = new Set<string>();
  tankerPreviewTiles = new Set<string>();
  leaderboard: LeaderboardEntry[] = [];
  isPersonalBest = false;
  isNewLeaderboardRecord = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private engine: GameEngineService,
    private leaderboardService: LeaderboardService,
    private authService: AuthService,
  ) {
    this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // --- Game Lifecycle ---

  startGame(): void {
    const seed = Date.now().toString();
    this.gameState = this.engine.initGame(this.selectedDifficulty, seed);
    this.pendingActions = [];
    this.highlightedTiles.clear();
    this.tankerPreviewTiles.clear();
    this.currentMode = 'firefighter';
    this.isPersonalBest = false;
    this.isNewLeaderboardRecord = false;
    this.startTimer();
  }

  nextTurn(): void {
    if (!this.gameState || this.gameState.phase !== 'PLANNING') return;

    this.gameState.phase = 'RESOLVING';
    this.gameState.elapsedTime = Date.now() - this.gameState.startTime;
    this.stopTimer();

    this.gameState = this.engine.resolveTurn(this.gameState, this.pendingActions);
    this.pendingActions = [];
    this.highlightedTiles.clear();
    this.tankerPreviewTiles.clear();

    if (this.gameState.phase === 'PLANNING') {
      this.startTimer();
    } else if (this.gameState.phase === 'GAME_OVER') {
      this.onGameOver();
    }
  }

  returnToMenu(): void {
    this.stopTimer();
    this.gameState = null;
    this.loadLeaderboard();
  }

  // --- Player Actions ---

  onTileClick(tile: Tile): void {
    if (!this.gameState || this.gameState.phase !== 'PLANNING') return;

    const coordKey = `${tile.x},${tile.y}`;

    const existingActionIndex = this.pendingActions.findIndex(
      a => a.x === tile.x && a.y === tile.y
    );

    if (existingActionIndex !== -1) {
      this.pendingActions.splice(existingActionIndex, 1);
      this.gameState.actionsRemaining++;
      this.highlightedTiles.delete(coordKey);
      return;
    }

    if (this.gameState.actionsRemaining <= 0) return;

    if (this.currentMode === 'firefighter') {
      if (!this.engine.canPlaceFirefighter(this.gameState, tile.x, tile.y)) return;
      this.pendingActions.push({ type: 'place_firefighter', x: tile.x, y: tile.y });
      this.gameState.actionsRemaining--;
      this.highlightedTiles.add(coordKey);
    } else {
      if (!this.engine.canPlaceAirTanker(this.gameState, tile.x, tile.y)) return;
      this.pendingActions.push({ type: 'air_tanker', x: tile.x, y: tile.y });
      this.gameState.actionsRemaining--;
      this.highlightedTiles.add(coordKey);
    }
  }

  onTileHover(tile: Tile | null): void {
    this.tankerPreviewTiles.clear();
    if (!tile || this.currentMode !== 'air_tanker' || !this.gameState) return;

    const area = this.engine.getTankerArea(tile.x, tile.y, this.gameState.gridSize);
    for (const coord of area) {
      this.tankerPreviewTiles.add(`${coord.x},${coord.y}`);
    }
  }

  onModeChange(mode: ActionMode): void {
    this.currentMode = mode;
    this.tankerPreviewTiles.clear();
  }

  undoAction(): void {
    if (!this.gameState || this.pendingActions.length === 0) return;
    const removed = this.pendingActions.pop()!;
    this.gameState.actionsRemaining++;
    this.highlightedTiles.delete(`${removed.x},${removed.y}`);
  }

  forceEndGame(): void {
    if (!this.gameState) return;
    this.gameState.phase = 'GAME_OVER';
    this.stopTimer();
    this.onGameOver();
  }

  // --- Timer ---

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.gameState && this.gameState.phase === 'PLANNING') {
        this.gameState.elapsedTime = Date.now() - this.gameState.startTime;
        if (this.gameState.elapsedTime >= GAME_CONSTANTS.TIME_LIMIT_MS) {
          this.gameState.phase = 'GAME_OVER';
          this.stopTimer();
          this.onGameOver();
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // --- Game Over & Leaderboard ---

  private async onGameOver(): Promise<void> {
    if (!this.gameState) return;

    this.pendingActions = [];
    this.highlightedTiles.clear();
    this.tankerPreviewTiles.clear();

    const user = this.authService.getCurrentUserSnapshot();
    if (!user) return;

    const finalScore = this.gameState.score;
    const priorTopScore =
      this.leaderboard.length > 0 ? this.leaderboard[0].score : Number.NEGATIVE_INFINITY;

    try {
      const result = await this.leaderboardService.submitScore(
        finalScore,
        this.gameState.difficulty,
        this.gameState.turn,
      );
      this.isPersonalBest = result.isNewHighScore;
      this.isNewLeaderboardRecord =
        result.isNewHighScore && finalScore > priorTopScore;
      if (result.isNewHighScore) {
        this.loadLeaderboard();
      }
    } catch {
      // Don't let leaderboard errors block the game-over screen
    }
  }

  private async loadLeaderboard(): Promise<void> {
    try {
      this.leaderboard = await this.leaderboardService.getScores();
    } catch {
      this.leaderboard = [];
    }
  }

  get isPlanning(): boolean {
    return this.gameState?.phase === 'PLANNING';
  }

  get isGameOver(): boolean {
    return this.gameState?.phase === 'GAME_OVER';
  }

  get gameOverReason(): string {
    if (!this.gameState) return '';
    if (this.gameState.burnedPercentage >= GAME_CONSTANTS.BURNED_THRESHOLD) {
      return 'Too much forest burned!';
    }
    if (this.gameState.elapsedTime >= GAME_CONSTANTS.TIME_LIMIT_MS) {
      return 'Time limit reached!';
    }
    const hasAnyFire = this.gameState.grid.some(row => row.some(t => t.state === 'fire'));
    if (!hasAnyFire) {
      return 'All fires extinguished! Great job!';
    }
    return 'Game Over';
  }
}
