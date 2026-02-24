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
 * DELETE /teams/{type}/{teamName}
 *
 * Removes a team from all user records (does not delete users).
 *
 * Path params:
 *   type     – 'org' | 'pm'
 *   teamName – team to delete (URL-encoded)
 *
 * For 'org': queries TeamNameIndex → removes the teamName attribute from each user.
 * For 'pm':  scans users where pmTeams contains the name → removes the name from
 *            each user's pmTeams array.
 *
 * Returns: { type, teamName, clearedCount }
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

  try {
    let usersToUpdate = [];

    if (type === 'org') {
      // Query TeamNameIndex to find all members
      let lastKey;
      do {
        const params = {
          TableName: tableName,
          IndexName: 'TeamNameIndex',
          KeyConditionExpression: 'teamName = :name',
          ExpressionAttributeValues: { ':name': teamName }
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const result = await dynamoDb.query(params).promise();
        usersToUpdate = usersToUpdate.concat(result.Items || []);
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);

      // Remove teamName attribute from each user
      for (const user of usersToUpdate) {
        await dynamoDb.update({
          TableName: tableName,
          Key: { uuid: user.uuid },
          UpdateExpression: 'REMOVE teamName'
        }).promise();
      }
    } else {
      // Scan for users whose pmTeams contains the team name
      let lastKey;
      do {
        const params = {
          TableName: tableName,
          FilterExpression: 'contains(pmTeams, :name)',
          ExpressionAttributeValues: { ':name': teamName }
        };
        if (lastKey) params.ExclusiveStartKey = lastKey;
        const result = await dynamoDb.scan(params).promise();
        usersToUpdate = usersToUpdate.concat(result.Items || []);
        lastKey = result.LastEvaluatedKey;
      } while (lastKey);

      // Remove the team name from each user's pmTeams array
      for (const user of usersToUpdate) {
        const updatedPmTeams = (user.pmTeams || []).filter(t => t !== teamName);
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
      body: JSON.stringify({ type, teamName, clearedCount: usersToUpdate.length })
    };
  } catch (error) {
    console.error('delete-team error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
