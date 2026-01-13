import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';



interface previousRequest {
  value: string;
  viewValue: string;
}


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
}