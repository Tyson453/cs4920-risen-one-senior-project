'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-2.amazonaws.com',
  port: Number(process.env.SES_SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

// Generic email sender
async function sendEmail(to, subject, text) {
  if (process.env.DYNAMODB_ENDPOINT) {
    console.log('\n📧 EMAIL (DEV MODE)');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Message:\n', text);
    console.log('------------------------\n');
    return;
  }

  return transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to,
    subject,
    text,
  });
}

// ✅ NEW FUNCTION: Forgot Password Email
async function sendResetEmail(to, username, code, appBaseUrl) {
  const subject = 'Password Reset Request';

  const message = `
Hello ${username},

We received a request to reset your password.

Your reset code is:
${code}

You can use this code to reset your password in the application.

Or visit:
${appBaseUrl}

If you did not request this, please ignore this email.

Thanks,
Team
`;

  return sendEmail(to, subject, message);
}

module.exports = {
  sendEmail,
  sendResetEmail,
};