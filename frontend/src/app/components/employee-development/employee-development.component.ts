import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';
import { PDTService } from '../../services/pdt.service';
import { DialogService } from '../../services/dialog.service';
import { PDT } from '../../models/pdt';

@Component({
  selector: 'app-employee-development',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './employee-development.component.html',
  styleUrls: ['./employee-development.component.scss'],
})
export class EmployeeDevelopmentComponent implements OnInit {
  currentUser: any = null;
  pdtRecords: PDT[] = [];
  selectedRecord: PDT | null = null;
  isEditing = false;
  isCreating = false;
  pdtForm: FormGroup;
  isLoading = true;

  displayedColumns: string[] = ['createdDate', 'empName', 'actions'];

  constructor(
    private authService: AuthService,
    private pdtService: PDTService,
    private dialogService: DialogService,
    private formBuilder: FormBuilder
  ) {
    this.pdtForm = this.createPDTForm();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadPDTRecords();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getUser();
      console.log('Current user loaded:', this.currentUser);
  }

  private loadPDTRecords(): void {
    this.isLoading = true;
    this.dialogService.openSpinner();
    const userId = this.currentUser?.uuid || '';

    this.pdtService.getPDTRecords(userId).subscribe({
      next: (records) => {
        this.pdtRecords = records;
        this.isLoading = false;
        this.dialogService.closeSpinner();
      },
      error: (error) => {
        console.error('Error loading PDT records:', error);
        this.dialogService.standardError(
          error,
          'Load Error',
          'Failed to load Personal Development Training records'
        );
        this.isLoading = false;
        this.dialogService.closeSpinner();
      },
    });
  }

  private createPDTForm(): FormGroup {
    return this.formBuilder.group({
      empName: [{ value: this.getUserName(), disabled: true }, Validators.required],
      shortTermGoals: ['', Validators.required],
      mediumTermGoals: ['', Validators.required],
      longTermGoals: ['', Validators.required],
      developmentNeeds: ['', Validators.required],
      actionPlan: ['', Validators.required],
      empSignature: ['', Validators.required],
      superSignature: [''],
    });
  }

  private getUserName(): string {
    return this.currentUser?.__zone_symbol__value.name || '';
  }

  onCreateNew(): void {
    this.selectedRecord = null;
    this.isCreating = true;
    this.isEditing = false;

    this.pdtForm.reset({
      empName: this.getUserName(),
      shortTermGoals: '',
      mediumTermGoals: '',
      longTermGoals: '',
      developmentNeeds: '',
      actionPlan: '',
      empSignature: '',
      superSignature: '',
    });
  }

  onEditRecord(record: PDT): void {
    this.selectedRecord = record;
    this.isEditing = true;
    this.isCreating = false;

    this.pdtForm.patchValue({
      empName: this.getUserName(),
      shortTermGoals: record.shortTermGoals,
      mediumTermGoals: record.mediumTermGoals,
      longTermGoals: record.longTermGoals,
      developmentNeeds: record.developmentNeeds,
      actionPlan: record.actionPlan,
      empSignature: record.empSignature,
      superSignature: record.superSignature,
    });
  }

  onSave(): void {
    if (!this.pdtForm.valid) {
      Object.keys(this.pdtForm.controls).forEach((key) => {
        this.pdtForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.dialogService.openSpinner();

    const formValue = this.pdtForm.getRawValue();
    const pdtData: Partial<PDT> = {
      empName: this.getUserName(),
      shortTermGoals: formValue.shortTermGoals,
      mediumTermGoals: formValue.mediumTermGoals,
      longTermGoals: formValue.longTermGoals,
      developmentNeeds: formValue.developmentNeeds,
      actionPlan: formValue.actionPlan,
      empSignature: formValue.empSignature,
      superSignature: formValue.superSignature,
      createdDate: new Date().toLocaleDateString('en-US'),
      createdTimestamp: new Date().toISOString(),
    };

    if (this.isCreating) {
      this.pdtService.createPDT(pdtData).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: {
              title: 'PDT Created',
              text: 'Your Personal Development Training record has been created successfully.',
            },
          });
          this.loadPDTRecords();
          this.onCancel();
        },
        error: (err) => {
          this.dialogService.standardError(
            err,
            'Creating PDT',
            'creating the PDT record'
          );
        },
      });
    } else if (this.selectedRecord) {
      this.pdtService.updatePDT(this.selectedRecord.id, pdtData).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: {
              title: 'PDT Updated',
              text: 'Your Personal Development Training record has been updated successfully.',
            },
          });
          this.loadPDTRecords();
          this.onCancel();
        },
        error: (err) => {
          this.dialogService.standardError(
            err,
            'Updating PDT',
            'updating the PDT record'
          );
        },
      });
    }
  }

  onCancel(): void {
    this.selectedRecord = null;
    this.isEditing = false;
    this.isCreating = false;
    this.pdtForm.reset();
  }

  onDeleteRecord(record: PDT): void {
    // Future enhancement: Add delete confirmation dialog
    this.dialogService.openSpinner();

    this.pdtService.deletePDT(record.id).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: {
            title: 'PDT Deleted',
            text: 'The Personal Development Training record has been deleted successfully.',
          },
        });
        this.loadPDTRecords();
      },
      error: (err) => {
        this.dialogService.standardError(
          err,
          'Deleting PDT',
          'deleting the PDT record'
        );
      },
    });
  }
}
