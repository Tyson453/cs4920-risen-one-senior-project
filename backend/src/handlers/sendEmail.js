'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'email-smtp.us-east-2.amazonaws.com',
  port: 587,
  secure: false,
  auth: {
    user: 'YOUR_SMTP_USERNAME',
    pass: 'YOUR_SMTP_PASSWORD',
  },
});

async function sendEmail(to, subject, text) {
  return transporter.sendMail({
    from: 'YOUR_VERIFIED_EMAIL',
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;