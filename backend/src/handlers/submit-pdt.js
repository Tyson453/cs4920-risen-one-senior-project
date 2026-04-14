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

const SUBMITTABLE_STATUSES = ['DRAFT', 'CHANGES_REQUESTED'];

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  const tableName = process.env.PDT_TABLE;

  if (!tableName) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  const pdtId = event.pathParameters?.pdtId;

  if (!pdtId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'pdtId path parameter is required' })
    };
  }

  let existing;

  try {
    const result = await dynamoDb.get({
      TableName: tableName,
      Key: { pdtId }
    }).promise();

    existing = result.Item;
  } catch (error) {
    console.error('submit-pdt fetch error:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  if (!existing) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'PDT record not found' })
    };
  }

  if (!SUBMITTABLE_STATUSES.includes(existing.status)) {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: `PDT with status "${existing.status}" cannot be submitted for approval`
      })
    };
  }

  let supervisorId = '';
  let employee = null;
  let supervisor = null;

  const usersTable = process.env.USERS_TABLE;

  if (usersTable && existing.userId) {
    try {
      const userResult = await dynamoDb.get({
        TableName: usersTable,
        Key: { uuid: existing.userId }
      }).promise();

      employee = userResult.Item || null;
      supervisorId = employee?.supervisorId || '';
    } catch (e) {
      console.warn('submit-pdt: could not fetch supervisorId for user', existing.userId, e.message);
    }
  }

  if (!supervisorId && event.requestContext?.authorizer?.uuid) {
    supervisorId = event.requestContext.authorizer.uuid;
  }

  if (usersTable && supervisorId) {
    try {
      const supervisorResult = await dynamoDb.get({
        TableName: usersTable,
        Key: { uuid: supervisorId }
      }).promise();

      supervisor = supervisorResult.Item || null;
    } catch (e) {
      console.warn('submit-pdt: could not fetch supervisor user record', supervisorId, e.message);
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { pdtId },
      UpdateExpression: 'SET #status = :status, supervisorComments = :empty, supervisorId = :supervisorId',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'PENDING_APPROVAL',
        ':empty': '',
        ':supervisorId': supervisorId
      }
    }).promise();

    if (supervisor?.email) {
      const employeeName =
        employee?.name ||
        [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') ||
        existing.userId;

      const subject = 'PDT Request Submitted';
      const text = `Hello,

A PDT request has been submitted and is awaiting your review.

Employee: ${employeeName}
PDT ID: ${pdtId}
Status: PENDING_APPROVAL

Please log in to review the request.`;

      try {
        await sendEmail(supervisor.email, subject, text);
      } catch (emailError) {
        console.error('submit-pdt email error:', emailError);
      }
    } else {
      console.warn('submit-pdt: supervisor email not found, skipping email send', {
        supervisorId
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'PDT submitted for approval'
      })
    };
  } catch (error) {
    console.error('submit-pdt error:', error);

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};