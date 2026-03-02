import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { PDTService } from '../../services/pdt.service';
import { DialogService } from '../../services/dialog.service';
import { PDT, PDTStatus } from '../../models/pdt';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'pending-approvals';

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
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './employee-development.component.html',
  styleUrls: ['./employee-development.component.scss'],
})
export class EmployeeDevelopmentComponent implements OnInit {
  currentUser: any = null;
  pdtRecords: PDT[] = [];
  selectedRecord: PDT | null = null;
  viewMode: ViewMode = 'list';
  pdtForm: FormGroup;
  isLoading = true;

  // Supervisor state
  pendingApprovals: PDT[] = [];
  isPendingApprovalsLoading = false;
  isSupervisorView = false;
  supervisorSignature = '';
  changeComments = '';
  showApprovePanel = false;
  showChangesPanel = false;

  displayedColumns: string[] = ['createdDate', 'empName', 'status', 'actions'];
  pendingColumns: string[] = ['createdDate', 'empName', 'status', 'actions'];

  constructor(
    private authService: AuthService,
    private pdtService: PDTService,
    private dialogService: DialogService,
    private formBuilder: FormBuilder
  ) {
    this.pdtForm = this.createPDTForm();
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = await this.authService.getUser();
    this.loadPDTRecords();
    if (this.isSupervisor) { this.loadPendingApprovals(); }
  }

  // ── Computed helpers ─────────────────────────────────────────────────────────

  get isListView(): boolean { return this.viewMode === 'list'; }
  get isFormView(): boolean { return this.viewMode === 'create' || this.viewMode === 'edit'; }
  get isViewOnly(): boolean { return this.viewMode === 'view'; }
  get isCreating(): boolean { return this.viewMode === 'create'; }
  get isEditing(): boolean { return this.viewMode === 'edit'; }
  get isPendingApprovalsView(): boolean { return this.viewMode === 'pending-approvals'; }

  get isSupervisor(): boolean {
    const roles: string[] = this.currentUser?.roles || [];
    return roles.includes('LEAD') || roles.includes('PM') || roles.includes('ADMIN');
  }

  statusLabel(status: PDTStatus): string {
    const labels: Record<PDTStatus, string> = {
      DRAFT: 'Draft',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      CHANGES_REQUESTED: 'Changes Requested',
    };
    return labels[status] ?? status;
  }

  statusClass(status: PDTStatus): string {
    const classes: Record<PDTStatus, string> = {
      DRAFT: 'status-draft',
      PENDING_APPROVAL: 'status-pending',
      APPROVED: 'status-approved',
      CHANGES_REQUESTED: 'status-changes',
    };
    return classes[status] ?? '';
  }

  canEdit(record: PDT): boolean {
    return record.status === 'DRAFT' || record.status === 'CHANGES_REQUESTED';
  }

  canDelete(record: PDT): boolean {
    return record.status === 'DRAFT';
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  private loadPDTRecords(): void {
    this.isLoading = true;
    const userId = this.currentUser?.uuid || '';

    this.pdtService.getPDTRecords(userId).subscribe({
      next: (records) => {
        this.pdtRecords = records;
        this.isLoading = false;
      },
      error: (error) => {
        this.dialogService.standardError(
          error,
          'Load Error',
          'loading Personal Development Training records'
        );
        this.isLoading = false;
      },
    });
  }

  // ── Form setup ───────────────────────────────────────────────────────────────

  private createPDTForm(): FormGroup {
    return this.formBuilder.group({
      empName: [{ value: '', disabled: true }, Validators.required],
      shortTermGoals: ['', Validators.required],
      mediumTermGoals: ['', Validators.required],
      longTermGoals: ['', Validators.required],
      developmentNeeds: ['', Validators.required],
      actionPlan: ['', Validators.required],
      empSignature: ['', Validators.required],
      superSignature: [{ value: '', disabled: true }],
    });
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  onCreateNew(): void {
    this.selectedRecord = null;
    this.viewMode = 'create';
    this.pdtForm.reset();
    this.pdtForm.enable();
    this.pdtForm.get('empName')?.disable();
    this.pdtForm.get('superSignature')?.disable();
    this.pdtForm.patchValue({ empName: this.currentUser?.name || '' });
  }

  onEditRecord(record: PDT): void {
    this.selectedRecord = record;
    this.viewMode = 'edit';
    this.pdtForm.enable();
    this.pdtForm.get('empName')?.disable();
    this.pdtForm.get('superSignature')?.disable();
    this.pdtForm.patchValue({
      empName: record.empName,
      shortTermGoals: record.shortTermGoals,
      mediumTermGoals: record.mediumTermGoals,
      longTermGoals: record.longTermGoals,
      developmentNeeds: record.developmentNeeds,
      actionPlan: record.actionPlan,
      empSignature: record.empSignature,
      superSignature: record.superSignature,
    });
  }

  onViewRecord(record: PDT): void {
    this.selectedRecord = record;
    this.viewMode = 'view';
    this.pdtForm.disable();
    this.pdtForm.patchValue({
      empName: record.empName,
      shortTermGoals: record.shortTermGoals,
      mediumTermGoals: record.mediumTermGoals,
      longTermGoals: record.longTermGoals,
      developmentNeeds: record.developmentNeeds,
      actionPlan: record.actionPlan,
      empSignature: record.empSignature,
      superSignature: record.superSignature,
    });
  }

  onBackToList(): void {
    this.selectedRecord = null;
    this.viewMode = 'list';
    this.pdtForm.reset();
    this.isSupervisorView = false;
    this.showApprovePanel = false;
    this.showChangesPanel = false;
    this.supervisorSignature = '';
    this.changeComments = '';
  }

  onEditFromView(): void {
    if (this.selectedRecord) {
      this.onEditRecord(this.selectedRecord);
    }
  }

  // ── Save draft ───────────────────────────────────────────────────────────────

  onSaveDraft(): void {
    if (!this.pdtForm.valid) {
      Object.keys(this.pdtForm.controls).forEach((key) =>
        this.pdtForm.get(key)?.markAsTouched()
      );
      return;
    }

    this.dialogService.openSpinner();
    const payload = this.buildPayload();

    if (this.isCreating) {
      this.pdtService.createPDT({ ...payload, userId: this.currentUser?.uuid }).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: { title: 'Draft Saved', text: 'Your PDT record has been saved as a draft.' },
          });
          this.loadPDTRecords();
          this.onBackToList();
        },
        error: (err) => this.dialogService.standardError(err, 'Saving Draft', 'saving the PDT draft'),
      });
    } else if (this.selectedRecord) {
      this.pdtService.updatePDT(this.selectedRecord.id, payload).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: { title: 'Draft Saved', text: 'Your PDT record has been updated.' },
          });
          this.loadPDTRecords();
          this.onBackToList();
        },
        error: (err) => this.dialogService.standardError(err, 'Updating PDT', 'updating the PDT record'),
      });
    }
  }

  // ── Submit for approval ──────────────────────────────────────────────────────

  onSubmitForApproval(): void {
    if (!this.pdtForm.valid) {
      Object.keys(this.pdtForm.controls).forEach((key) =>
        this.pdtForm.get(key)?.markAsTouched()
      );
      return;
    }

    this.dialogService.openSpinner();
    const payload = this.buildPayload();

    const doSubmit = (pdtId: string) => {
      this.pdtService.submitPDTForApproval(pdtId).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: {
              title: 'Submitted for Approval',
              text: 'Your PDT has been submitted to your supervisor for review.',
            },
          });
          this.loadPDTRecords();
          this.onBackToList();
        },
        error: (err) =>
          this.dialogService.standardError(err, 'Submitting PDT', 'submitting the PDT for approval'),
      });
    };

    if (this.isCreating) {
      this.pdtService.createPDT({ ...payload, userId: this.currentUser?.uuid }).subscribe({
        next: (res) => doSubmit(res.id),
        error: (err) => this.dialogService.standardError(err, 'Creating PDT', 'creating the PDT record'),
      });
    } else if (this.selectedRecord) {
      this.pdtService.updatePDT(this.selectedRecord.id, payload).subscribe({
        next: () => doSubmit(this.selectedRecord!.id),
        error: (err) => this.dialogService.standardError(err, 'Updating PDT', 'updating the PDT record'),
      });
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  onDeleteRecord(record: PDT): void {
    const confirmRef = this.dialogService.confirmationOpen({
      width: '400px',
      data: {
        title: 'Delete PDT Record?',
        body: 'This draft will be permanently deleted. This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    confirmRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.dialogService.openSpinner();
      this.pdtService.deletePDT(record.id).subscribe({
        next: () => {
          this.dialogService.closeSpinner();
          this.dialogService.saveSuccessOpen({
            width: '500px',
            data: { title: 'PDT Deleted', text: 'The draft PDT record has been deleted.' },
          });
          this.loadPDTRecords();
        },
        error: (err) =>
          this.dialogService.standardError(err, 'Deleting PDT', 'deleting the PDT record'),
      });
    });
  }

  // ── Supervisor workflow ───────────────────────────────────────────────────────

  onViewPendingApprovals(): void {
    this.viewMode = 'pending-approvals';
    this.loadPendingApprovals();
  }

  private loadPendingApprovals(): void {
    this.isPendingApprovalsLoading = true;
    this.pdtService.getPendingApprovals().subscribe({
      next: (records) => {
        this.pendingApprovals = records;
        this.isPendingApprovalsLoading = false;
      },
      error: (err) => {
        this.dialogService.standardError(err, 'Load Error', 'loading pending approvals');
        this.isPendingApprovalsLoading = false;
      }
    });
  }

  onReviewRecord(record: PDT): void {
    this.isSupervisorView = true;
    this.showApprovePanel = false;
    this.showChangesPanel = false;
    this.supervisorSignature = '';
    this.changeComments = '';
    this.onViewRecord(record);
  }

  onApprovePDT(): void {
    if (!this.supervisorSignature.trim()) return;
    this.dialogService.openSpinner();
    this.pdtService.approvePDT(this.selectedRecord!.id, this.supervisorSignature).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: { title: 'PDT Approved', text: 'The PDT has been approved and the signature has been recorded.' }
        });
        this.pendingApprovals = this.pendingApprovals.filter(r => r.id !== this.selectedRecord!.id);
        this.onBackToList();
        this.viewMode = 'pending-approvals';
      },
      error: (err) => this.dialogService.standardError(err, 'Approving PDT', 'approving the PDT')
    });
  }

  onRequestChanges(): void {
    if (!this.changeComments.trim()) return;
    this.dialogService.openSpinner();
    this.pdtService.requestPDTChanges(this.selectedRecord!.id, this.changeComments).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: { title: 'Changes Requested', text: 'The employee will be notified that changes are required.' }
        });
        this.pendingApprovals = this.pendingApprovals.filter(r => r.id !== this.selectedRecord!.id);
        this.onBackToList();
        this.viewMode = 'pending-approvals';
      },
      error: (err) => this.dialogService.standardError(err, 'Requesting Changes', 'requesting changes on the PDT')
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private buildPayload(): Partial<PDT> {
    const raw = this.pdtForm.getRawValue();
    return {
      empName: raw.empName,
      shortTermGoals: raw.shortTermGoals,
      mediumTermGoals: raw.mediumTermGoals,
      longTermGoals: raw.longTermGoals,
      developmentNeeds: raw.developmentNeeds,
      actionPlan: raw.actionPlan,
      empSignature: raw.empSignature,
    };
  }
}
