import { Component, ChangeDetectorRef, AfterViewInit, ViewChild, ElementRef, OnInit, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogService } from '../../../services/dialog.service';
import { UserApiService } from '../../../services/user.service';


@Component({
  selector: 'app-update-date-range',
  standalone: false,
  templateUrl: './update-date-range.component.html',
  styleUrls: ['./update-date-range.component.scss']
})

export class UpdateDateRangeComponent implements OnInit {

  
  startRange: Date;
  endRange: Date;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: any,
    public dialogService: DialogService,
    public userService: UserApiService,
    private dialogRef: MatDialogRef<UpdateDateRangeComponent>,
  ) {
    this.startRange = data.startRange;
    this.endRange = data.endRange;
  }

  ngOnInit(): void {

  }
  submitForm(): void {
    this.dialogRef.close({
      startRange: this.startRange,
      endRange: this.endRange
    })
  }

  exportRange(): void {
    this.dialogRef.close({
      startRange: this.startRange,
      endRange: this.endRange,
      exportRange: true,
    })
  }

  dateRangeValid() {
    return this.startRange && this.endRange && this.startRange < this.endRange
  }
}
