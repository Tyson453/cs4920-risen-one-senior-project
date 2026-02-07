import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-off',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './time-off.component.html',
  styleUrl: './time-off.component.css'
})
export class TimeOffComponent {
  today = new Date().toISOString().split('T')[0];
  startDate = this.today;
}
