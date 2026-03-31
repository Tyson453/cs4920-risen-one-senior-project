import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnSummary } from '../../../models/game.model';

@Component({
  selector: 'app-score-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './score-display.component.html',
  styleUrl: './score-display.component.css',
})
export class ScoreDisplayComponent {
  @Input() turn = 1;
  @Input() score = 0;
  @Input() burnedPercentage = 0;
  @Input() elapsedTime = 0;
  @Input() turnSummary: TurnSummary = { firesSpread: 0, firesContained: 0, tilesNewlyBurned: 0 };

  get formattedTime(): string {
    const totalSeconds = Math.floor(this.elapsedTime / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  get burnedPercent(): string {
    return (this.burnedPercentage * 100).toFixed(0);
  }

  get hasSummary(): boolean {
    return this.turn > 1;
  }
}
