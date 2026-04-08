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

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.LEADERBOARD_TABLE;
  if (!tableName) {
    console.error('Missing LEADERBOARD_TABLE env var');
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }

  const authorizer = event.requestContext && event.requestContext.authorizer;
  const userId = authorizer && authorizer.uuid;
  if (!userId) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Unauthorized' })
    };
  }
  const displayName = authorizer.name || 'Unknown';

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid JSON body' })
    };
  }

  const { score, difficulty, turn } = body;

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'score must be a finite number' })
    };
  }
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'difficulty must be one of: easy, medium, hard' })
    };
  }
  if (typeof turn !== 'number' || !Number.isInteger(turn) || turn < 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'turn must be a non-negative integer' })
    };
  }

  const entry = {
    userId,
    displayName,
    score,
    difficulty,
    turn,
    date: new Date().toISOString()
  };

  try {
    // Single atomic write: only succeeds if no row yet or stored score is strictly lower.
    await dynamoDb
      .put({
        TableName: tableName,
        Item: entry,
        ConditionExpression: 'attribute_not_exists(userId) OR score < :newScore',
        ExpressionAttributeValues: {
          ':newScore': score
        }
      })
      .promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ entry, isNewHighScore: true })
    };
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      try {
        const current = await dynamoDb
          .get({
            TableName: tableName,
            Key: { userId }
          })
          .promise();
        if (!current.Item) {
          console.error('submit-score: conditional failed but row missing');
          return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Internal server error' })
          };
        }
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            entry: current.Item,
            isNewHighScore: false
          })
        };
      } catch (getErr) {
        console.error('submit-score get after condition failure:', getErr);
        return {
          statusCode: 500,
          headers: CORS_HEADERS,
          body: JSON.stringify({ message: 'Internal server error' })
        };
      }
    }
    console.error('submit-score error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
