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

module.exports = sendEmail;