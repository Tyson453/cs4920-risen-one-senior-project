'use strict';

const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

function omitPassword(user) {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

function toResponseUser(user) {
  const sanitized = omitPassword(user);
  return {
    ...sanitized,
    id: sanitized.uuid,
  };
}

module.exports.handler = async (event) => {
  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Invalid request body' }),
    };
  }

  const { username, password } = requestBody;
  if (!username || !password) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Username and password are required' }),
    };
  }

  const tableName = process.env.USERS_TABLE;
  const jwtSecret = process.env.JWT_SECRET;
  if (!tableName || !jwtSecret) {
    console.error('Missing USERS_TABLE or JWT_SECRET');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
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

    if (!data.Items || data.Items.length === 0) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Invalid username or password' }),
      };
    }

    const user = data.Items[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        token,
        user: responseUser,
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
