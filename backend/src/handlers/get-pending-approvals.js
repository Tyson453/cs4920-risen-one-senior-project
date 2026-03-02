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
 * GET /pdt/supervisor/pending
 * Returns all PDT records with status=PENDING_APPROVAL where supervisorId matches
 * the calling user's UUID (read from the JWT authorizer context).
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.PDT_TABLE;
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
        ':status': 'PENDING_APPROVAL',
        ':supervisorId': supervisorId
      }
    }).promise();

    const records = (result.Items || []).sort((a, b) =>
      (b.createdTimestamp || '').localeCompare(a.createdTimestamp || '')
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(records)
    };
  } catch (error) {
    console.error('get-pending-approvals error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
