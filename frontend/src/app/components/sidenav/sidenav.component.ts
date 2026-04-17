import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css']
})
export class SidenavComponent implements OnInit {
  isAdmin = false;
  user: any;

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    this.isAdmin = await this.authService.adminCheck();
    this.user = await this.authService.getUser();
  }

  logout() {
    this.authService.signOut();
  }
}
