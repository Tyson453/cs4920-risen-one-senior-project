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

const CODE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
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

  const { username, code, newPassword, confirmPassword } = body;

  if (!username || !code || !newPassword || !confirmPassword) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'username, code, newPassword, and confirmPassword are required' }),
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Passwords do not match' }),
    };
  }

  if (newPassword.length < 8) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Password must be at least 8 characters' }),
    };
  }

  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    console.error('Missing USERS_TABLE');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }

  try {
    const data = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'UsernameIndex',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': username },
    }).promise();

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid or expired code' }),
      };
    }

    const user = data.Items[0];

    if (!user.passwordResetCodeHash || !user.passwordResetRequestedAt) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid or expired code' }),
      };
    }

    const requestedAt = new Date(user.passwordResetRequestedAt).getTime();
    if (Date.now() - requestedAt > CODE_EXPIRY_MS) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid or expired code' }),
      };
    }

    const codeMatch = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!codeMatch) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid or expired code' }),
      };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await dynamoDb.update({
      TableName: tableName,
      Key: { uuid: user.uuid },
      UpdateExpression: 'SET password = :p REMOVE passwordResetCodeHash, passwordResetRequestedAt',
      ExpressionAttributeValues: {
        ':p': passwordHash,
      },
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Password updated successfully' }),
    };
  } catch (error) {
    console.error('complete-password-reset error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
