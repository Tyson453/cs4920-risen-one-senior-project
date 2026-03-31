import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, MatGridListModule, MatCardModule],
  templateUrl: './auth-shell.component.html',
  styleUrls: ['./auth-shell.component.css'],
})
export class AuthShellComponent {
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';
}
