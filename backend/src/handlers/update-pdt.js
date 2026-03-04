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
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
  'Content-Type': 'application/json'
};

const EDITABLE_STATUSES = ['DRAFT', 'CHANGES_REQUESTED'];
const UPDATABLE_FIELDS = [
  'empName', 'shortTermGoals', 'mediumTermGoals', 'longTermGoals',
  'developmentNeeds', 'actionPlan', 'empSignature'
];

/**
 * PUT /pdt/{pdtId}
 * Updates a PDT record. Only allowed when status is DRAFT or CHANGES_REQUESTED.
 * Body: { empName?, shortTermGoals?, mediumTermGoals?, longTermGoals?,
 *         developmentNeeds?, actionPlan?, empSignature? }
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

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  // Fetch existing record to check status
  let existing;
  try {
    const result = await dynamoDb.get({ TableName: tableName, Key: { pdtId } }).promise();
    existing = result.Item;
  } catch (error) {
    console.error('update-pdt fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PDT record not found' }) };
  }

  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: `PDT record with status "${existing.status}" cannot be edited` })
    };
  }

  // Build update expression from allowed fields
  const updates = UPDATABLE_FIELDS.filter(f => Object.hasOwn(body, f));
  if (updates.length === 0) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No updatable fields provided' }) };
  }

  const updateExpression = 'SET ' + updates.map(f => `#${f} = :${f}`).join(', ');
  const expressionAttributeNames = Object.fromEntries(updates.map(f => [`#${f}`, f]));
  const expressionAttributeValues = Object.fromEntries(updates.map(f => [`:${f}`, body[f]]));

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { pdtId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('update-pdt error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
