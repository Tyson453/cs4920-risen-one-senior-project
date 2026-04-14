'use strict';

const AWS = require('aws-sdk');
const sendEmail = require('./sendEmail');

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

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.PTO_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  const ptoId = event.pathParameters?.ptoId;
  if (!ptoId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'ptoId path parameter is required' }) };
  }

  let existing;

  try {
    const result = await dynamoDb.get({ TableName: tableName, Key: { ptoId } }).promise();
    existing = result.Item;
  } catch (error) {
    console.error('approve-pto fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PTO request not found' }) };
  }

  if (existing.status !== 'PENDING') {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Only PENDING PTO requests can be approved' })
    };
  }

  let employee = null;
  const usersTable = process.env.USERS_TABLE;

  if (usersTable && existing.userId) {
    try {
      const userResult = await dynamoDb.get({
        TableName: usersTable,
        Key: { uuid: existing.userId }
      }).promise();

      employee = userResult.Item || null;
    } catch (e) {
      console.warn('approve-pto: could not fetch employee record', existing.userId, e.message);
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { ptoId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': 'APPROVED' }
    }).promise();

    if (employee?.email) {
      const employeeName =
        employee?.name ||
        [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
        existing.userId;

      const subject = 'PTO Request Approved';
      const text = `Hello ${employeeName},

Your PTO request has been approved.

PTO ID: ${ptoId}
Status: APPROVED

Please log in if you need more details.`;

      try {
        await sendEmail(employee.email, subject, text);
      } catch (emailError) {
        console.error('approve-pto email error:', emailError);
      }
    } else {
      console.warn('approve-pto: employee email not found, skipping email send', {
        userId: existing.userId
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'PTO request approved' })
    };
  } catch (error) {
    console.error('approve-pto error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};