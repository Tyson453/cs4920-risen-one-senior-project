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
  description: string;
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
  userphoto = "../assets/RisenOneWhite.png";
  isReordering = false;
  private readonly cardOrderStorageKey = 'home.cardOrder';

  cards: HomeCard[] = [
    {
      id: 'daily-status',
      icon: 'send',
      title: 'DAILY STATUS',
      description: 'Submit your daily work updates',
      actions: [{ label: 'Submit', route: '/daily-status' }]
    },
    {
      id: 'time-off',
      icon: 'calendar_month',
      title: 'TIME OFF',
      description: 'Manage leave and time off requests',
      actions: [{ label: 'Submit', route: '/time-off' }]
    },
    {
      id: 'projects',
      icon: 'list',
      title: 'PROJECTS',
      description: 'View ongoing projects and tasks',
      actions: [{ label: 'View All', route: '/projects' }]
    },
    {
      id: 'game',
      icon: 'sports_esports',
      title: 'GAME',
      description: 'Launch and explore the game module',
      actions: [{ label: 'Open Game', route: '/game' }]
    },
    {
      id: 'roc-team',
      icon: 'people',
      title: 'ROC TEAM PAGE',
      description: 'See team details and collaboration info',
      actions: [{ label: 'View All', route: '/team-summary' }]
    },
    {
      id: 'employee-dev',
      icon: 'summarize',
      title: 'EMPLOYEE DEVELOPMENT',
      description: 'Track personal growth and development',
      actions: [{ label: 'View/Edit', route: '/reports/personal-dev' }]
    },
    {
      id: 'cert-training',
      icon: 'keyboard_double_arrow_up',
      title: 'CERTIFICATION & TRAINING',
      description: 'Manage certifications and training records',
      actions: [{ label: 'View/Manage', route: '/certification-training' }]
    },
    {
      id: 'portal-support',
      icon: 'help',
      title: 'PORTAL SUPPORT',
      description: 'Request help, enhancements, or bug fixes',
      className: 'portal-support-card',
      actions: [
        {
          label: 'Request Enhancement',
          href: 'https://docs.google.com/forms/d/e/1FAIpQLSdl6xvlXO6lTzz0Wz5Esa8zg6syMQyzMJlZQLXVcb0CHhVRdw/viewform?usp=publish-editor'
        },
        {
          label: 'Report a Bug',
          href: 'https://docs.google.com/forms/d/e/1FAIpQLSdSdcvN0eiqlv3nLDlN1pG7rti_u8oPHLwstBjHaUZUXHxxLg/viewform?usp=publish-editor'
        }
      ]
    },
    {
      id: 'stats-score',
      icon: 'bar_chart',
      title: 'STATS / SCORE',
      description: 'Track your performance and scores',
      actions: [{ label: 'View Stats', route: '/game' }]
    },
    {
      id: 'game-history',
      icon: 'history',
      title: 'GAME HISTORY',
      description: 'Review previous game activity',
      actions: [{ label: 'View History', route: '/game' }]
    },
    {
      id: 'profile',
      icon: 'person',
      title: 'USER PROFILE',
      description: 'View and manage your profile details',
      actions: [{ label: 'View Profile', route: '/profile' }]
    },
    {
      id: 'settings',
      icon: 'settings',
      title: 'SETTINGS',
      description: 'Customize app preferences and controls',
      actions: [{ label: 'Open Settings', route: '/profile' }]
    },
    {
      id: 'how-to-play',
      icon: 'quiz',
      title: 'HOW TO PLAY',
      description: 'Learn rules, controls, and gameplay steps',
      actions: [{ label: 'Open Guide', route: '/game' }]
    },
    {
      id: 'notifications',
      icon: 'notifications',
      title: 'NOTIFICATIONS / UPDATES',
      description: 'Check recent alerts and updates',
      actions: [{ label: 'View Updates', route: '/projects' }]
    }
  ];

  private originalOrder: HomeCard[] = [...this.cards];

  constructor(
    private router: Router,
    private authService: AuthService,
    private dialogService: DialogService,
  ) { }

  ngOnInit() {
    this.loadCardOrder();
    this.originalOrder = [...this.cards];
    this.dialogService.openSpinner();
    this.authService.getUser().then((user: any) => {
      console.log("User:", user);
      this.user = user;
      this.dialogService.closeSpinner();
    });
  }

  signIn() {
    this.router.navigate(['/login']);
  }

  openExternal(url: string, event: MouseEvent) {
    if (this.isReordering) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  toggleReordering() {
    this.isReordering = !this.isReordering;
  }

  finishReordering() {
    this.saveCardOrder();
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

  private saveCardOrder(): void {
    if (typeof localStorage === 'undefined') {
      console.log('localStorage is not available.');
      return;
    }

    const orderedIds = this.cards.map((card) => card.id);
    localStorage.setItem(this.cardOrderStorageKey, JSON.stringify(orderedIds));
  }

  private loadCardOrder(): void {
    if (typeof localStorage === 'undefined') {
      console.log('localStorage is not available.');
      return;
    }

    const savedOrderRaw = localStorage.getItem(this.cardOrderStorageKey);
    if (savedOrderRaw === null) {
      console.log('No saved card order found in localStorage. Using default order.');
      return;
    }

    let savedIds: unknown;
    try {
      savedIds = JSON.parse(savedOrderRaw);
      if (!Array.isArray(savedIds)) return;
    } catch {
      console.log('Failed to parse saved card order from localStorage. Ignoring saved order.');
      return;
    }

    const cardsById = new Map(this.cards.map(card => [card.id, card]));
    const orderedCards = Array.from(savedIds)
      .map(id => cardsById.get(id))
      .filter((card): card is HomeCard => !!card);

    const missingCards = this.cards.filter(
      card => !orderedCards.some(orderedCard => orderedCard.id === card.id)
    );

    this.cards = [...orderedCards, ...missingCards];
  }
}