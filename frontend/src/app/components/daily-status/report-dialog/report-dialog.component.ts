import { Component, OnInit, Inject, AfterViewInit, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ApiService } from '../../../services/daily-report.service';
import { AuthService } from '../../../services/auth.service';
import { UserApiService } from '../../../services/user.service';
import { DialogService } from '../../../services/dialog.service';
import { RocConstants } from '../../../shared/constants/roc-constants';

@Component({
  selector: 'app-report-dialog',
  standalone: false,
  templateUrl: './report-dialog.component.html',
  styleUrls: ['./report-dialog.component.scss'],
})
export class ReportDialogComponent implements OnInit, AfterViewInit {
  reportForm: any;
  user: any;
  showProjectStatus: boolean = false;
  projects: any;
  date: String | null | undefined;
  startingText: String = "";
  report: any;
  @ViewChildren('projectInput', { read: ElementRef })
  projectInput!: QueryList<ElementRef>;

  constructor(
    public dialogRef: MatDialogRef<ReportDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private userApiService: UserApiService,
    private apiService: ApiService,
    public authService: AuthService,
    private datePipe: DatePipe,
    public dialog: MatDialog,
    private dialogService: DialogService) {
  }

  ngOnInit() {
    return this.authService.getUser().then((user) => {
      this.user = user;
      this.loadData();
    });
  }

  ngAfterViewInit(): void {
    this.projectInput.changes.subscribe(_ => {
      this.projectInput.first.nativeElement.focus()
    });
  }

  loadData() {
    this.dialogService.openSpinner();
    this.date = this.datePipe.transform((new Date), 'MM/dd/yyyy');
    if (this.data) {
      /*
        When opening this popup, the caller can specify data
        that is to be used instead of the current user's data.
        This is used for editing existing reports.
      */
      this.user = this.data.user;
      this.date = this.data.report.date;
      this.startingText = this.data.report.reportText
      this.report = this.data.report;
    }
    this.showProjectStatus = this.user.roles.includes("LEAD") || this.user.roles.includes("PM");
    this.apiService.getAllProjects().subscribe((res) => {
      const promise0 = new Promise<void>((resolve) => {
        this.projects = res.filter((project: { uuid: any; projectName: string; status: string }) => (this.user.assignments ?? []).includes(project.uuid) && project.status != "Inactive");
        if (this.user.roles.includes("ADMIN") || this.user.roles.includes("LEAD")) {
          this.userApiService.getUsers().then(
            (users: unknown) => {
              let userList = (users as any[]).filter((e: any) => e.supervisorId === this.user.uuid);
              userList.forEach((user: any) => {
                let userProjects =
                  this.projects = this.projects.concat(res.filter((project: { uuid: any; projectName: string; status: string }) => user.assignments.includes(project.uuid) && project.status != "Inactive" && !this.projects.find((e: { uuid: any; }) => e.uuid === project.uuid)));
              });

            });
        } else {
          this.projects = res.filter((project: { uuid: any; projectName: string; status: string }) => (this.user.assignments ?? []).includes(project.uuid) && project.status != "Inactive");
          if (this.projects.length == 0) {
            this.projects = [{
              uuid: RocConstants.DEFAULT_PROJECT,
              projectName: RocConstants.DEFAULT_PROJECT,
              status: "Active"
            }]
          }
          resolve()
        }
      }).then(() => {
        // Create map to assign existing project report text to projects
        let projectIdToReportText = new Map<string, string>();
        let projectIdToReportStatus = new Map<string, string>();
        if (this.report) {
          if (this.data.report.projects) {
            this.data.report.projects.forEach((x: any) => {
              projectIdToReportText.set(x.projectId, x.reportText)
              projectIdToReportStatus.set(x.projectId, x.reportStatus ?? '')
            })
          }
        }
        this.initForm();
        this.projects.forEach((project: any) => {
          this.reportForm.addControl(
            project.projectName + '.reportText', // Form control name is the project name
            new FormControl(projectIdToReportText.get(project.uuid))
          )
          this.reportForm.addControl(
            project.projectName + '.reportStatus', // Form control name is the project name
            new FormControl(projectIdToReportStatus.get(project.uuid))
          )
        })
        this.dialogService.closeSpinner();
      })
    })
  }

  initForm() {
    this.reportForm = this.formBuilder.group({
      name: [{ value: this.user.name, disabled: true }],
      date: [{ value: this.date, disabled: true }]
    });
  }

  submitReport(signedOff: boolean) {
    this.dialogService.openSpinner();

    const params = {
      "draft": !signedOff,
      "projects": this.projects.map((project: any) => {
        if (this.showProjectStatus) {
          return {
            "reportText": this.reportForm.value[project.projectName + '.reportText'],
            "reportStatus": this.reportForm.value[project.projectName + '.reportStatus'] ?? '',
            "projectId": project.uuid
          }
        } else {
          return {
            "reportText": this.reportForm.value[project.projectName + '.reportText'],
            "projectId": project.uuid
          }
        }
      })
    }
    this.apiService.createReport(params, this.user.id,
      this.datePipe.transform((new Date(this.date as string)), 'MM-dd-yyyy')!).subscribe({
        next: () => {
          let text = "\n";

          this.projects.map((project: any) => {
            text += project.projectName + ":<br>";
            if (this.showProjectStatus) text += "Status: " + this.reportForm.value[project.projectName + '.reportStatus'] + "<br>";
            text += this.reportForm.value[project.projectName + '.reportText'] + "<br><br>";
          })
          if (signedOff) {
            this.sendEmail(text);
          } else {
            this.saveSuccessDialog(false)
          }
        },
        error: (err: any) => {
          this.dialogService.standardError(err, "Saving Report", "saving the report")
        }
      })
  }

  public sendEmail(text: String): void {
    let emailText = text.replace(/(?:\r\n|\r|\n)/g, '<br>'); // replaces all new lines with <br>
    this.apiService.sendEmail({ "uuid": this.user.uuid, "text": emailText, "date": this.date }).subscribe({
      next: () => {
        this.saveSuccessDialog(true)
      },
      error: (err: any) => {
        this.dialogService.standardError(err, "Sending Email", "sending an email, but the report was saved")
      }
    })
  }

  close() {
    this.dialogRef.close();
  }

  saveSuccessDialog(signed: boolean) {
    this.dialogService.closeAll();
    if (signed) {
      this.dialogService.saveSuccessOpen({
        width: '500px',
        data: {
          "title": "Daily Status Saved!",
          "text": "Your daily status update was emailed to your team lead."
        },
      });
    } else {
      this.dialogService.saveSuccessOpen({
        width: '500px',
        data: {
          "title": "Daily Status Saved!",
          "text": "Your daily status has been saved as draft. Remember to submit before the end of the day."
        },
      });
    }
  }
}
