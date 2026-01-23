import { Component, Inject, Input, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';
@Component({
  selector: 'app-generic-error',
  standalone: false,
  templateUrl: './generic-error.component.html',
  styleUrls: ['./generic-error.component.scss']
})
export class GenericErrorComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<ConfirmationModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
      ) {}
    ngOnInit(): void {}

    dismiss(): void {
      this.dialogRef.close({
        confirmation: false,
      });
    }
}
