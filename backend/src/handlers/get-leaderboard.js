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

const MAX_ENTRIES = 10;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json'
};

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

  try {
    const scanParams = { TableName: tableName };
    const entries = [];
    let lastEvaluatedKey;

    do {
      const result = await dynamoDb.scan({
        ...scanParams,
        ExclusiveStartKey: lastEvaluatedKey
      }).promise();

      entries.push(...(result.Items || []));
      entries.sort((a, b) => b.score - a.score);
      entries.splice(MAX_ENTRIES);

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(entries)
    };
  } catch (err) {
    console.error('get-leaderboard error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};
