import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tile } from '../../../models/game.model';
import { GameTileComponent } from '../game-tile/game-tile.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, GameTileComponent],
  templateUrl: './game-board.component.html',
  styleUrl: './game-board.component.css',
})
export class GameBoardComponent {
  @Input() grid: Tile[][] = [];
  @Input() gridSize = 8;
  @Input() highlightedTiles = new Set<string>();
  @Input() tankerPreviewTiles = new Set<string>();
  @Input() disabled = false;

  @Output() tileClick = new EventEmitter<Tile>();
  @Output() tileHover = new EventEmitter<Tile | null>();

  get gridTemplateColumns(): string {
    return `repeat(${this.gridSize}, 1fr)`;
  }

  onTileClick(tile: Tile): void {
    if (!this.disabled) {
      this.tileClick.emit(tile);
    }
  }

  onTileMouseEnter(tile: Tile): void {
    if (this.disabled) {
      return;
    }
    this.tileHover.emit(tile);
  }

  onTileMouseLeave(): void {
    if (this.disabled) {
      return;
    }
    this.tileHover.emit(null);
  }

  isTileHighlighted(tile: Tile): boolean {
    return this.highlightedTiles.has(`${tile.x},${tile.y}`);
  }

  isTankerPreview(tile: Tile): boolean {
    return this.tankerPreviewTiles.has(`${tile.x},${tile.y}`);
  }

  trackByTile(_index: number, tile: Tile): string {
    return `${tile.x},${tile.y}`;
  }
}
