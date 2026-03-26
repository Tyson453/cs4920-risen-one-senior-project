'use strict';

const AWS = require('aws-sdk');
const { randomUUID } = require('crypto');

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

/**
 * POST /pto
 * Creates a new PTO request with status PENDING.
 * Looks up the employee's supervisorId from the users table.
 * Body: { userId, employeeName, startDate, endDate, type, reason }
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.PTO_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  if (!body.userId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'userId is required' }) };
  }
  if (!body.startDate || !body.endDate) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'startDate and endDate are required' }) };
  }

  let supervisorId = '';
  const usersTable = process.env.USERS_TABLE;
  if (usersTable && body.userId) {
    try {
      const userResult = await dynamoDb.get({ TableName: usersTable, Key: { uuid: body.userId } }).promise();
      supervisorId = userResult.Item?.supervisorId || '';
    } catch (e) {
      console.warn('create-pto: could not fetch supervisorId for user', body.userId, e.message);
    }
  }

  const now = new Date();
  const ptoId = randomUUID();

  const item = {
    ptoId,
    userId: body.userId,
    employeeName: body.employeeName || '',
    supervisorId,
    startDate: body.startDate,
    endDate: body.endDate,
    type: body.type || 'PTO',
    reason: body.reason || '',
    status: 'PENDING',
    denialReason: '',
    createdDate: now.toLocaleDateString('en-US'),
    createdTimestamp: now.toISOString()
  };

  try {
    await dynamoDb.put({ TableName: tableName, Item: item }).promise();
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, id: ptoId, item })
    };
  } catch (error) {
    console.error('create-pto error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
