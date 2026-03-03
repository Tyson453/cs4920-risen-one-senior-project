import { Component } from '@angular/core';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-certification-training',
  standalone: false,
  templateUrl: './certification-training.component.html',
  styleUrls: ['./certification-training.component.css']
})
export class CertificationTrainingComponent {
  openSpinner = () => {};
  closeSpinner = () => {};
  constructor(
    private dialogService: DialogService,
  ) {
    this.openSpinner = () => this.dialogService.openSpinner();
    this.closeSpinner = () => this.dialogService.closeSpinner();
  }
}
