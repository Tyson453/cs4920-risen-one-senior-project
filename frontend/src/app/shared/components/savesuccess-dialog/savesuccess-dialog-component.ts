import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-savesuccess-dialog',
  templateUrl: 'savesuccess-dialog.html',
  styleUrls: ['./savesuccess-dialog.component.css'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
})
export class SaveSuccess {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: any,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<SaveSuccess>,
    public router: Router
  ) {}

  closeDialog() {
    this.dialogRef.close();
  }
}
