import {
  Component,
  Inject,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation-modal',
  standalone: false,
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent implements OnInit {
  @Input() showModalButtons: boolean = false;
  @Output() saveEvent: EventEmitter<any> = new EventEmitter();
  @Output() confirmEvent: EventEmitter<any> = new EventEmitter();
  @Output() deleteEvent: EventEmitter<any> = new EventEmitter();

  constructor(
    public dialogRef: MatDialogRef<ConfirmationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {}

  save(): void {
    this.saveEvent.emit();
  }

  confirm(): void {
    this.confirmEvent.emit();
    this.dialogRef.close({
      confirmation: true,
    });
  }

  dismiss(): void {
    this.dialogRef.close({
      confirmation: false,
    });
  }

  delete(): void {
    this.deleteEvent.emit();
  }

  createList() {
    let datesList = document.getElementById('datesList');

    if (datesList !== null) {
      let list = '<ul>';
      this.data.datesSelected.forEach((date: any) => {
        list += '<li>' + date + '</li>';
      });
      list += '</ul>';
      datesList.innerHTML = list;
    }
  }
}
