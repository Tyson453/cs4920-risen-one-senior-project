# Fire Planner – Game Design Specification

## Overview
Fire Planner is a turn-based, grid-based fire management game designed as a short, low-stress brain break for employees. The game emphasizes strategic decision-making over reflexes and is optimized for accessibility, simplicity, and replayability.

---

## Core Design Principles
- Low time pressure (no twitch mechanics)
- High clarity and readability
- Strategic but simple decisions
- Minimal art requirements (emoji + color-based UI)
- Short sessions (1–5 minutes)

---

## Core Game Loop
Each turn consists of two phases:

### 1. Planning Phase (Player Controlled)
- Game is paused
- Player can:
  - Place firefighters
  - Use air tanker
- Player clicks **"Next Turn"** to proceed

### 2. Resolution Phase (System Controlled)
Occurs automatically after player input:
1. Player actions resolve
2. Firefighters reduce fire intensity
3. Air tanker effects apply
4. Fire spreads
5. Fire intensity may increase on existing tiles

---

## Grid System
- Fixed grid sizes based on difficulty:
  - Easy: 6x6
  - Medium: 8x8
  - Hard: 10x10
- Each tile is a discrete state container

### Tile States
- Safe (🌲)
- Fire (🔥) with intensity levels
- Burned (⬛)
- Wet (temporary effect from tanker, optional)

---

## Fire Model

### Fire Intensity Levels
- Level 1: Low spread probability
- Level 2: Moderate spread probability
- Level 3: High spread probability, harder to extinguish

### Behavior
- Fire spreads to adjacent tiles (N, S, E, W only)
- Fire intensity increases over time if not addressed
- Burned tiles cannot be recovered

---

## Risk System

The game uses **probabilistic transparency**:

- Exact fire spread is NOT shown
- Risk levels ARE shown visually

### Risk Levels (3 tiers max)
- Low Risk
- Medium Risk
- High Risk

### Risk Factors
- Adjacent fire tiles
- Fire intensity
- Time progression (difficulty scaling)

---

## Player Actions

### Action Limits Per Turn
- Fixed number of actions per turn
- Player may carry over ONE unused action to the next turn

### Units

#### Firefighter (🚒)
- Placed on a tile
- Reduces fire intensity each turn
- Reduces spread probability
- Persists for multiple turns
- Expires after ~3 turns

#### Air Tanker (✈️ / 💧)
- Targets area (e.g., 3x3)
- Instantly reduces or removes fire
- Limited use per turn

### Placement Rules
- One unit per tile
- No stacking

---

## Turn Economy
- Fixed number of actions per turn
- One unused action can be carried over (generic, not tied to unit type)

---

## Turn Resolution Order
1. Player actions applied
2. Firefighter effects applied
3. Air tanker effects applied
4. Fire spreads
5. Fire intensity increases

---

## End Conditions

Game ends when ANY condition is met:
- Burned tiles exceed threshold (~40–50%)
- Time limit reached (5 minutes max)

---

## Scoring System

Composite scoring model:
- Positive:
  - Forest tiles preserved
  - Fires extinguished
- Negative:
  - Tiles burned
- Bonus:
  - Efficiency (unused actions)
  - Survival duration

---

## Difficulty Scaling

### Between Games
- Grid size increases with difficulty

### Within a Game
- Fire spread probability increases over time
- Risk levels gradually rise

---

## Visual Design

### Style
- Minimalist, no custom art required
- Emoji + color-based system

### Suggested Visual Mapping
- 🌲 Safe forest
- 🔥 Fire (intensity via color or layering)
- ⬛ Burned
- 🚒 Firefighter
- 💧 Air tanker effect
- ⚠️ Risk indicators

### Feedback
After each turn:
- Highlight:
  - New fires
  - Extinguished tiles
- Optional summary text:
  - Example: "+3 fires spread, -2 contained"

---

## Accessibility Considerations
- No time pressure required to act
- Large, clear grid tiles
- Minimal precision clicking
- Clear visual feedback

---

## Randomness Model
- Seeded randomness per session

### Benefits
- Reproducibility for debugging
- Consistent behavior per session

---

## Technical Notes

### Frontend
- Angular (TypeScript)
- Component-based grid

### Suggested Components
- GameBoard
- Tile
- ControlPanel
- ScoreDisplay

### Backend (Leaderboard)
- AWS API Gateway
- AWS Lambda
- DynamoDB

---

## Non-Goals
- No complex animations
- No deep simulation systems
- No real-time reflex-based gameplay

---

## Future Enhancements (Optional)
- Turn timer
- Additional terrain types
- Advanced risk visualization
- Daily leaderboard

---

## Summary
This design prioritizes:
- Accessibility
- Strategic clarity
- Low implementation complexity
- High replayability

The system is intentionally simple in structure but allows depth through probabilistic behavior and resource management.


---

## Turn State Diagram (Logical Flow)

States:
- INIT
- PLANNING
- RESOLVING
- CHECK_END
- GAME_OVER

### Flow
1. INIT → PLANNING
2. PLANNING (player places actions, clicks Next Turn)
3. PLANNING → RESOLVING
4. RESOLVING (apply game logic in order)
5. RESOLVING → CHECK_END
6. CHECK_END:
   - If end condition met → GAME_OVER
   - Else → PLANNING

---

## Core Data Model (TypeScript-Oriented)

### Tile
```ts
interface Tile {
  x: number;
  y: number;
  state: 'safe' | 'fire' | 'burned';
  intensity: 0 | 1 | 2 | 3;
  riskLevel: 0 | 1 | 2; // low, medium, high
  unit?: 'firefighter';
  unitTurnsRemaining?: number;
}
```

### GameState
```ts
interface GameState {
  grid: Tile[][];
  turn: number;
  score: number;
  actionsPerTurn: number;
  carriedOverActions: number;
  maxCarryOver: number; // = 1
  burnedPercentage: number;
  seed: string;
  startTime: number;
  elapsedTime: number;
  isGameOver: boolean;
}
```

### PlayerAction
```ts
type PlayerAction =
  | { type: 'place_firefighter'; x: number; y: number }
  | { type: 'air_tanker'; x: number; y: number };
```

---

## Turn Resolution Pipeline (Step-by-Step)

When the player clicks "Next Turn":

1. APPLY PLAYER ACTIONS
   - Place firefighters
   - Apply tanker effects (reduce intensity in area)

2. APPLY FIREFIGHTER EFFECTS
   - Reduce intensity on their tile
   - Reduce spread probability (implicit via logic)
   - Decrement unit duration
   - Remove expired units

3. FIRE SPREAD PHASE
   - For each fire tile:
     - Attempt spread to N/S/E/W neighbors
     - Only spread to "safe" tiles

4. INTENSITY UPDATE
   - Increase intensity for existing fire tiles (if not reduced)

5. UPDATE TILE STATES
   - Convert tiles to burned if max intensity exceeded (if applicable)

6. RECALCULATE RISK LEVELS
   - Based on proximity to fire and intensity

7. UPDATE SCORE
   - Apply scoring rules

8. UPDATE GAME METRICS
   - Burned percentage
   - Elapsed time

9. CHECK END CONDITIONS

---

## Example Turn Walkthrough

### Initial State
- Grid: 8x8
- 2 fire tiles (intensity 1)
- Player has 2 actions available

### Player Actions
- Places firefighter on (3,3)
- Uses tanker centered on (5,5)

### Resolution
1. Tanker reduces intensity in 3x3 area
2. Firefighter placed with 3-turn duration
3. Fire spreads from remaining fire tiles
4. Some adjacent tiles catch fire (intensity 1)
5. Existing fires increase intensity (1 → 2)
6. Risk levels updated around new fire clusters
7. Score updated based on containment and spread

### Result
- Player sees:
  - New fire tiles highlighted
  - Reduced fire in tanker zone
  - Active firefighter icon on grid

---

## Notes for AI-Assisted Development

- Always treat GameState as the single source of truth
- Ensure all updates are deterministic given the seed
- Keep turn resolution pure (no side effects outside state updates)
- Prefer small, testable functions for each phase of the pipeline
- Avoid coupling UI logic with game logic

---

