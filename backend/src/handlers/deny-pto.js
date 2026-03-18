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

/**
 * POST /pto/{ptoId}/deny
 * Transitions a PTO request from PENDING to DENIED with an optional denialReason.
 * Body: { reason?: string }
 */
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

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    // body is optional for deny
  }

  try {
    const existing = await dynamoDb.get({ TableName: tableName, Key: { ptoId } }).promise();
    if (!existing.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PTO request not found' }) };
    }
    if (existing.Item.status !== 'PENDING') {
      return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Only PENDING PTO requests can be denied' }) };
    }

    await dynamoDb.update({
      TableName: tableName,
      Key: { ptoId },
      UpdateExpression: 'SET #status = :status, denialReason = :reason',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'DENIED',
        ':reason': body.reason || ''
      }
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'PTO request denied' })
    };
  } catch (error) {
    console.error('deny-pto error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
