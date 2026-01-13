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
  selector: 'app-confirm-redirect',
  standalone: false,
  templateUrl: './confirm-redirect.component.html',
  styleUrls: ['./confirm-redirect.component.scss'],
})
export class ConfirmRedirectComponent implements OnInit {
  @Input() showModalButtons: boolean = false;
  @Output() confirmEvent: EventEmitter<any> = new EventEmitter();

  constructor(
    public dialogRef: MatDialogRef<ConfirmRedirectComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {}

  save(): void {
    this.confirmEvent.emit();
    this.dialogRef.close({
      confirmation: true,
      save: true
    });
  }
  confirm(): void {
    this.confirmEvent.emit();
    this.dialogRef.close({
      confirmation: true,
      save: false
    });
  }

  dismiss(): void {
    this.dialogRef.close({
      confirmation: false,
      save: false
    });
  }
}
