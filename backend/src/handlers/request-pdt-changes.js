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

  const tableName = process.env.PDT_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  const pdtId = event.pathParameters && event.pathParameters.pdtId;
  if (!pdtId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'pdtId path parameter is required' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  let existing;
  try {
    const result = await dynamoDb.get({ TableName: tableName, Key: { pdtId } }).promise();
    existing = result.Item;
  } catch (error) {
    console.error('request-pdt-changes fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PDT record not found' }) };
  }

  if (existing.status !== 'PENDING_APPROVAL') {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `PDT with status "${existing.status}" cannot have changes requested` })
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
      console.warn('request-pdt-changes: could not fetch employee record', existing.userId, e.message);
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { pdtId },
      UpdateExpression: 'SET #status = :status, supervisorComments = :comments',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'CHANGES_REQUESTED',
        ':comments': body.comments || ''
      }
    }).promise();

    if (employee?.email) {
      const employeeName =
        employee?.name ||
        [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
        existing.userId;

      const subject = 'PDT Request Needs Changes';
      const text = `Hello ${employeeName},

Your PDT request needs changes before it can be approved.

PDT ID: ${pdtId}
Status: CHANGES_REQUESTED
Supervisor Comments: ${body.comments || 'No comments provided.'}

Please log in to review and update your request.`;

      try {
        await sendEmail(employee.email, subject, text);
      } catch (emailError) {
        console.error('request-pdt-changes email error:', emailError);
      }
    } else {
      console.warn('request-pdt-changes: employee email not found, skipping email send', {
        userId: existing.userId
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Changes requested successfully' })
    };
  } catch (error) {
    console.error('request-pdt-changes error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};