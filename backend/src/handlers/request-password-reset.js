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
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

const GENERIC_MESSAGE =
  'If an account with that username exists, a recovery code has been sent.';

function generateSixDigitCode() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, '0');
}

async function sendResetEmail(toEmail, username, code, appBaseUrl) {
  const resetUrl = `${appBaseUrl || 'http://localhost:4200'}/forgot-password`;

  const body = `
Hello ${username},

We received a request to reset your password.

Your recovery code: ${code}

Go here to reset your password:
${resetUrl}

This code expires in 15 minutes.

If you did not request this, ignore this email.

— Risen One Team
`;

  console.log('\n📧 Password Reset Email');
  console.log('To:', toEmail);
  console.log('Username:', username);
  console.log('Code:', code);
  console.log('Reset URL:', resetUrl);
  console.log('------------------------\n');

  if (process.env.SEND_PASSWORD_RESET_EMAIL === 'true') {
    try {
      const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-2' });

      await ses.sendEmail({
        Source: process.env.SES_FROM_EMAIL || 'noreply@example.com',
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: 'Password Reset – Risen One' },
          Body: {
            Text: { Data: body },
          },
        },
      }).promise();

      console.log('[EMAIL SENT]');
    } catch (err) {
      console.error('[EMAIL ERROR]:', err);
    }
  }

  return { success: true };
}

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid request body' }),
    };
  }

  const { username } = body;
  console.log('🔥 FUNCTION HIT - USERNAME:', username);

  if (!username) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Username is required' }),
    };
  }

  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }

  try {
    const data = await dynamoDb
      .scan({
        TableName: tableName,
        FilterExpression: '#u = :username',
        ExpressionAttributeNames: { '#u': 'username' },
        ExpressionAttributeValues: { ':username': username },
      })
      .promise();

    console.log('🔥 DB RESULT:', data.Items);

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: GENERIC_MESSAGE }),
      };
    }

    const user = data.Items[0];
    const code = generateSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date().toISOString();

    await dynamoDb
      .update({
        TableName: tableName,
        Key: { uuid: user.uuid },
        UpdateExpression:
          'SET passwordResetCodeHash = :hash, passwordResetRequestedAt = :ts',
        ExpressionAttributeValues: {
          ':hash': codeHash,
          ':ts': now,
        },
      })
      .promise();

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:4200';

    console.log('🔥 ABOUT TO CALL EMAIL FUNCTION');
    await sendResetEmail(user.email, username, code, appBaseUrl);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: GENERIC_MESSAGE }),
    };
  } catch (error) {
    console.error('request-password-reset error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};