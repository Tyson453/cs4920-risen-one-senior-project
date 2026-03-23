import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActionMode } from '../../../models/game.model';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css',
})
export class ControlPanelComponent {
  @Input() actionsRemaining = 0;
  @Input() carriedOver = 0;
  @Input() currentMode: ActionMode = 'firefighter';
  @Input() disabled = false;
  @Input() pendingActions: { type: string; x: number; y: number }[] = [];

  @Output() modeChange = new EventEmitter<ActionMode>();
  @Output() nextTurn = new EventEmitter<void>();
  @Output() undoAction = new EventEmitter<void>();

  setMode(mode: ActionMode): void {
    this.modeChange.emit(mode);
  }

  onNextTurn(): void {
    this.nextTurn.emit();
  }

  onUndo(): void {
    this.undoAction.emit();
  }
}
