'use strict';

require('dotenv').config();

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const sendEmail = require('./sendEmail');

const USER_FIELDS = [
  'uuid',
  'assignments',
  'birthday',
  'birthdayNoAcknowledge',
  'email',
  'firstName',
  'lastName',
  'maxHours',
  'maxSickHours',
  'name',
  'notes',
  'password',
  'pmTeams',
  'requestedPTO',
  'roles',
  'startDate',
  'startYear',
  'state',
  'supervisorId',
  'teamName',
  'username',
  'temporaryPassword',
  'onboardingStatus',
  'onboardingCompletedAt',
];

const REQUIRED_FIELDS_ONBOARDING = [
  'uuid',
  'email',
  'firstName',
  'lastName',
  'maxHours',
  'maxSickHours',
  'name',
  'roles',
  'startDate',
  'startYear',
  'state',
  'username',
];

const dynamoDbClientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbClientConfig.region = 'us-east-2';
  dynamoDbClientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbClientConfig.sslEnabled = false;
  dynamoDbClientConfig.credentials = new AWS.Credentials({
    accessKeyId: 'local',
    secretAccessKey: 'local',
  });
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbClientConfig);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const bytes = crypto.randomBytes(14);
  for (let i = 0; i < 14; i++) {
    s += chars[bytes[i] % chars.length];
  }
  return s;
}

function sanitizeForResponse(user) {
  const { password, ...rest } = user;
  return { ...rest, id: rest.uuid };
}

async function sendOnboardingEmail(toEmail, username, temporaryPassword, appBaseUrl) {
  const loginUrl = `${appBaseUrl || 'http://localhost:4200'}/login`;
  const subject = 'Your account – Risen One';
  const body = `Welcome! Your account has been created.

Username: ${username}
Temporary password: ${temporaryPassword}

Sign in here: ${loginUrl}

You will be prompted to set a new password on first sign-in.`;

  const isLocal = !!process.env.DYNAMODB_ENDPOINT;
  const allowLocalSend = process.env.ALLOW_SEND_EMAIL_LOCAL === 'true';

  if (!process.env.SES_SMTP_USER || !process.env.SES_SMTP_PASS || !process.env.SES_FROM_EMAIL) {
    console.warn('SES environment variables are missing. Skipping onboarding email.');
    return { success: false, actuallySent: false, error: 'Missing SES environment variables' };
  }

  if (!isLocal || allowLocalSend) {
    try {
      await sendEmail(toEmail, subject, body);
      return { success: true, actuallySent: true };
    } catch (err) {
      console.error('Failed to send onboarding email:', err);
      return { success: false, actuallySent: false, error: err.message };
    }
  }

  console.log('[DEV] Onboarding email not sent in local mode. Use this temp password to sign in:', {
    to: toEmail,
    username,
    loginUrl,
    tempPassword: temporaryPassword,
  });

  return { success: true, actuallySent: false };
}

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  let payload;
  try {
    const raw = event.body;
    if (raw !== undefined && raw !== null && typeof raw === 'object') {
      payload = raw;
    } else {
      payload = JSON.parse(typeof raw === 'string' ? raw : '{}');
    }
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid request body' }),
    };
  }

  try {
    const sendOnboardingEmailFlag = payload.sendOnboardingEmail !== false;
    const user = Object.fromEntries(
      Object.entries(payload).filter(([key]) => key !== 'sendOnboardingEmail' && USER_FIELDS.includes(key))
    );

    if (sendOnboardingEmailFlag) {
      if (!REQUIRED_FIELDS_ONBOARDING.every((field) => Object.hasOwn(user, field))) {
        return {
          statusCode: 422,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: 'Failed to create user: payload missing required fields for onboarding',
          }),
        };
      }
    } else {
      const requiredWithPassword = [...REQUIRED_FIELDS_ONBOARDING, 'password'];
      if (!requiredWithPassword.every((field) => Object.hasOwn(user, field))) {
        return {
          statusCode: 422,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'Failed to create user: payload missing required fields' }),
        };
      }
    }

    const tableName = process.env.USERS_TABLE;
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:4200';

    if (!tableName) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Internal server error' }),
      };
    }

    let temporaryPasswordPlain = null;

    if (sendOnboardingEmailFlag) {
      temporaryPasswordPlain = generateTemporaryPassword();
      user.password = await bcrypt.hash(temporaryPasswordPlain, 10);
      user.temporaryPassword = true;
    }

    try {
      await dynamoDb.put({
        TableName: tableName,
        Item: user,
      }).promise();
    } catch (e) {
      console.error('create-user DynamoDB put error:', e);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Failed to create user' }),
      };
    }

    if (sendOnboardingEmailFlag) {
      let emailResult = { success: true, actuallySent: false };

      try {
        emailResult = await sendOnboardingEmail(
          user.email,
          user.username,
          temporaryPasswordPlain,
          appBaseUrl
        );
      } catch (emailErr) {
        console.error('Onboarding email error:', emailErr);
        emailResult = { success: false, actuallySent: false };
      }

      user.onboardingStatus = emailResult.actuallySent
        ? 'email_sent'
        : emailResult.success
          ? 'email_skipped'
          : 'email_failed';

      try {
        await dynamoDb.update({
          TableName: tableName,
          Key: { uuid: user.uuid },
          UpdateExpression: 'SET onboardingStatus = :status',
          ExpressionAttributeValues: {
            ':status': user.onboardingStatus,
          },
        }).promise();
      } catch (updateErr) {
        console.error('Failed to update onboarding status:', updateErr);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(sanitizeForResponse(user)),
    };
  } catch (e) {
    console.error('create-user error:', e);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'Failed to create user',
        error: (e && e.message) || String(e),
      }),
    };
  }
};