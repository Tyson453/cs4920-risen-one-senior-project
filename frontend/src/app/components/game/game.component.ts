import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { GameBoardComponent } from './game-board/game-board.component';
import { ControlPanelComponent } from './control-panel/control-panel.component';
import { ScoreDisplayComponent } from './score-display/score-display.component';
import { GameEngineService } from '../../services/game-engine.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import {
  GameState, Difficulty, ActionMode, PlayerAction,
  Tile, LeaderboardEntry, GAME_CONSTANTS,
} from '../../models/game.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
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
  playerName = '';
  showNameInput = false;

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private engine: GameEngineService,
    private leaderboardService: LeaderboardService,
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
    this.showNameInput = false;
    this.startTimer();
  }

  nextTurn(): void {
    if (!this.gameState || this.gameState.phase !== 'PLANNING') return;

    this.gameState.phase = 'RESOLVING';
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
    this.showNameInput = false;
    this.loadLeaderboard();
  }

  // --- Player Actions ---

  onTileClick(tile: Tile): void {
    if (!this.gameState || this.gameState.phase !== 'PLANNING') return;
    if (this.gameState.actionsRemaining <= 0) return;

    if (this.currentMode === 'firefighter') {
      if (!this.engine.canPlaceFirefighter(this.gameState, tile.x, tile.y)) return;
      this.pendingActions.push({ type: 'place_firefighter', x: tile.x, y: tile.y });
      this.gameState.actionsRemaining--;
      this.highlightedTiles.add(`${tile.x},${tile.y}`);
    } else {
      if (!this.engine.canPlaceAirTanker(this.gameState, tile.x, tile.y)) return;
      this.pendingActions.push({ type: 'air_tanker', x: tile.x, y: tile.y });
      this.gameState.actionsRemaining--;
      this.highlightedTiles.add(`${tile.x},${tile.y}`);
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

  private onGameOver(): void {
    if (!this.gameState) return;
    if (this.leaderboardService.isHighScore(this.gameState.score, this.gameState.difficulty)) {
      this.showNameInput = true;
    }
  }

  submitScore(): void {
    if (!this.gameState || !this.playerName.trim()) return;
    this.leaderboardService.addScore({
      name: this.playerName.trim(),
      score: this.gameState.score,
      difficulty: this.gameState.difficulty,
      turn: this.gameState.turn,
      date: Date.now(),
    });
    this.showNameInput = false;
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.leaderboard = this.leaderboardService.getScores();
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
