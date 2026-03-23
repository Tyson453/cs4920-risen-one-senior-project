import { Injectable } from '@angular/core';
import {
  Tile, GameState, PlayerAction, Difficulty, Intensity, RiskLevel,
  TurnSummary, DIFFICULTY_CONFIGS, GAME_CONSTANTS,
} from '../models/game.model';

@Injectable({ providedIn: 'root' })
export class GameEngineService {

  // --- Seeded PRNG (mulberry32) ---

  private hashSeed(seed: string): number {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
    return h >>> 0;
  }

  private nextRng(state: number): { value: number; state: number } {
    let t = (state + 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const next = ((t ^ (t >>> 14)) >>> 0);
    return { value: next / 4294967296, state: next };
  }

  private random(gameState: GameState): { value: number; rngState: number } {
    const { value, state } = this.nextRng(gameState.rngState);
    return { value, rngState: state };
  }

  // --- Grid Initialization ---

  initGame(difficulty: Difficulty, seed: string): GameState {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const { gridSize, initialFires, initialHighIntensity } = config;
    const grid = this.createEmptyGrid(gridSize);

    let rngState = this.hashSeed(seed);

    const allCoords: { x: number; y: number }[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        allCoords.push({ x, y });
      }
    }

    // Fisher-Yates shuffle to pick fire positions
    for (let i = allCoords.length - 1; i > 0; i--) {
      const r = this.nextRng(rngState);
      rngState = r.state;
      const j = Math.floor(r.value * (i + 1));
      [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
    }

    const firePositions = allCoords.slice(0, initialFires);
    for (let i = 0; i < firePositions.length; i++) {
      const { x, y } = firePositions[i];
      grid[y][x].state = 'fire';
      grid[y][x].intensity = i < initialHighIntensity ? 2 : 1;
    }

    const state: GameState = {
      grid,
      gridSize,
      turn: 1,
      score: 0,
      actionsPerTurn: GAME_CONSTANTS.ACTIONS_PER_TURN,
      actionsRemaining: GAME_CONSTANTS.ACTIONS_PER_TURN,
      carriedOverActions: 0,
      maxCarryOver: GAME_CONSTANTS.MAX_CARRY_OVER,
      burnedPercentage: 0,
      seed,
      rngState,
      startTime: Date.now(),
      elapsedTime: 0,
      phase: 'PLANNING',
      difficulty,
      totalFiresExtinguished: 0,
      totalUnusedActions: 0,
      turnSummary: { firesSpread: 0, firesContained: 0, tilesNewlyBurned: 0 },
    };

    this.recalcRiskLevels(state);
    return state;
  }

  private createEmptyGrid(size: number): Tile[][] {
    const grid: Tile[][] = [];
    for (let y = 0; y < size; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < size; x++) {
        row.push({ x, y, state: 'safe', intensity: 0, riskLevel: 0 });
      }
      grid.push(row);
    }
    return grid;
  }

  // --- Turn Resolution Pipeline ---

  resolveTurn(state: GameState, actions: PlayerAction[]): GameState {
    let s = this.deepCopy(state);
    const summary: TurnSummary = { firesSpread: 0, firesContained: 0, tilesNewlyBurned: 0 };

    // Track which tiles had fire reduced this turn
    const reducedTiles = new Set<string>();

    // 1. Apply player actions
    s = this.applyPlayerActions(s, actions);

    // 2. Firefighter effects
    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        const tile = s.grid[y][x];
        if (tile.unit === 'firefighter' && tile.unitTurnsRemaining !== undefined) {
          if (tile.state === 'fire' && tile.intensity > 0) {
            const oldIntensity = tile.intensity;
            tile.intensity = Math.max(0, tile.intensity - GAME_CONSTANTS.FIREFIGHTER_INTENSITY_REDUCTION) as Intensity;
            if (tile.intensity === 0) {
              tile.state = 'safe';
              summary.firesContained++;
              s.totalFiresExtinguished++;
            }
            if (tile.intensity < oldIntensity) {
              reducedTiles.add(`${x},${y}`);
            }
          }
          tile.unitTurnsRemaining--;
          if (tile.unitTurnsRemaining <= 0) {
            delete tile.unit;
            delete tile.unitTurnsRemaining;
          }
        }
      }
    }

    // 3. Fire spread
    const spreadTargets: { x: number; y: number }[] = [];
    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];

    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        const tile = s.grid[y][x];
        if (tile.state !== 'fire') continue;

        const hasFirefighter = tile.unit === 'firefighter';
        const baseProb = GAME_CONSTANTS.BASE_SPREAD_PROB[tile.intensity] ?? 0;
        const turnScaling = GAME_CONSTANTS.SPREAD_SCALING_PER_TURN * s.turn;
        let spreadProb = baseProb + turnScaling;
        if (hasFirefighter) spreadProb *= 0.5;
        spreadProb = Math.min(spreadProb, 0.9);

        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= s.gridSize || ny < 0 || ny >= s.gridSize) continue;
          const neighbor = s.grid[ny][nx];
          if (neighbor.state !== 'safe') continue;
          if (neighbor.wet) continue;

          const r = this.nextRng(s.rngState);
          s.rngState = r.state;
          if (r.value < spreadProb) {
            spreadTargets.push({ x: nx, y: ny });
          }
        }
      }
    }

    const spreadSet = new Set(spreadTargets.map(t => `${t.x},${t.y}`));
    for (const key of spreadSet) {
      const [sx, sy] = key.split(',').map(Number);
      s.grid[sy][sx].state = 'fire';
      s.grid[sy][sx].intensity = 1;
      summary.firesSpread++;
    }

    // 4. Intensity update for existing fire tiles (not newly spread, not reduced)
    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        const tile = s.grid[y][x];
        if (tile.state !== 'fire') continue;
        if (spreadSet.has(`${x},${y}`)) continue;
        if (reducedTiles.has(`${x},${y}`)) continue;
        if (tile.intensity < 3) {
          tile.intensity = (tile.intensity + 1) as Intensity;
        }
      }
    }

    // 5. Burned conversion: tiles that have been at intensity 3 get burned
    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        const tile = s.grid[y][x];
        if (tile.state === 'fire' && tile.intensity >= 3 && !reducedTiles.has(`${x},${y}`) && !spreadSet.has(`${x},${y}`)) {
          const r = this.nextRng(s.rngState);
          s.rngState = r.state;
          if (r.value < 0.35) {
            tile.state = 'burned';
            tile.intensity = 0;
            delete tile.unit;
            delete tile.unitTurnsRemaining;
            summary.tilesNewlyBurned++;
          }
        }
      }
    }

    // Clear wet status
    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        s.grid[y][x].wet = false;
      }
    }

    // 6. Recalculate risk levels
    this.recalcRiskLevels(s);

    // 7. Carry-over unused actions
    const unusedActions = s.actionsRemaining;
    s.totalUnusedActions += unusedActions;
    s.carriedOverActions = Math.min(unusedActions, s.maxCarryOver);

    // 8. Update score
    s.score = this.calculateScore(s);

    // 9. Update burned percentage
    const totalTiles = s.gridSize * s.gridSize;
    let burnedCount = 0;
    for (let y = 0; y < s.gridSize; y++) {
      for (let x = 0; x < s.gridSize; x++) {
        if (s.grid[y][x].state === 'burned') burnedCount++;
      }
    }
    s.burnedPercentage = burnedCount / totalTiles;

    // 10. Store summary and advance turn
    s.turnSummary = summary;
    s.turn++;
    s.actionsRemaining = s.actionsPerTurn + s.carriedOverActions;

    // 11. Check end conditions
    if (s.burnedPercentage >= GAME_CONSTANTS.BURNED_THRESHOLD) {
      s.phase = 'GAME_OVER';
    } else if (s.elapsedTime >= GAME_CONSTANTS.TIME_LIMIT_MS) {
      s.phase = 'GAME_OVER';
    } else {
      s.phase = 'PLANNING';
    }

    // Check if all fires are out and no more fire can spread (win condition)
    const hasAnyFire = s.grid.some(row => row.some(t => t.state === 'fire'));
    if (!hasAnyFire && s.phase !== 'GAME_OVER') {
      s.phase = 'GAME_OVER';
    }

    return s;
  }

  // --- Player Action Application ---

  private applyPlayerActions(state: GameState, actions: PlayerAction[]): GameState {
    for (const action of actions) {
      switch (action.type) {
        case 'place_firefighter':
          this.placeFirefighter(state, action.x, action.y);
          break;
        case 'air_tanker':
          this.applyAirTanker(state, action.x, action.y);
          break;
      }
    }
    return state;
  }

  private placeFirefighter(state: GameState, x: number, y: number): void {
    const tile = state.grid[y][x];
    if (tile.state === 'burned') return;
    tile.unit = 'firefighter';
    tile.unitTurnsRemaining = GAME_CONSTANTS.FIREFIGHTER_DURATION;
  }

  private applyAirTanker(state: GameState, cx: number, cy: number): void {
    const r = GAME_CONSTANTS.TANKER_RADIUS;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= state.gridSize || ny < 0 || ny >= state.gridSize) continue;
        const tile = state.grid[ny][nx];
        if (tile.state === 'fire') {
          tile.intensity = Math.max(0, tile.intensity - GAME_CONSTANTS.TANKER_INTENSITY_REDUCTION) as Intensity;
          if (tile.intensity === 0) {
            tile.state = 'safe';
            if (state.summary) {
              state.summary.firesContained++;
            }
            state.totalFiresExtinguished++;
          }
        }
        tile.wet = true;
      }
    }
  }

  // --- Validation ---

  canPlaceFirefighter(state: GameState, x: number, y: number): boolean {
    const tile = state.grid[y][x];
    return tile.state !== 'burned' && !tile.unit && state.actionsRemaining > 0;
  }

  canPlaceAirTanker(state: GameState, x: number, y: number): boolean {
    return state.actionsRemaining > 0;
  }

  // --- Risk Calculation ---

  private recalcRiskLevels(state: GameState): void {
    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    ];

    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        const tile = state.grid[y][x];
        if (tile.state !== 'safe') {
          tile.riskLevel = 0;
          continue;
        }

        let riskScore = 0;
        for (const { dx, dy } of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= state.gridSize || ny < 0 || ny >= state.gridSize) continue;
          const neighbor = state.grid[ny][nx];
          if (neighbor.state === 'fire') {
            riskScore += neighbor.intensity;
          }
        }

        if (riskScore === 0) tile.riskLevel = 0;
        else if (riskScore <= 2) tile.riskLevel = 1;
        else tile.riskLevel = 2;
      }
    }
  }

  // --- Scoring ---

  private calculateScore(state: GameState): number {
    let safeTiles = 0;
    let burnedTiles = 0;
    const total = state.gridSize * state.gridSize;

    for (let y = 0; y < state.gridSize; y++) {
      for (let x = 0; x < state.gridSize; x++) {
        if (state.grid[y][x].state === 'safe') safeTiles++;
        if (state.grid[y][x].state === 'burned') burnedTiles++;
      }
    }

    return (
      safeTiles * 10 +
      state.totalFiresExtinguished * 25 -
      burnedTiles * 15 +
      state.totalUnusedActions * 5 +
      state.turn * 2
    );
  }

  // --- Utility ---

  private deepCopy(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }

  getTankerArea(cx: number, cy: number, gridSize: number): { x: number; y: number }[] {
    const r = GAME_CONSTANTS.TANKER_RADIUS;
    const coords: { x: number; y: number }[] = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          coords.push({ x: nx, y: ny });
        }
      }
    }
    return coords;
  }
}
