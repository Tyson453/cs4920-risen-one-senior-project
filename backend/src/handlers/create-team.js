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
 * POST /teams
 *
 * Validates that a team name is unique before it is used.
 * Since teams are stored as attributes on user records (no separate table),
 * "creating" a team means verifying the name is available so the caller can
 * safely proceed to assign members.
 *
 * Body: { type: 'org' | 'pm', teamName: string }
 *
 * For 'org': queries TeamNameIndex – fails if any user already has that teamName.
 * For 'pm':  scans users         – fails if any user already has that name in pmTeams.
 *
 * Returns: { type, teamName }
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const { type, teamName } = body;

  if (!type || !['org', 'pm'].includes(type)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'type must be "org" or "pm"' }) };
  }
  if (!teamName || typeof teamName !== 'string' || teamName.trim() === '') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'teamName is required' }) };
  }

  const name = teamName.trim();

  try {
    if (type === 'org') {
      // Query TeamNameIndex to check uniqueness
      const result = await dynamoDb.query({
        TableName: tableName,
        IndexName: 'TeamNameIndex',
        KeyConditionExpression: 'teamName = :name',
        ExpressionAttributeValues: { ':name': name },
        Limit: 1
      }).promise();

      if (result.Items && result.Items.length > 0) {
        return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ message: `Org team "${name}" already exists` }) };
      }
    } else {
      // Scan users and check each pmTeams array
      const result = await dynamoDb.scan({
        TableName: tableName,
        FilterExpression: 'contains(pmTeams, :name)',
        ExpressionAttributeValues: { ':name': name },
        Limit: 1
      }).promise();

      if (result.Items && result.Items.length > 0) {
        return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ message: `PM team "${name}" already exists` }) };
      }
    }

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ type, teamName: name })
    };
  } catch (error) {
    console.error('create-team error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
