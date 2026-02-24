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

/**
 * PUT /teams/{type}/{teamName}
 *
 * Renames a team across all user records.
 *
 * Path params:
 *   type     – 'org' | 'pm'
 *   teamName – current team name (URL-encoded)
 *
 * Body: { newName: string }
 *
 * For 'org': queries TeamNameIndex → updates teamName on each matched user.
 * For 'pm':  scans users where pmTeams contains teamName → replaces the name
 *            in each user's pmTeams array.
 *
 * Returns: { type, oldName, newName, updatedCount }
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
  const oldName = decodeURIComponent(encodedTeamName || '');

  if (!type || !['org', 'pm'].includes(type)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'type must be "org" or "pm"' }) };
  }
  if (!oldName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'teamName path parameter is required' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const newName = (body.newName || '').trim();
  if (!newName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'newName is required' }) };
  }
  if (newName === oldName) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'newName must differ from current name' }) };
  }

  try {
    let usersToUpdate = [];

    if (type === 'org') {
      // Fetch all users with this teamName via the GSI
      let lastKey;
      do {
        const params = {
          TableName: tableName,
          IndexName: 'TeamNameIndex',
          KeyConditionExpression: 'teamName = :name',
          ExpressionAttributeValues: { ':name': oldName },
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const result = await dynamoDb.query(params).promise();
        usersToUpdate = usersToUpdate.concat(result.Items || []);
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);

      // Update teamName on each user
      for (const user of usersToUpdate) {
        await dynamoDb.update({
          TableName: tableName,
          Key: { uuid: user.uuid },
          UpdateExpression: 'SET teamName = :newName',
          ExpressionAttributeValues: { ':newName': newName }
        }).promise();
      }
    } else {
      // Scan for users whose pmTeams contains the old name
      let lastKey;
      do {
        const params = {
          TableName: tableName,
          FilterExpression: 'contains(pmTeams, :name)',
          ExpressionAttributeValues: { ':name': oldName }
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const result = await dynamoDb.scan(params).promise();
        usersToUpdate = usersToUpdate.concat(result.Items || []);
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);

      // Replace the old name with the new name in each user's pmTeams array
      for (const user of usersToUpdate) {
        const updatedPmTeams = (user.pmTeams || []).map(t => (t === oldName ? newName : t));
        await dynamoDb.update({
          TableName: tableName,
          Key: { uuid: user.uuid },
          UpdateExpression: 'SET pmTeams = :pmTeams',
          ExpressionAttributeValues: { ':pmTeams': updatedPmTeams }
        }).promise();
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ type, oldName, newName, updatedCount: usersToUpdate.length })
    };
  } catch (error) {
    console.error('update-team error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
