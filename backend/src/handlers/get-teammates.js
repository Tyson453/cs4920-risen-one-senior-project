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

function sanitizeUser(user) {
  const { password, username, ...safe } = user;
  return safe;
}

/**
 * GET /teams/teammates
 *
 * Query parameters:
 *   teamName  – the caller's organisational team name (optional, may be "null" string)
 *   pmTeams   – comma-separated list of PM team names the caller belongs to (optional)
 *   excludeId – UUID of the calling user to exclude from results (optional)
 *
 * Logic (mirrors frontend stub):
 *   1. If pmTeams is provided and non-empty → return users who share ≥1 PM team
 *   2. Otherwise                            → return users with the same teamName
 *
 * Returns: TeamSummaryUser[]
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.USERS_TABLE;
  if (!tableName) {
    console.error('Missing USERS_TABLE env var');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  const params = event.queryStringParameters || {};
  const excludeId = params.excludeId || null;

  // Parse pmTeams query param: "PR22 Team,Project Alpha" → ['PR22 Team', 'Project Alpha']
  const pmTeamNames = params.pmTeams
    ? params.pmTeams.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // teamName query param; the string "null" means the user has no org team
  const teamNameParam = params.teamName;
  const teamName = (!teamNameParam || teamNameParam === 'null') ? null : teamNameParam;

  try {
    let users;

    if (pmTeamNames.length > 0) {
      // Strategy: scan and filter by pmTeams overlap
      // DynamoDB doesn't natively support "array contains any" queries, so we scan and filter
      const result = await dynamoDb.scan({ TableName: tableName }).promise();
      const pmTeamSet = new Set(pmTeamNames);
      users = (result.Items || [])
        .filter(u => (u.pmTeams || []).some(name => pmTeamSet.has(name)))
        .map(sanitizeUser);
    } else if (teamName !== null) {
      // Strategy: query TeamNameIndex for users with the same teamName
      const result = await dynamoDb.query({
        TableName: tableName,
        IndexName: 'TeamNameIndex',
        KeyConditionExpression: 'teamName = :teamName',
        ExpressionAttributeValues: { ':teamName': teamName }
      }).promise();
      users = (result.Items || []).map(sanitizeUser);
    } else {
      // No teamName and no pmTeams – return empty (user has no team context)
      users = [];
    }

    // Exclude the requesting user
    if (excludeId) {
      users = users.filter(u => u.uuid !== excludeId);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(users)
    };
  } catch (error) {
    console.error('get-teammates error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
