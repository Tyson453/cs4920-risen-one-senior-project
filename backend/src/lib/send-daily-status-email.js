'use strict';

/**
 * Helper for sending Daily Status emails via SES.
 * Mirrors the behavior of send-onboarding-email with additional guards:
 * - Only sends if SES_FROM_EMAIL is configured
 * - And ALLOW_SEND_EMAIL_LOCAL is truthy (e.g., 'true')
 */

async function sendDailyStatusEmail({ toEmail, subject, textBody, htmlBody }) {
  const fromEmail = process.env.SES_FROM_EMAIL;
  const allowLocal = process.env.ALLOW_SEND_EMAIL_LOCAL;

  const payload = {
    fromEmail,
    toEmail,
    subject,
    textBody,
    htmlBody,
  };

  // In dev or when email is not fully configured, log and return success.
  if (!fromEmail || !allowLocal) {
    console.log('[DEV] Daily Status email (not sent):', {
      to: toEmail,
      subject,
      hasText: !!textBody,
      hasHtml: !!htmlBody,
    });
    return { success: true };
  }

  try {
    const AWS = require('aws-sdk');
    const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-2' });

    const params = {
      Source: fromEmail,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject || 'Daily Status Report' },
        Body: {},
      },
    };

    if (htmlBody) {
      params.Message.Body.Html = { Data: htmlBody };
    } else {
      params.Message.Body.Text = { Data: textBody || '' };
    }

    await ses.sendEmail(params).promise();
    return { success: true };
  } catch (err) {
    console.error('SES Daily Status send failed:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendDailyStatusEmail };

