import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  admin: boolean = false;
  lead: boolean = false;
  tester: boolean = false;
  pm: boolean = false;

  toggle = [false,false];

  constructor(private authService: AuthService) {}

  ngOnInit() {}

  logout() {
    this.authService.logout();
  }
}
