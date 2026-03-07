'use strict';

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

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const uuid = event.requestContext && event.requestContext.authorizer
    ? event.requestContext.authorizer.uuid
    : null;
  if (!uuid) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Unauthorized' }),
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

  const { newPassword, confirmPassword } = body;
  if (!newPassword || !confirmPassword) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'newPassword and confirmPassword are required' }),
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Passwords do not match' }),
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
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    await dynamoDb.update({
      TableName: tableName,
      Key: { uuid },
      UpdateExpression: 'SET password = :p, onboardingStatus = :os, onboardingCompletedAt = :at REMOVE temporaryPassword',
      ExpressionAttributeValues: {
        ':p': passwordHash,
        ':os': 'onboarding_complete',
        ':at': now,
      },
    }).promise();
  } catch (e) {
    console.error('set-password update error:', e);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Failed to update password' }),
    };
  }

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'Password updated successfully' }),
  };
};
