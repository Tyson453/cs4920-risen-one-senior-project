import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import { PTOService } from '../../services/pto.service';
import { DialogService } from '../../services/dialog.service';
import { UserApiService } from '../../services/user.service';
import { PTORequest, PTOStatus } from '../../models/pto';

type ViewMode = 'list' | 'create' | 'view' | 'pending-approvals';

@Component({
  selector: 'app-time-off',
  standalone: false,
  templateUrl: './time-off.component.html',
  styleUrls: ['./time-off.component.scss'],
})
export class TimeOffComponent implements OnInit {
  currentUser: any = null;
  ptoRequests: PTORequest[] = [];
  selectedRequest: PTORequest | null = null;
  viewMode: ViewMode = 'list';
  ptoForm!: FormGroup;
  isLoading = true;

  pendingApprovals: PTORequest[] = [];
  isPendingApprovalsLoading = false;
  isSupervisorView = false;
  hasSubordinates = false;
  denyReason = '';
  showDenyPanel = false;

  displayedColumns: string[] = ['startDate', 'endDate', 'type', 'status', 'actions'];
  pendingColumns: string[] = ['employeeName', 'startDate', 'endDate', 'type', 'status', 'actions'];

  constructor(
    private authService: AuthService,
    private ptoService: PTOService,
    private dialogService: DialogService,
    private userApiService: UserApiService,
    private formBuilder: FormBuilder
  ) {
    this.ptoForm = this.createForm();
  }

  async ngOnInit(): Promise<void> {
    this.currentUser = await this.authService.getUser();
    this.loadPTORequests();
    if (this.isSupervisor) {
      const allUsers = await this.userApiService.getUsers();
      this.hasSubordinates = allUsers.some(
        (u: any) => u.supervisorId === this.currentUser.uuid
      );
      if (this.hasSubordinates) {
        this.loadPendingApprovals();
      }
    }
  }

  get isListView(): boolean { return this.viewMode === 'list'; }
  get isCreateView(): boolean { return this.viewMode === 'create'; }
  get isViewOnly(): boolean { return this.viewMode === 'view'; }
  get isPendingApprovalsView(): boolean { return this.viewMode === 'pending-approvals'; }

  get isSupervisor(): boolean {
    const roles: string[] = this.currentUser?.roles || [];
    return roles.includes('LEAD') || roles.includes('PM') || roles.includes('ADMIN');
  }

  statusLabel(status: PTOStatus): string {
    const labels: Record<PTOStatus, string> = {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      DENIED: 'Denied',
    };
    return labels[status] ?? status;
  }

  statusClass(status: PTOStatus): string {
    const classes: Record<PTOStatus, string> = {
      PENDING: 'status-pending',
      APPROVED: 'status-approved',
      DENIED: 'status-denied',
    };
    return classes[status] ?? '';
  }

  private loadPTORequests(): void {
    this.isLoading = true;
    this.dialogService.openSpinner();
    const userId = this.currentUser?.uuid || '';

    this.ptoService.getPTORequests(userId).subscribe({
      next: (records) => {
        this.ptoRequests = records;
        this.isLoading = false;
        this.dialogService.closeSpinner();
      },
      error: (error) => {
        this.dialogService.standardError(error, 'Load Error', 'loading time off requests');
        this.isLoading = false;
        this.dialogService.closeSpinner();
      },
    });
  }

  private loadPendingApprovals(): void {
    this.isPendingApprovalsLoading = true;
    this.ptoService.getPendingPTOApprovals().subscribe({
      next: (records) => {
        this.pendingApprovals = records;
        this.isPendingApprovalsLoading = false;
      },
      error: (err) => {
        this.dialogService.standardError(err, 'Load Error', 'loading pending PTO approvals');
        this.isPendingApprovalsLoading = false;
      },
    });
  }

  private createForm(): FormGroup {
    return this.formBuilder.group({
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      type: ['PTO', Validators.required],
      reason: [''],
    });
  }

  onCreateNew(): void {
    this.selectedRequest = null;
    this.viewMode = 'create';
    this.ptoForm.reset();
    this.ptoForm.enable();
    this.ptoForm.patchValue({ type: 'PTO' });
  }

  onViewRequest(request: PTORequest): void {
    this.selectedRequest = request;
    this.viewMode = 'view';
    this.isSupervisorView = false;
    this.showDenyPanel = false;
    this.denyReason = '';
  }

  onBackToList(): void {
    this.selectedRequest = null;
    this.viewMode = 'list';
    this.ptoForm.reset();
    this.isSupervisorView = false;
    this.showDenyPanel = false;
    this.denyReason = '';
  }

  onSubmitRequest(): void {
    if (!this.ptoForm.valid) {
      Object.keys(this.ptoForm.controls).forEach((key) =>
        this.ptoForm.get(key)?.markAsTouched()
      );
      return;
    }

    this.dialogService.openSpinner();
    const raw = this.ptoForm.getRawValue();

    const startDate = raw.startDate instanceof Date
      ? raw.startDate.toISOString().split('T')[0]
      : raw.startDate;
    const endDate = raw.endDate instanceof Date
      ? raw.endDate.toISOString().split('T')[0]
      : raw.endDate;

    const payload: Partial<PTORequest> = {
      userId: this.currentUser?.uuid,
      employeeName: this.currentUser?.name || '',
      startDate,
      endDate,
      type: raw.type,
      reason: raw.reason || '',
    };

    this.ptoService.createPTO(payload).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: {
            title: 'Request Submitted',
            text: 'Your time off request has been submitted for supervisor approval.',
          },
        });
        this.loadPTORequests();
        if (this.hasSubordinates) this.loadPendingApprovals();
        this.onBackToList();
      },
      error: (err) =>
        this.dialogService.standardError(err, 'Submitting Request', 'submitting the time off request'),
    });
  }

  // ── Supervisor workflow ───────────────────────────────────────────────────────

  onViewPendingApprovals(): void {
    this.viewMode = 'pending-approvals';
    this.loadPendingApprovals();
  }

  onReviewRequest(request: PTORequest): void {
    this.selectedRequest = request;
    this.viewMode = 'view';
    this.isSupervisorView = true;
    this.showDenyPanel = false;
    this.denyReason = '';
  }

  onApprovePTO(): void {
    if (!this.selectedRequest) return;
    this.dialogService.openSpinner();

    this.ptoService.approvePTO(this.selectedRequest.id).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: { title: 'PTO Approved', text: 'The time off request has been approved.' },
        });
        this.pendingApprovals = this.pendingApprovals.filter((r) => r.id !== this.selectedRequest!.id);
        this.onBackToList();
        this.viewMode = 'pending-approvals';
      },
      error: (err) =>
        this.dialogService.standardError(err, 'Approving PTO', 'approving the time off request'),
    });
  }

  onDenyPTO(): void {
    if (!this.selectedRequest) return;
    this.dialogService.openSpinner();

    this.ptoService.denyPTO(this.selectedRequest.id, this.denyReason).subscribe({
      next: () => {
        this.dialogService.closeSpinner();
        this.dialogService.saveSuccessOpen({
          width: '500px',
          data: { title: 'PTO Denied', text: 'The time off request has been denied.' },
        });
        this.pendingApprovals = this.pendingApprovals.filter((r) => r.id !== this.selectedRequest!.id);
        this.onBackToList();
        this.viewMode = 'pending-approvals';
      },
      error: (err) =>
        this.dialogService.standardError(err, 'Denying PTO', 'denying the time off request'),
    });
  }
}
