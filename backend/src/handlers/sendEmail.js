'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST || 'email-smtp.us-east-2.amazonaws.com',
  port: process.env.SES_SMTP_PORT || 587,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;