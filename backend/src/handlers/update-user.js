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

// Fields that can be updated by an admin
const UPDATABLE_FIELDS = [
  'name',
  'email',
  'state',
  'startDate',
  'startYear',
  'roles',
  'assignments',
  'pmTeams',
  'supervisorId',
  'teamName',
  'maxHours',
  'maxSickHours',
];

const RELATED_SUPERVISOR_TABLES = [
  { envVar: 'PTO_TABLE', keyName: 'ptoId' },
  { envVar: 'PDT_TABLE', keyName: 'pdtId' }
];

async function getUserById(tableName, uuid) {
  const result = await dynamoDb.get({
    TableName: tableName,
    Key: { uuid }
  }).promise();

  return result.Item;
}

async function getAllItemsForUser(tableName, userId) {
  const items = [];
  let exclusiveStartKey;

  do {
    const result = await dynamoDb.query({
      TableName: tableName,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ExclusiveStartKey: exclusiveStartKey
    }).promise();

    items.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function syncSupervisorIdForUserRecords(userId, supervisorId) {
  const syncResults = [];

  for (const { envVar, keyName } of RELATED_SUPERVISOR_TABLES) {
    const tableName = process.env[envVar];
    if (!tableName) {
      continue;
    }

    const items = await getAllItemsForUser(tableName, userId);
    await Promise.all(items.map((item) => dynamoDb.update({
      TableName: tableName,
      Key: { [keyName]: item[keyName] },
      UpdateExpression: 'SET #supervisorId = :supervisorId',
      ConditionExpression: 'attribute_exists(#recordKey)',
      ExpressionAttributeNames: {
        '#supervisorId': 'supervisorId',
        '#recordKey': keyName
      },
      ExpressionAttributeValues: {
        ':supervisorId': supervisorId
      }
    }).promise()));

    syncResults.push({
      tableName,
      updatedCount: items.length
    });
  }

  return syncResults;
}

/**
 * PUT /users/{uuid}
 *
 * Updates allowed fields on a user record. Unknown or protected fields
 * (uuid, password, username) are silently ignored.
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

  const uuid = event.pathParameters && event.pathParameters.uuid;
  if (!uuid) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'uuid path parameter is required' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid request body' })
    };
  }

  // Filter to only updatable fields that are present in the payload
  const updates = Object.fromEntries(
    Object.entries(payload).filter(([key]) => UPDATABLE_FIELDS.includes(key))
  );

  if (Object.keys(updates).length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'No updatable fields provided' })
    };
  }

  // Build DynamoDB UpdateExpression dynamically
  const expressionParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  for (const [key, value] of Object.entries(updates)) {
    const nameAlias = `#${key}`;
    const valueAlias = `:${key}`;
    expressionParts.push(`${nameAlias} = ${valueAlias}`);
    expressionAttributeNames[nameAlias] = key;
    expressionAttributeValues[valueAlias] = value;
  }

  const updateExpression = 'SET ' + expressionParts.join(', ');

  let supervisorIdChanged = false;
  if (Object.prototype.hasOwnProperty.call(updates, 'supervisorId')) {
    try {
      const existingUser = await getUserById(tableName, uuid);
      if (!existingUser) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'User not found' })
        };
      }

      supervisorIdChanged = existingUser.supervisorId !== updates.supervisorId;
    } catch (error) {
      console.error('update-user prefetch error:', error);
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'Internal server error' })
      };
    }
  }

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { uuid },
      UpdateExpression: updateExpression,
      ConditionExpression: 'attribute_exists(#uuid)',
      ExpressionAttributeNames: { ...expressionAttributeNames, '#uuid': 'uuid' },
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    let relatedUpdates = [];
    if (supervisorIdChanged) {
      try {
        relatedUpdates = await syncSupervisorIdForUserRecords(uuid, updates.supervisorId);
      } catch (error) {
        console.error('update-user supervisor sync error:', error);
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            message: 'User updated, but failed to sync related supervisor records',
            uuid
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'User updated', uuid, updates, relatedUpdates })
    };
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'User not found' })
      };
    }
    console.error('update-user error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
