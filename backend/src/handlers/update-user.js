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

  try {
    await dynamoDb.update({
      TableName: tableName,
      Key: { uuid },
      UpdateExpression: updateExpression,
      ConditionExpression: 'attribute_exists(#uuid)',
      ExpressionAttributeNames: { ...expressionAttributeNames, '#uuid': 'uuid' },
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'User updated', uuid, updates })
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
