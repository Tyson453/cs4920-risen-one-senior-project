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
 * Returns all org and PM teams, including empty ones, grouped with their members.
 *
 * TeamsTable is the authoritative source for which teams exist — this ensures
 * teams with 0 members are always returned. Teams still referenced by user
 * records but not yet in TeamsTable (pre-migration data) are included as well.
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

  const usersTable = process.env.USERS_TABLE;
  const teamsTable = process.env.TEAMS_TABLE;
  if (!usersTable || !teamsTable) {
    console.error('Missing USERS_TABLE or TEAMS_TABLE env var');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  try {
    // Fetch all three data sources in parallel.
    const [usersResult, orgTeamsResult, pmTeamsResult] = await Promise.all([
      dynamoDb.scan({ TableName: usersTable }).promise(),
      dynamoDb.query({
        TableName: teamsTable,
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':type': 'org' }
      }).promise(),
      dynamoDb.query({
        TableName: teamsTable,
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':type': 'pm' }
      }).promise()
    ]);

    const users = (usersResult.Items || []).map(sanitizeUser);

    // Build user membership maps from the users scan.
    const orgUserMap = new Map();   // teamName → TeamSummaryUser[]
    const pmUserMap = new Map();    // teamName → TeamSummaryUser[]
    const unassignedUsers = [];

    for (const user of users) {
      const teamName = user.teamName !== undefined ? user.teamName : null;

      if (teamName !== null) {
        if (!orgUserMap.has(teamName)) orgUserMap.set(teamName, []);
        orgUserMap.get(teamName).push(user);
      } else {
        unassignedUsers.push(user);
      }

      for (const pmTeamName of (user.pmTeams || [])) {
        if (!pmUserMap.has(pmTeamName)) pmUserMap.set(pmTeamName, []);
        pmUserMap.get(pmTeamName).push(user);
      }
    }

    // Build org teams: start from TeamsTable (preserves empty teams), then union
    // with any team names still in user records but not yet in TeamsTable.
    const orgTeamNames = new Set((orgTeamsResult.Items || []).map(t => t.teamName));
    for (const name of orgUserMap.keys()) {
      orgTeamNames.add(name);
    }
    const orgTeams = Array.from(orgTeamNames).map(teamName => ({
      teamName,
      users: orgUserMap.get(teamName) || []
    }));
    // Always include the "Unassigned" bucket for users with no org team.
    orgTeams.push({ teamName: null, users: unassignedUsers });

    // Build PM teams similarly.
    const pmTeamNames = new Set((pmTeamsResult.Items || []).map(t => t.teamName));
    for (const name of pmUserMap.keys()) {
      pmTeamNames.add(name);
    }
    const pmTeams = Array.from(pmTeamNames).map(teamName => ({
      teamId: teamName,
      teamName,
      users: pmUserMap.get(teamName) || []
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
