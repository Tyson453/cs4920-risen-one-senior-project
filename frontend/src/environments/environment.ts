// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  state: 'local',
  production: false,
  // Base URL including the stage path; switch to production URL when deploying
  apiUrl: 'https://c3564syk0i.execute-api.us-east-2.amazonaws.com/dev',
  //apiUrl: 'http://localhost:3000/dev',
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

// import 'zone.js/plugins/zone-error';