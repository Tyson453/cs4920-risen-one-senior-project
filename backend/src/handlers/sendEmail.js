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
  return transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;