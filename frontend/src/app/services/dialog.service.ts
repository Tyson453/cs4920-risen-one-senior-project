import { Injectable } from '@angular/core';

import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
} from '@angular/material/dialog';

/* Dialog Components */
import { SaveSuccess } from '../shared/components/savesuccess-dialog/savesuccess-dialog-component';
import { ConfirmationModalComponent } from '../shared/components/confirmation-modal/confirmation-modal.component';
import { GenericErrorComponent } from '../shared/components/generic-error/generic-error.component';
import { ProgressSpinnerComponent } from '../shared/components/progress-spinner/progress-spinner.component';
import { ConfirmRedirectComponent } from '../shared/components/confirm-redirect/confirm-redirect.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {

  saveSuccessDialogRef?: MatDialogRef<SaveSuccess>;
  confirmationDialogRef?: MatDialogRef<ConfirmationModalComponent>;
  confirmRedirectRef?: MatDialogRef<ConfirmRedirectComponent>;
  errorDialogRef?: MatDialogRef<GenericErrorComponent>;
  spinner?: MatDialogRef<ProgressSpinnerComponent>;

  constructor(private dialog: MatDialog) { }

  /**
   *
   * @param @Optional dialogConfig Component wise dialog config.
   *  Components can pass down data in this config or they can assign the data to dialogState
   */
  saveSuccessOpen(dialogConfig: MatDialogConfig): MatDialogRef<SaveSuccess> {
    this.saveSuccessDialogRef = this.dialog.open(SaveSuccess, {
      ...dialogConfig,
    });

    this.saveSuccessDialogRef.afterClosed().subscribe((response: unknown) => {
      // Do something in the service level. ( All components )
    });

    return this.saveSuccessDialogRef;
  }

  confirmationOpen(dialogConfig: MatDialogConfig): MatDialogRef<ConfirmationModalComponent> {
    this.confirmationDialogRef = this.dialog.open(ConfirmationModalComponent, {
      ...dialogConfig,
    });

    this.confirmationDialogRef.afterClosed().subscribe((response: unknown) => {
      // Do something in the service level. ( All components )
    });

    return this.confirmationDialogRef;
  }

  confirmationRedirect(dialogConfig: MatDialogConfig): MatDialogRef<ConfirmRedirectComponent> {
    this.confirmRedirectRef = this.dialog.open(ConfirmRedirectComponent, {
      ...dialogConfig,
    });
    return this.confirmRedirectRef;
  }

  errorOpen(dialogConfig: MatDialogConfig): MatDialogRef<GenericErrorComponent> {
    this.errorDialogRef = this.dialog.open(GenericErrorComponent, {
      ...dialogConfig,
    });

    this.errorDialogRef.afterClosed().subscribe((response: unknown) => {
      // Do something in the service level. ( All components )
    });

    return this.errorDialogRef;
  }

  /**
   * Shows dialog explaining error. Also closes the spinner if active
   * @param err the error object
   * @param title display as "Error (title)"
   * @param bodyText displays as "We ran in to an error (bodyText). Please try again"
   */
  standardError(err: any, title: String, bodyText: String) {
    this.closeSpinner()
    console.log("Error:",title, err);
    this.errorOpen({
        panelClass: 'delete-modal',
        width: '600px',
        data: {
            messageHeader: "Error "+title,
            messageBody: `We ran into an error ${bodyText}. Please try again if needed and let us know if this error continues`,
        },
    })
  }
  /**
   * Shows dialog explaining error. Also closes the spinner if active
   * @param err the error object
   * @param title display as "Error (title)"
   * @param bodyText displays as "We ran in to an error (bodyText)."
   */
  standardInputError(err: any, title: String, bodyText: String) {
    this.closeSpinner()
    console.log("Error:",title, err);
    this.errorOpen({
        panelClass: 'delete-modal',
        width: '600px',
        data: {
            messageHeader: "Error "+title,
            messageBody: `${bodyText}`,
        },
    })
  }

  openSpinner() {
    if (!this.spinner)
      this.spinner = this.dialog.open(ProgressSpinnerComponent, {
        panelClass: 'transparent',
        disableClose: true
      });
  }

  closeSpinner() {
    if (this.spinner)
      this.spinner.close();
    this.spinner = undefined;
  }

  closeAll() {
    this.dialog.closeAll()
  }
}