import { Component, OnInit, Inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/daily-report.service';
import { ReportDialogComponent } from '../report-dialog/report-dialog.component';
import { AuthService } from '../../../services/auth.service';
import { Observable } from 'rxjs';
import { DialogService } from '../../../services/dialog.service';

@Component({
  selector: 'app-report-review',
  standalone: false,
  templateUrl: './report-review.component.html',
  styleUrls: ['./report-review.component.scss']
})

//PROPERTIES FOR REPORT POP-UP AS WELL AS SETTING AND INITILIZING DEPENDENCIES
export class ReportReviewComponent implements OnInit {
  reportForm: any;
  loading: boolean;
  isAdmin: boolean;
  isLead: boolean = false;
  user: any;
  localUser: any;
  emp: any;
  report: any;
  role: any;
  @ViewChild(MatMenuTrigger) trigger!: MatMenuTrigger;
  reportText!: string;
  mobileView = false

  constructor(
    public authService: AuthService,
    public dialogRef: MatDialogRef<ReportReviewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private dialogService: DialogService,
    private router: Router,
    private apiService: ApiService) {
    this.loading = false;
    this.isAdmin = false;
    this.emp = {} as any;
      this.report = this.data.report;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    let screenWidth = window.innerWidth;
    this.mobileView = (screenWidth <= 599)
  }

  title = 'reportpdf';
  @ViewChild('reportPDF') reportPDF!: ElementRef;

  public ngOnInit() {
    this.onResize(null)
    return this.authService.getUser().then((user) => {
      this.localUser = user
      if (this.data.user) {
        this.user = this.data.user;
      } else {
        this.user = { "name": this.report.firstName + " " + this.report.lastName, "uuid": this.localUser.uuid }
      }
      this.role = this.data.role;
      this.loading = true;
      // Build the text for the report seperated by projects
      this.reportText = ""
      for (let i = 0; i < this.report.projectNames.length; i++) {
        this.reportText += this.report.projectNames[i] + ":\n"
        if (this.isLead) this.reportText += "status: " + (this.report.projects[i].reportStatus ?? "") + "\n"
        this.reportText += this.report.projects[i].reportText + "\n\n"
      }
    });
  }

  public export(): void {
    // pdfMake.fonts = {
    //   Roboto: {
    //     normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    //     bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    //   },
    // }
    // const doc = new jsPDF();
    // const reportPDF = this.reportPDF.nativeElement;
    // var html = htmlToPdfMake(reportPDF.innerHTML);
    // const docDefinition: any = { content: html };
    // pdfMake.createPdf(docDefinition).open()
  }
  //POP-UP FOR SENDING EMAILS AND PASSES CONSTRICTORS SET FROM IT
  public sendEmail(emailData: any): void {
    this.apiService.sendEmail(emailData).subscribe({
      next: () => {
        if (this.isAdmin) {
          this.saveSuccessDialog("Report emailed! Check your inbox!").subscribe(() => {
            this.router.navigate(['/' + 'admin']).then(() => {
            });
          });
        } else {
          this.saveSuccessDialog("Report emailed to lead").subscribe(() => {
            this.router.navigate(['/' + this.user.sub, 'reports']).then(() => {
            });
          });
        }
      },
      error: (err: any) => {
        this.dialogService.standardError(err, "Sending Email", "sending the email")
      }
    })
  }

  public send(): void {
    this.loading = true;

    const params = {
      emailAddress: this.report.email,
      empName: this.report.empName,
      reportText: this.report.reportText,
      projects: this.report.projects,
      submittedAt: this.report.submittedAt
    }

    this.sendEmail(params);
  }

  public deleteReport(): void {
    this.loading = true;
    this.apiService.deleteReport(this.user.uuid, this.report.date.replace('/', '-').replace('/', '-')).subscribe({
      next: () => {
        this.saveSuccessDialog("Report has been deleted").subscribe(() => {
        });
      },
      error: (err: any) => {
        this.dialogService.standardError(err, "Deleting Report", "deleting the report")
      }
    })
  }

  public close(): void {
    this.dialogService.closeAll();
  }

  public editReport(): void {
    this.dialog.open(ReportDialogComponent, {
      width: "900px",
      panelClass: ['animate__animated', 'animate__fadeInDown'],
      data: {
        report: this.report,
        user: this.user
      },
      disableClose: true
    });
  }

  saveSuccessDialog(text: string): Observable<any> {
    this.dialogService.closeAll();
    const modalRef = this.dialogService.saveSuccessOpen({
      height: '300px',
      width: '800px',
      data: {
        "title": "Saved!",
        "text": text
      },
    });

    return modalRef.afterClosed()
  }
}
