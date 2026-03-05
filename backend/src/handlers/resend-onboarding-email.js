'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { sendOnboardingEmail } = require('../lib/send-onboarding-email');

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
    const onboardingStatus = emailResult.success ? 'email_sent' : 'email_failed';

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
