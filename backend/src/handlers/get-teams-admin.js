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
 * GET /teams/admin
 *
 * Scans all users and groups them into:
 *   - orgTeams: OrgTeamGroup[] (grouped by teamName)
 *   - pmTeams:  PmTeamGroup[]  (grouped by entries in each user's pmTeams array)
 *
 * Response shape: AdminTeamData
 * {
 *   orgTeams: [{ teamName: string|null, users: TeamSummaryUser[] }],
 *   pmTeams:  [{ teamId: string, teamName: string, users: TeamSummaryUser[] }]
 * }
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

  try {
    // Scan all users – this table is small (internal employee list)
    const result = await dynamoDb.scan({ TableName: tableName }).promise();
    const users = (result.Items || []).map(sanitizeUser);

    // Group by teamName (null/missing → "Unassigned" bucket keyed as null)
    const orgTeamMap = new Map();
    // Group by PM team name
    const pmTeamMap = new Map();

    for (const user of users) {
      const teamName = user.teamName !== undefined ? user.teamName : null;

      if (!orgTeamMap.has(teamName)) {
        orgTeamMap.set(teamName, []);
      }
      orgTeamMap.get(teamName).push(user);

      for (const pmTeamName of (user.pmTeams || [])) {
        if (!pmTeamMap.has(pmTeamName)) {
          pmTeamMap.set(pmTeamName, { teamName: pmTeamName, users: [] });
        }
        pmTeamMap.get(pmTeamName).users.push(user);
      }
    }

    const orgTeams = Array.from(orgTeamMap.entries()).map(([teamName, teamUsers]) => ({
      teamName,
      users: teamUsers
    }));

    const pmTeams = Array.from(pmTeamMap.entries()).map(([teamId, { teamName, users: teamUsers }]) => ({
      teamId,
      teamName,
      users: teamUsers
    }));

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ orgTeams, pmTeams })
    };
  } catch (error) {
    console.error('get-teams-admin error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
