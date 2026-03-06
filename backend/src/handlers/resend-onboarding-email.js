'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');

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
  for (let i = 0; i < 14; i++) s += chars[bytes[i] % chars.length];
  return s;
}

function sanitizeForResponse(user) {
  const { password, ...rest } = user;
  return { ...rest, id: rest.uuid };
}

async function sendOnboardingEmail(toEmail, username, temporaryPassword, appBaseUrl) {
  const loginUrl = `${appBaseUrl || 'http://localhost:4200'}/login`;
  const body = `Welcome! Your account has been created.\n\nUsername: ${username}\nTemporary password: ${temporaryPassword}\n\nSign in here: ${loginUrl}\n\nYou will be prompted to set a new password on first sign-in.`;
  if (process.env.SEND_ONBOARDING_EMAIL === 'true') {
    try {
      const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-2' });
      await ses.sendEmail({
        Source: process.env.SES_FROM_EMAIL || 'noreply@example.com',
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: 'Your account – Risen One' },
          Body: { Text: { Data: body } },
        },
      }).promise();
      return { success: true, actuallySent: true };
    } catch (err) {
      console.error('SES send failed:', err);
      return { success: false };
    }
  }
  console.log('[DEV] Onboarding email (not sent):', { to: toEmail, username, loginUrl, tempPasswordLength: temporaryPassword.length });
  return { success: true, actuallySent: false };
}

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const uuid = event.pathParameters && event.pathParameters.uuid;
  if (!uuid) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'uuid path parameter is required' }),
    };
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

  try {
    const getResult = await dynamoDb.get({
      TableName: tableName,
      Key: { uuid },
    }).promise();

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User not found' }),
      };
    }

    const user = getResult.Item;
    if (user.onboardingStatus === 'onboarding_complete') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User has already completed onboarding' }),
      };
    }

    const temporaryPasswordPlain = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPasswordPlain, 10);
    const emailResult = await sendOnboardingEmail(
      user.email,
      user.username,
      temporaryPasswordPlain,
      appBaseUrl
    );
    const onboardingStatus = emailResult.actuallySent ? 'email_sent' : (emailResult.success ? 'email_skipped' : 'email_failed');

    await dynamoDb.update({
      TableName: tableName,
      Key: { uuid },
      UpdateExpression: 'SET password = :p, temporaryPassword = :tp, onboardingStatus = :os',
      ExpressionAttributeValues: {
        ':p': passwordHash,
        ':tp': true,
        ':os': onboardingStatus,
      },
    }).promise();

    const updatedUser = { ...user, password: passwordHash, temporaryPassword: true, onboardingStatus };
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(sanitizeForResponse(updatedUser)),
    };
  } catch (err) {
    console.error('resend-onboarding-email error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
