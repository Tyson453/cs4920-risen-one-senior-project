import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';


interface previousRequest {
  value: string;
  viewValue: string;
}

type HomeCardAction = { label: string; route?: string; href?: string };
type HomeCard = {
  id: string;
  icon: string;
  title: string;
  className?: string;
  actions: HomeCardAction[];
};


@Component({
  selector: 'app-form',
  providers: [provideNativeDateAdapter()],
  templateUrl: './home.component.html',
  standalone: false,
  styleUrl: './home.component.css'
})


export class HomeComponent {
  user: any;
  userphoto = "../assets/RisenOneWhite.png"
  isReordering = false;

  cards: HomeCard[] = [
    { id: 'daily-status', icon: 'send', title: 'DAILY STATUS', actions: [{ label: 'Submit', route: '/daily-status' }] },
    { id: 'time-off', icon: 'calendar_month', title: 'TIME OFF', actions: [{ label: 'Submit', route: '/time-off' }] },
    { id: 'projects', icon: 'list', title: 'PROJECTS', actions: [{ label: 'View All', route: '/projects' }] },
    { id: 'roc-team', icon: 'people', title: 'ROC TEAM PAGE', actions: [{ label: 'View All', route: '/team-summary' }] },
    { id: 'employee-dev', icon: 'summarize', title: 'EMPLOYEE DEVELOPMENT', actions: [{ label: 'View/Edit', route: '/reports/personal-dev' }] },
    { id: 'cert-training', icon: 'keyboard_double_arrow_up', title: 'CERTIFICATION & TRAINING', actions: [{ label: 'View/Manage', route: '/certification-training' }] },
    {
      id: 'portal-support',
      icon: 'help',
      title: 'PORTAL SUPPORT',
      className: 'portal-support-card',
      actions: [
        { label: 'Request Enhancement', href: 'https://docs.google.com/forms/d/e/1FAIpQLSdl6xvlXO6lTzz0Wz5Esa8zg6syMQyzMJlZQLXVcb0CHhVRdw/viewform?usp=publish-editor' },
        { label: 'Report a Bug', href: 'https://docs.google.com/forms/d/e/1FAIpQLSdSdcvN0eiqlv3nLDlN1pG7rti_u8oPHLwstBjHaUZUXHxxLg/viewform?usp=publish-editor' }
      ]
    }
  ];

  private originalOrder: HomeCard[] = [...this.cards];

  constructor(
    private router: Router,
    private authService: AuthService,
    private dialogService: DialogService,
  ) { }
  /* Sign In navigation Function */
  ngOnInit() {
    this.dialogService.openSpinner();
    this.authService.getUser().then((user: any) => {
      console.log("User:", user)
      this.user = user;
      this.dialogService.closeSpinner();
    });
  }
  signIn() {
    this.router.navigate(['/login']);
  }
  
  toggleReordering() {
    this.isReordering = !this.isReordering;
  }

  finishReordering() {
    this.originalOrder = [...this.cards];
    this.isReordering = false;
  }

  cancelReordering() {
    this.cards = [...this.originalOrder];
    this.isReordering = false;
  }

  drop(event: CdkDragDrop<HomeCard[]>): void {
    if (!this.isReordering || event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.cards, event.previousIndex, event.currentIndex);
  }

  trackByCardId(_index: number, card: HomeCard): string {
    return card.id;
  }
}