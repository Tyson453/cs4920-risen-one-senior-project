'use strict';

const nodemailer = require('nodemailer');

async function sendEmail(to, subject, text) {
  const transporter = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-2.amazonaws.com',
    port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;