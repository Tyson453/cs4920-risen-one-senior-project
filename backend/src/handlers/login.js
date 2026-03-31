'use strict';
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('./sendEmail');

// Configure DynamoDB client for local development
const dynamoDbClientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbClientConfig.region = 'us-east-2';
  dynamoDbClientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbClientConfig.sslEnabled = false;
  dynamoDbClientConfig.credentials = new AWS.Credentials({
    accessKeyId: 'local',
    secretAccessKey: 'local'
  });
}

const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbClientConfig);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};

function omitPassword(user) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function toResponseUser(user) {
  const sanitized = omitPassword(user);
  return {
    ...sanitized,
    id: sanitized.uuid,
    temporaryPassword: !!sanitized.temporaryPassword,
  };
}

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  console.log('=== Login attempt ===');
  console.log('Event body:', event.body);
  console.log('Event body type:', typeof event.body);

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
    console.log('Parsed request body:', requestBody);
  } catch (e) {
    console.log('JSON parse error:', e.message);
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid request body' }),
    };
  }

  const { username, password } = requestBody;
  console.log('Username:', username, 'Password length:', password?.length);

  if (!username || !password) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Username and password are required' }),
    };
  }

  const tableName = process.env.USERS_TABLE;
  const jwtSecret = process.env.JWT_SECRET;

  if (!tableName || !jwtSecret) {
    console.error('Missing USERS_TABLE or JWT_SECRET');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }

  try {
    const queryParams = {
      TableName: tableName,
      IndexName: 'UsernameIndex',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: { ':username': username },
    };

    const data = await dynamoDb.query(queryParams).promise();
    console.log('Query result:', data.Items?.length, 'users found');

    if (!data.Items || data.Items.length === 0) {
      console.log('No user found with username:', username);
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid username or password' }),
      };
    }

    const user = data.Items[0];
    console.log('User found:', user.username);

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', passwordMatch);

    if (!passwordMatch) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Invalid username or password' }),
      };
    }

    const claims = {
      uuid: user.uuid,
      username: user.username,
      roles: user.roles || [],
      name: user.name,
      email: user.email,
      assignments: user.assignments || [],
    };

    const token = jwt.sign(claims, jwtSecret, { expiresIn: '7d' });
    const responseUser = toResponseUser(user);

    console.log('Login successful for user:', username);

    if (user.email) {
      try {
        await sendEmail(
          user.email,
          'Login Notification',
          `Hello ${user.name || user.username},\n\nYou have successfully logged in to the system.\n\nIf this was not you, please contact support immediately.`
        );
        console.log('Login email sent successfully to:', user.email);
      } catch (emailError) {
        console.error('Failed to send login email:', emailError);
      }
    } else {
      console.warn('User has no email address. Skipping login email.');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        token,
        user: responseUser,
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};