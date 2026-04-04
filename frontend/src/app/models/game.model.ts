export type TileState = 'safe' | 'fire' | 'burned';
export type Intensity = 0 | 1 | 2 | 3;
export type RiskLevel = 0 | 1 | 2;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GamePhase = 'INIT' | 'PLANNING' | 'RESOLVING' | 'GAME_OVER';
export type ActionMode = 'firefighter' | 'air_tanker';

export interface Tile {
  x: number;
  y: number;
  state: TileState;
  intensity: Intensity;
  riskLevel: RiskLevel;
  unit?: 'firefighter';
  unitTurnsRemaining?: number;
  wet?: boolean;
}

export interface GameState {
  grid: Tile[][];
  gridSize: number;
  turn: number;
  score: number;
  actionsPerTurn: number;
  actionsRemaining: number;
  carriedOverActions: number;
  maxCarryOver: number;
  burnedPercentage: number;
  seed: string;
  rngState: number;
  startTime: number;
  elapsedTime: number;
  phase: GamePhase;
  difficulty: Difficulty;
  totalFiresExtinguished: number;
  totalUnusedActions: number;
  turnSummary: TurnSummary;
}

export interface TurnSummary {
  firesSpread: number;
  firesContained: number;
  tilesNewlyBurned: number;
}

export type PlayerAction =
  | { type: 'place_firefighter'; x: number; y: number }
  | { type: 'air_tanker'; x: number; y: number };

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  difficulty: Difficulty;
  turn: number;
  date: string;
}

export interface SubmitScoreResponse {
  entry: LeaderboardEntry;
  isNewHighScore: boolean;
}

export interface DifficultyConfig {
  gridSize: number;
  initialFires: number;
  initialHighIntensity: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy:   { gridSize: 6,  initialFires: 2, initialHighIntensity: 0 },
  medium: { gridSize: 8,  initialFires: 3, initialHighIntensity: 1 },
  hard:   { gridSize: 10, initialFires: 4, initialHighIntensity: 2 },
};

export const GAME_CONSTANTS = {
  ACTIONS_PER_TURN: 2,
  MAX_CARRY_OVER: 1,
  FIREFIGHTER_DURATION: 3,
  TANKER_RADIUS: 1,
  BURNED_THRESHOLD: 0.4,
  TIME_LIMIT_MS: 5 * 60 * 1000,
  BASE_SPREAD_PROB: [0, 0.15, 0.30, 0.50] as readonly number[],
  SPREAD_SCALING_PER_TURN: 0.005,
  FIREFIGHTER_INTENSITY_REDUCTION: 1,
  TANKER_INTENSITY_REDUCTION: 2,
};
