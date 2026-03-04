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
 * POST /pdt/{pdtId}/approve
 * Supervisor approves a PDT record.
 * Body: { supervisorSignature: string }
 * Transitions PENDING_APPROVAL → APPROVED and records the supervisor's signature.
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

  // Fetch existing record to validate status
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
