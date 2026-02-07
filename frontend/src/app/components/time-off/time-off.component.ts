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

  startDate: string | null = null;
  endDate: string | null = null;

  onStartChange() {
    // If end date is before start date, fix it
    if (this.endDate && this.endDate < this.startDate!) {
      this.endDate = this.startDate;
    }
  }

  onEndChange() {
    // If start date is after end date, fix it
    if (this.startDate && this.startDate > this.endDate!) {
      this.startDate = this.endDate;
    }
  }
}
