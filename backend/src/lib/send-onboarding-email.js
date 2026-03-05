'use strict';

/**
 * Sends onboarding email with username, temporary password, and login URL.
 * In dev/local: logs to console and returns success.
 * In production: set SEND_ONBOARDING_EMAIL=true and configure AWS SES (region, etc.) to send real email.
 */
async function sendOnboardingEmail(toEmail, username, temporaryPassword, appBaseUrl) {
  const loginUrl = `${appBaseUrl || 'http://localhost:4200'}/login`;
  const body = `Welcome! Your account has been created.\n\nUsername: ${username}\nTemporary password: ${temporaryPassword}\n\nSign in here: ${loginUrl}\n\nYou will be prompted to set a new password on first sign-in.`;

  if (process.env.SEND_ONBOARDING_EMAIL === 'true') {
    try {
      const AWS = require('aws-sdk');
      const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-2' });
      await ses.sendEmail({
        Source: process.env.SES_FROM_EMAIL || 'noreply@example.com',
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: 'Your account – Risen One' },
          Body: {
            Text: { Data: body },
          },
        },
      }).promise();
      return { success: true };
    } catch (err) {
      console.error('SES send failed:', err);
      return { success: false, error: err.message };
    }
  }

  console.log('[DEV] Onboarding email (not sent):', { to: toEmail, username, loginUrl, tempPasswordLength: temporaryPassword.length });
  return { success: true };
}

module.exports = { sendOnboardingEmail };
