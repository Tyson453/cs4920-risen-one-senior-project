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
    console.error('approve-pdt fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PDT record not found' }) };
  }

  if (existing.status !== 'PENDING_APPROVAL') {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `PDT with status "${existing.status}" cannot be approved` })
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
      console.warn('approve-pdt: could not fetch employee record', existing.userId, e.message);
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { pdtId },
      UpdateExpression: 'SET #status = :status, superSignature = :sig',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'APPROVED',
        ':sig': body.supervisorSignature || ''
      }
    }).promise();

    if (employee?.email) {
      const employeeName =
        employee?.name ||
        [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
        existing.userId;

      const subject = 'PDT Request Approved';
      const text = `Hello ${employeeName},

Your PDT request has been approved.

PDT ID: ${pdtId}
Status: APPROVED

Please log in if you need to review the details.`;

      try {
        await sendEmail(employee.email, subject, text);
      } catch (emailError) {
        console.error('approve-pdt email error:', emailError);
      }
    } else {
      console.warn('approve-pdt: employee email not found, skipping email send', {
        userId: existing.userId
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'PDT approved successfully' })
    };
  } catch (error) {
    console.error('approve-pdt error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};