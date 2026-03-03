import { Component } from "@angular/core";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})

export class SettingsComponent {
  user: any;

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.getUser().then((user: any) => {
      this.user = user;
    });
  }
}