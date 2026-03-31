import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css']
})
export class SidenavComponent implements OnInit {
  isAdmin = false;

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    this.isAdmin = await this.authService.adminCheck();
  }

  logout() {
    this.authService.signOut();
  }
}
