// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  state: 'local',
  production: false,
  rocApiUrl: 'https://9fraib9ale.execute-api.us-east-2.amazonaws.com',
  clientId: 'temp',
  calendarId: 'temp',
  adminCalendarId: 'temp',
  apiKey: 'temp',
  autoLogin: false,
  loginUrl: 'http://localhost:4200/login',
  userPoolId: 'us-east-1_temp',
  userPoolClientId: 'temp',
  identityPoolId: 'us-east-1:temp',
  domain: 'dev',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error'; // Included with Angular CLI.
