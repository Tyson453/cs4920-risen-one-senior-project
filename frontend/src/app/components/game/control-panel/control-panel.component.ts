import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActionMode, PlayerAction } from '../../../models/game.model';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.css',
})
export class ControlPanelComponent implements OnDestroy {
  @Input() actionsRemaining = 0;
  @Input() carriedOver = 0;
  @Input() currentMode: ActionMode = 'firefighter';
  @Input() disabled = false;
  @Input() pendingActions: PlayerAction[] = [];

  @Output() modeChange = new EventEmitter<ActionMode>();
  @Output() nextTurn = new EventEmitter<void>();
  @Output() undoAction = new EventEmitter<void>();
  @Output() triggerEndGame = new EventEmitter<void>();

  isConfirmingEndGame = false;
  private confirmEndGameTimeout: ReturnType<typeof setTimeout> | null = null;

  setMode(mode: ActionMode): void {
    this.modeChange.emit(mode);
  }

  onEndGameClick(): void {
    if (this.isConfirmingEndGame) {
      if (this.confirmEndGameTimeout !== null) {
        clearTimeout(this.confirmEndGameTimeout);
        this.confirmEndGameTimeout = null;
      }
      this.isConfirmingEndGame = false;
      this.triggerEndGame.emit();
    } else {
      this.isConfirmingEndGame = true;
      this.confirmEndGameTimeout = setTimeout(() => {
        this.isConfirmingEndGame = false;
      }, 5000);
    }
  }

  onNextTurn(): void {
    this.nextTurn.emit();
  }

  onUndo(): void {
    this.undoAction.emit();
  }

  ngOnDestroy(): void {
    if (this.confirmEndGameTimeout !== null) {
      clearTimeout(this.confirmEndGameTimeout);
      this.confirmEndGameTimeout = null;
    }
    this.isConfirmingEndGame = false;
  }
}
