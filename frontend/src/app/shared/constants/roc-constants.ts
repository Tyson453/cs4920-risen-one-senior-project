import { FormControl, ValidationErrors } from '@angular/forms';

export class RocConstants {
  public static IS_AUTHORIZED = false;

  public static FORM_VALIDATORS = {
    ALPHA: /^[a-zA-Z]*$/,
    ALPHA_SPACE: /^[a-zA-Z ]*$/,
    ALPHA_SPACE_SPEC_CHAR: /^[a-zA-Z &]*$/,
    NUMERIC: /^[0-9]*$/,
    ALPHA_NUM: /^[a-zA-Z0-9]*/,
    ALPHA_NUM_SPACE: /^[a-zA-Z0-9 ]*/,
    DATE: (ctrl: FormControl): ValidationErrors | null => {
      const myDate = new Date(ctrl.value);
      return !ctrl.value ||
        isNaN(myDate.getTime()) ||
        myDate.getFullYear() > 9999
        ? { dateInvalid: true }
        : null;
    },
  };
  public static ADMIN_ROUTES = {
    USERS: '/admin/users',
    ADMIN: '/admin',
    DELETE: '/delete',
    NEWPROJECT: '/newproject',
  };

  public static APIS = {
    USER: 'users',
    PROJECTS: 'projects',
    REPORTS: 'reports',
    ALERTS: 'alerts',
    SPECIALTIES: 'specialties',
    REASONS: 'reasons',
    PTO: 'pto',
    SEND_EMAIL: 'send-email',
    PDT: '/PDT',
    EXECUTIVESUMMARY: '/executiveSummary',
    TIMESHEET: 'timesheet',
    ALERTSAUDIT: 'auditAlerts',
    CERTIFICATIONAUDIT: 'auditCertification',
    DAILYSTATUSAUDIT: 'auditDailyStatus',
    DEVELOPMENTAUDIT: 'auditDevelopments',
    FITNESSAUDIT: 'auditFitness',
    PROJECTSAUDIT: 'auditProjects',
    REASONSAUDIT: 'auditReasons',
    REPORTSAUDIT: 'auditReports',
    SPECIALTIESAUDIT: 'auditSpecialties',
    TIMESHEETAUDIT: 'auditTimeSheets',
    USERSAUDIT: 'auditUsers',
  };

  public static CONFIRMATION_MODAL_MESSAGES = {
    USERS_COMPONENT: {
      DEACTIVATE: {
        TITLE: 'Disable User?',
        BODY: 'User and associated roles will be disabled.',
      },
      ACTIVATE: {
        TITLE: 'Enable User?',
        BODY: 'User and associated roles will be enabled.',
      },
    },
  };

  public static MODAL_WIDTHS = {
    SMALL: '200px',
    MEDIUM: '350px',
    LARGE: '500px',
  };

  public static SNACK_BAR = {
    TIMEOUT: 3000,
    POST_ERROR: 'Unable to add new record',
    PUT_ERROR: 'Unable to update record',
    DISMSS: 'Dismiss',
  };

  public static ERROR_COMPONENT_MESSAGING = {
    NO_DATA: 'No Data Available',
    API_FAILURE: "Something's up...",
    API_FAILURE_MESSAGE: 'Unable to retrieve data from the requested resource.',
  };

  public static EMP_ROUTES = {
    EMP: '/emp',
    REPORTS: '/reports',
    PROJECTS: '/projects',
    NEWREPORT: '/reports/newreport',
    EMAIL: '/email'
  };

  public static DAYS_OF_THE_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  public static DEFAULT_PROJECT = "Onboarding"
}
