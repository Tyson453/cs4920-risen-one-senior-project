import { Component, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/daily-report.service';
import { ProjectApiService } from '../../services/project-api.service';
import { ReportDialogComponent } from './report-dialog/report-dialog.component';
import { ReportReviewComponent } from './report-review/report-review.component';
import { Title } from '@angular/platform-browser';
import Utils from "../../shared/util";
import { RocConstants } from '../../shared/constants/roc-constants';

import { UserApiService } from '../../services/user.service';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { DialogService } from '../../services/dialog.service';
import { UpdateDateRangeComponent } from './update-date-range/update-date-range.component';

@Component({
  selector: 'app-daily-status',
  standalone: false,
  templateUrl: './daily-status.component.html',
  styleUrls: ['./daily-status.component.scss']
})

export class DailyStatusComponent implements OnInit {

  // user is the which user's status page this is
  // realUser is the user logged in
  user: any;
  realUser: any;
  role: string = '';
  formattedToday: string;
  pageSize: number = 5;
  public pageNumber: number = 1;
  mobileView = false

  startRange: Date;
  endRange: Date;
  startRangeFormatted: string;
  endRangeFormatted: string;
  datesChanged = false;

  admin: boolean = false;
  reports: any = [];
  title = 'reportspdf';
  projectIdToNameMap = new Map<string, string>();

  displayedColumns: string[] = ['date', 'projects', 'reportStatus'];
  dataSource = new MatTableDataSource<any>();
  @ViewChild('reportsPDF') reportsPDF!: ElementRef;

  @ViewChild(MatPaginator) set matPaginator(paginator: MatPaginator) {
    this.dataSource.paginator = paginator;
  }
  @ViewChild(MatSort) set matSort(sort: MatSort) {
    this.dataSource.sort = sort;
  }

  constructor(
    public dialog: MatDialog,
    private dialogService: DialogService,
    public authService: AuthService,
    private dsrService: ApiService,
    private projectApiService: ProjectApiService,
    private userService: UserApiService,
    private route: ActivatedRoute,
    private titleService: Title) {
    this.titleService.setTitle("ROC Daily Status");

    const today = new Date();
    let yyyy = today.getFullYear();
    let mm: string | number = today.getMonth() + 1; // Months start at 0!
    let dd: string | number = today.getDate();

    if (dd < 10) { dd = '0' + dd };
    if (mm < 10) { mm = '0' + mm };

    this.formattedToday = yyyy + '' + mm + dd;
    this.endRangeFormatted = mm+"/"+dd+"/"+yyyy;
    this.endRange = new Date(this.endRangeFormatted)

    const monthAgo = new Date()
    monthAgo.setMonth(today.getMonth()-1);
    yyyy = monthAgo.getFullYear()
    mm = monthAgo.getMonth() + 1
    dd = monthAgo.getDate();
    if (dd < 10) { dd = '0' + dd };
    if (mm < 10) { mm = '0' + mm };

    this.startRangeFormatted = mm+"/"+dd+"/"+yyyy;
    this.startRange = new Date(this.startRangeFormatted)
    this.updateColumns()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateColumns()
  }

  updateColumns() {
      let screenWidth = window.innerWidth;
      this.mobileView = (screenWidth <= 800)
      if (screenWidth < 800) {
        this.displayedColumns= ['date', 'reportStatus']
      } else {
        this.displayedColumns= ['date', 'projects', 'reportStatus']
      }
  }

  ngOnInit() {
    this.dialogService.openSpinner();
    return this.authService.getUser().then((user)=>{
      this.realUser = user;
      this.loadData();
    });
  }

  finishLoadingData() {
    this.dataSource.data = []
    let reportDates = []
    for (const report of this.reports) {

      if (report.projects) {
        // Maps all ids to their project names
        report.projectNames = []
        for (let i = 0; i < report.projects.length; i++) {
          report.projectNames[i] = this.projectIdToNameMap.get(report.projects[i].projectId);
        }
      } else {
        //add empty list
        report.projectNames = []
      }
      if (this.user.requestedPTO[report.date] && this.user.requestedPTO[report.date].hours >= 8) {
        if (this.user.requestedPTO[report.date].types.sick) report.status = 'SICK';
        else report.status = 'PTO';
      } else {
        if (report.reportStatus) {
          if (report.reportStatus == "DRAFT") {
            report.status = 'IN-PROGRESS';
          } else {
            report.status = 'SUBMITTED';
          }
        }
        else report.status = 'MISSING';
      }

      // Inits data for the table
      let newObj = {
        date: report.date,
        ...report
      };
      reportDates.push(report.date)
      this.dataSource.data.push(newObj);
    }
    let startInt = this.dateStringToInt(this.startRangeFormatted)
    let endInt = this.dateStringToInt(this.endRangeFormatted)
    for (const pto in this.user.requestedPTO) {
      let int = this.dateStringToInt(pto)
      if (int < startInt || int > endInt) {
        continue
      }
      //skip if a report exists for this date already
      if (reportDates.includes(pto) || pto.substring(6, 10) + pto.substring(0, 2) + pto.substring(3, 5) > this.formattedToday) continue;
      else {
        let status = '';
        if (this.user.requestedPTO[pto].hours >= 8) {
          if (this.user.requestedPTO[pto].types.sick) status = 'SICK';
          else status = 'PTO';
        } else {
          status = 'MISSING';
        }

        let newObj = {
          date: pto,
          projectNames: [],
          status: status,
        };
        this.dataSource.data.push(newObj);
      }
    }
    this.dataSource.data.sort((a, b) => { return this.dateStringToInt(b.date) - this.dateStringToInt(a.date) })
      this.dataSource.data = this.dataSource.data; //force renders the data in mat-table
    this.dialogService.closeSpinner();
  }

  loadData() {
    this.dialogService.openSpinner();
    this.dataSource.data = [];
    this.reports = [];

    // Promise dependecies. promise0 and promise2 happen simultaneously,
    // promise1 waits for promise0, and data is added to the table after
    // promsie1 and promise2 are resolved.

    const promise2 = new Promise<void>((resolve) => {
      this.projectApiService.getProjects().subscribe((res: any) => {
      this.projectIdToNameMap.set(RocConstants.DEFAULT_PROJECT, RocConstants.DEFAULT_PROJECT)
        for (const project of res) {
          this.projectIdToNameMap.set(project.uuid, project.projectName)
        }
        resolve()
      })
    })

    const promise0 = new Promise<void>((resolve) => {
      this.route.paramMap.subscribe((params: ParamMap) => {
        // Checks the router parameters
        let id = params!.get('uuid')!;
        this.role = params!.get('role')! ?? '';
        if (id != null && id != this.realUser.uuid) {
          this.loadUser(id).then(() => {
            resolve()
          });
        } else {
          this.user = this.realUser;
          resolve()
        }
      });
    }).then(() => {
      const promise1 = new Promise<void>((resolve) => {
        this.dsrService.getReportsNew(this.user.id, 50, this.startRangeFormatted, this.endRangeFormatted).subscribe((res:any) => {
          res.forEach((element: { date: string; }) => {
            element.date = Utils.yyyymmddTommddyyyy(element.date)
          });
          if (res) {
            this.reports = res//.dailyReports;
          } else {
            this.initializeNewUser();
          }
          resolve()
        })
      })

      Promise.all([promise0, promise1, promise2]).then((values) => {
        this.finishLoadingData()
      })
    })
  }

  public addReport(): void {
    this.dialog.open(ReportDialogComponent, {
      width: "900px",
      panelClass: ['animate__animated', 'animate__fadeInDown'],
      disableClose: true
    }).afterClosed().subscribe(() => {
      this.loadData();
    });
  }

  public openDateRangeModal(): void {
    this.dialog.open(UpdateDateRangeComponent, {
      width: "900px",
      panelClass: ['animate__animated', 'animate__fadeInDown'],
      data: {
        startRange: this.startRange,
        endRange: this.endRange,
        showExport: true,
      }
    }).afterClosed().subscribe((data: any) => {
      if (data) {
        this.startRange = data.startRange
        this.endRange = data.endRange
        if (data.exportRange) {
          this.customReport()
        } else {
          // Normal update range
          this.updateRange()
        }
      }
    });
  }

  public async monthly(type: string) {
    this.dialogService.openSpinner();
    var today = new Date();
    var mm: string;
    var month: number = 0;
    var yyyy = today.getFullYear();
    if (type == 'current') {
      month = today.getMonth() + 1;
    } else { //prev
      month = today.getMonth();
      if (month == 0) {
        month = 12;
        yyyy = yyyy - 1;
      }
    }
    if (month < 10) mm = '0' + month;
    else mm = '' + month;

    await new Promise<void>((resolve) => {
      this.dsrService.getMonthlyList(this.user.uuid, this.realUser.uuid, mm, yyyy.toString(),'0','0').subscribe((data:any) => {
        resolve()
      });
    }).finally(() => {
      this.dialogService.closeSpinner();
      this.dialogService.saveSuccessOpen({
        width: '500px',
        data: {
          "title": "Email Sent",
          "text": "Your report is being generated and will be sent shortly."
        },
      });
    })
  }

  public async customReport() {
    this.dialogService.openSpinner();
    await new Promise<void>((resolve) => {
      this.dsrService.getMonthlyList(
        this.user.uuid,
        this.realUser.uuid,
        '0', //mm
        '0', //yyyy
        Utils.dateRangeString(new Date(this.startRange)),
        Utils.dateRangeString(new Date(this.endRange))).subscribe({
          next: (data: any) => {
            resolve()
          },
          error: (err: any) => {
            this.dialogService.standardError(err, "Creating Custom Report", "creating the custom report");
          },
        });
    }).finally(() => {
      this.dialogService.closeSpinner();
      this.dialogService.saveSuccessOpen({
        width: '500px',
        data: {
          "title": "Email Sent",
          "text": `The custom report for ${this.startRange.toLocaleDateString("en-US")} to ${this.endRange.toLocaleDateString("en-US")} has been sent to your email.`,
        },
      });
    })
  }

  public viewReport(element: any): void {
    this.dialog.open(ReportReviewComponent, {
      width: "700px",
      panelClass: ['animate__animated', 'animate__fadeInDown'],
      data: {
        report: element,
        user: this.user,
        role: this.role
      }
    }).afterClosed().subscribe(() => {
      this.loadData();
    });
  }

  async loadUser(uuid: string) {
    await new Promise<void>((resolve) => {
      this.userService.getUserInfo(uuid).then((data) => {
        this.user = data
        this.titleService.setTitle("ROC Reports | " + this.user.name);
        resolve()
      });
    })
  }

  initializeNewUser() {
    const params = {
      'id': this.user.id,
      'dailyReports': {},
      'firstName': this.user.firstName,
      'lastName': this.user.lastName,
      'supervisorId': this.user.supervisorId
    };
    this.dsrService.addUserToReportsTable(params).subscribe({
      next: () => {
      },
      error: (err:any) => {
        this.dialogService.standardError(err, "Creating Report Record", "creating the report record")
      }
    })
  }

  updateRange() {

    this.startRangeFormatted = Utils.dateToString(new Date(this.startRange))
    this.endRangeFormatted = Utils.dateToString(new Date(this.endRange))
    this.dsrService.getReportsNew(this.user.id, 50,
      this.startRangeFormatted,
      this.endRangeFormatted).subscribe((res:any) => {
      res.forEach((element: { date: string; }) => {
        element.date = Utils.yyyymmddTommddyyyy(element.date)
      });
      if (res) {
        this.reports = res//.dailyReports;
      } else {
        this.initializeNewUser();
      }
      this.finishLoadingData()
    })
  }

  dateRangeChange() {
    this.datesChanged=true
  }

  dateRangeValid() {
    return this.startRange && this.endRange && this.startRange < this.endRange
  }

  //Converts a date in the format "MM/DD/YYYY" to an int with a greater value the later the date
  dateStringToInt(date: string) {
    return (
      parseInt(date.substring(6)) * 10000 +
      parseInt(date.substring(0, 2)) * 100 +
      parseInt(date.substring(3, 5))
    );
  }
}
