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
 * POST /teams/{type}/{teamName}/members
 *
 * Assigns a user to a team.
 *
 * Path params:
 *   type     – 'org' | 'pm'
 *   teamName – team to join (URL-encoded)
 *
 * Body: { uuid: string }
 *
 * For 'org': sets user.teamName = teamName (replaces any prior org team).
 * For 'pm':  appends teamName to user.pmTeams if not already present.
 *
 * Returns: { type, teamName, uuid }
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  const { type, teamName: encodedTeamName } = event.pathParameters || {};
  const teamName = decodeURIComponent(encodedTeamName || '');

  if (!type || !['org', 'pm'].includes(type)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'type must be "org" or "pm"' }) };
  }
  if (!teamName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'teamName path parameter is required' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const { uuid } = body;
  if (!uuid) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'uuid is required' }) };
  }

  try {
    // Verify user exists
    const existing = await dynamoDb.get({ TableName: tableName, Key: { uuid } }).promise();
    if (!existing.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'User not found' }) };
    }

    if (type === 'org') {
      // Set the user's teamName (a user can only belong to one org team)
      await dynamoDb.update({
        TableName: tableName,
        Key: { uuid },
        UpdateExpression: 'SET teamName = :teamName',
        ExpressionAttributeValues: { ':teamName': teamName }
      }).promise();
    } else {
      // Append to pmTeams if not already a member
      const currentPmTeams = existing.Item.pmTeams || [];
      if (currentPmTeams.includes(teamName)) {
        return {
          statusCode: 409,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: `User is already a member of PM team "${teamName}"` })
        };
      }
      await dynamoDb.update({
        TableName: tableName,
        Key: { uuid },
        UpdateExpression: 'SET pmTeams = :pmTeams',
        ExpressionAttributeValues: { ':pmTeams': [...currentPmTeams, teamName] }
      }).promise();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ type, teamName, uuid })
    };
  } catch (error) {
    console.error('assign-team-member error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
