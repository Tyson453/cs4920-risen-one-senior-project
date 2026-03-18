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
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * GET /pto/supervisor/pending
 * Returns all PENDING PTO requests where supervisorId matches the JWT caller's uuid.
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.PTO_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  const supervisorId = event.requestContext && event.requestContext.authorizer
    ? event.requestContext.authorizer.uuid
    : '';

  if (!supervisorId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Could not determine supervisor identity from token' }) };
  }

  try {
    const result = await dynamoDb.scan({
      TableName: tableName,
      FilterExpression: '#status = :status AND supervisorId = :supervisorId',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'PENDING',
        ':supervisorId': supervisorId
      }
    }).promise();

    const records = (result.Items || []).sort((a, b) =>
      (b.createdTimestamp || '').localeCompare(a.createdTimestamp || '')
    );

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(records) };
  } catch (error) {
    console.error('get-pending-pto error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
