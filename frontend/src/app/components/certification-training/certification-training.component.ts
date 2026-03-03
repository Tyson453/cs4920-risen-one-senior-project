import { Component } from '@angular/core';
import { DialogService } from '../../services/dialog.service';

type CertItem = {
  id: string;
  icon: "workspace_premium" | "school";
  name: string;
  type: 'Certification' | 'Course';
  status: string;
};

@Component({
  selector: 'app-certification-training',
  standalone: false,
  templateUrl: './certification-training.component.html',
  styleUrls: ['./certification-training.component.css']
})
export class CertificationTrainingComponent {
  openSpinner = () => {};
  closeSpinner = () => {};

  searchTerm = '';

  items: CertItem[] = [
    { id: 'aws', icon: 'workspace_premium', name: 'AWS Certification', type: 'Certification', status: 'Active' },
    { id: 'angular', icon: 'school', name: 'Angular Training', type: 'Course', status: 'Completed' },
    { id: 'security', icon: 'school', name: 'Security Awareness', type: 'Course', status: 'Due soon' },
  ];

  filteredItems: CertItem[] = [...this.items];

  constructor(private dialogService: DialogService) {
    this.openSpinner = () => this.dialogService.openSpinner();
    this.closeSpinner = () => this.dialogService.closeSpinner();
  }

  onSearchChange(): void {
    const q = this.searchTerm.trim().toLowerCase();

    if (!q) {
      this.filteredItems = [...this.items];
      return;
    }

    this.filteredItems = this.items.filter((x) => {
      const haystack = `${x.name} ${x.type} ${x.status}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  trackById = (_: number, item: CertItem) => item.id;
}