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
 * DELETE /teams/{type}/{teamName}/members/{uuid}
 *
 * Removes a specific user from a team.
 *
 * Path params:
 *   type     – 'org' | 'pm'
 *   teamName – team to leave (URL-encoded)
 *   uuid     – user to remove
 *
 * For 'org': removes the teamName attribute from the user record.
 * For 'pm':  removes teamName from the user's pmTeams array.
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

  const { type, teamName: encodedTeamName, uuid } = event.pathParameters || {};
  const teamName = decodeURIComponent(encodedTeamName || '');

  if (!type || !['org', 'pm'].includes(type)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'type must be "org" or "pm"' }) };
  }
  if (!teamName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'teamName path parameter is required' }) };
  }
  if (!uuid) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'uuid path parameter is required' }) };
  }

  try {
    // Verify user exists
    const existing = await dynamoDb.get({ TableName: tableName, Key: { uuid } }).promise();
    if (!existing.Item) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ message: 'User not found' }) };
    }

    if (type === 'org') {
      // Only remove if the user's current teamName matches (avoid accidental clears)
      if (existing.Item.teamName !== teamName) {
        return {
          statusCode: 409,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: `User is not a member of org team "${teamName}"` })
        };
      }
      await dynamoDb.update({
        TableName: tableName,
        Key: { uuid },
        UpdateExpression: 'REMOVE teamName'
      }).promise();
    } else {
      const currentPmTeams = existing.Item.pmTeams || [];
      if (!currentPmTeams.includes(teamName)) {
        return {
          statusCode: 409,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: `User is not a member of PM team "${teamName}"` })
        };
      }
      const updatedPmTeams = currentPmTeams.filter(t => t !== teamName);
      await dynamoDb.update({
        TableName: tableName,
        Key: { uuid },
        UpdateExpression: 'SET pmTeams = :pmTeams',
        ExpressionAttributeValues: { ':pmTeams': updatedPmTeams }
      }).promise();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ type, teamName, uuid })
    };
  } catch (error) {
    console.error('remove-team-member error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
