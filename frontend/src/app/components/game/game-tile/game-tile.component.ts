import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tile } from '../../../models/game.model';

@Component({
  selector: 'app-game-tile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-tile.component.html',
  styleUrl: './game-tile.component.css',
})
export class GameTileComponent {
  @Input() tile!: Tile;
  @Input() highlighted = false;
  @Input() tankerPreview = false;
  @Input() disabled = false;

  get emoji(): string {
    if (this.tile.unit === 'firefighter') return '🚒';
    if (this.tile.wet && this.tile.state === 'safe') return '💧';
    switch (this.tile.state) {
      case 'safe': return '🌲';
      case 'fire': return '🔥';
      case 'burned': return '⬛';
    }
  }

  get intensityClass(): string {
    if (this.tile.state !== 'fire') return '';
    return `fire-intensity-${this.tile.intensity}`;
  }

  get riskClass(): string {
    if (this.tile.state !== 'safe') return '';
    switch (this.tile.riskLevel) {
      case 1: return 'risk-low';
      case 2: return 'risk-high';
      default: return '';
    }
  }

  @HostBinding('class')
  get hostClasses(): string {
    const classes = ['game-tile'];
    if (this.tile.state === 'burned') classes.push('burned');
    if (this.highlighted) classes.push('highlighted');
    if (this.tankerPreview) classes.push('tanker-preview');
    if (this.disabled) classes.push('disabled');
    if (this.intensityClass) classes.push(this.intensityClass);
    if (this.riskClass) classes.push(this.riskClass);
    return classes.join(' ');
  }
}
