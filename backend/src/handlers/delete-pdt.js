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
  'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * DELETE /pdt/{pdtId}
 * Deletes a PDT record. Only allowed when status is DRAFT.
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
    console.error('delete-pdt fetch error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  if (!existing) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'PDT record not found' }) };
  }

  if (existing.status !== 'DRAFT') {
    return {
      statusCode: 409,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Only DRAFT PDT records can be deleted' })
    };
  }

  try {
    await dynamoDb.delete({ TableName: tableName, Key: { pdtId } }).promise();
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  } catch (error) {
    console.error('delete-pdt error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
