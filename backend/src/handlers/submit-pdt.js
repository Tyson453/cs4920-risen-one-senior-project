'use strict';

const AWS = require('aws-sdk');

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

/**
 * POST /pdt/{pdtId}/submit
 * Transitions a PDT from DRAFT or CHANGES_REQUESTED → PENDING_APPROVAL.
 * Clears any previous supervisorComments on re-submission.
 */
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

  // Fetch existing record to validate status
  let existing;
  try {
    const result = await dynamoDb.get({ TableName: tableName, Key: { pdtId } }).promise();
    existing = result.Item;
  } catch (error) {
    console.error('submit-pdt fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PDT record not found' }) };
  }

  if (!SUBMITTABLE_STATUSES.includes(existing.status)) {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `PDT with status "${existing.status}" cannot be submitted for approval` })
    };
  }

  // Look up the employee's supervisorId to store on the PDT record
  let supervisorId = '';
  const usersTable = process.env.USERS_TABLE;
  if (usersTable && existing.userId) {
    try {
      const userResult = await dynamoDb.get({ TableName: usersTable, Key: { uuid: existing.userId } }).promise();
      supervisorId = userResult.Item?.supervisorId || '';
    } catch (e) {
      console.warn('submit-pdt: could not fetch supervisorId for user', existing.userId, e.message);
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { pdtId },
      UpdateExpression: 'SET #status = :status, supervisorComments = :empty, supervisorId = :supervisorId',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'PENDING_APPROVAL',
        ':empty': '',
        ':supervisorId': supervisorId
      }
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'PDT submitted for approval' })
    };
  } catch (error) {
    console.error('submit-pdt error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
