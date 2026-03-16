'use strict';

const AWS = require('aws-sdk');
const {
  mmddyyyyToYyyymmdd,
  isValidMmDdYyyy,
} = require('../lib/daily-status-utils');

const dynamoDbClientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbClientConfig.region = 'us-east-2';
  dynamoDbClientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbClientConfig.sslEnabled = false;
  dynamoDbClientConfig.credentials = new AWS.Credentials({
    accessKeyId: 'local',
    secretAccessKey: 'local',
  });
}
const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbClientConfig);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * GET /daily-status?id={userId}&limit={pageSize}&start={MM/DD/YYYY}&end={MM/DD/YYYY}
 * Returns all daily status records for the user in the given date range,
 * sorted by date descending. Dates are stored as "YYYY/MM/DD" in DynamoDB.
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  const tableName = process.env.DAILY_STATUS_TABLE;
  if (!tableName) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }

  const params = event.queryStringParameters || {};
  const userId = params.id;
  const limit = params.limit ? parseInt(params.limit, 10) : 50;
  const start = params.start;
  const end = params.end;

  if (!userId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'id query parameter (userId) is required' }),
    };
  }

  if (!start || !end || !isValidMmDdYyyy(start) || !isValidMmDdYyyy(end)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message:
          'start and end query parameters are required in MM/DD/YYYY format',
      }),
    };
  }

  const startKey = mmddyyyyToYyyymmdd(start);
  const endKey = mmddyyyyToYyyymmdd(end);

  try {
    const result = await dynamoDb
      .query({
        TableName: tableName,
        IndexName: 'userDateIndex',
        KeyConditionExpression: 'userId = :userId AND #d BETWEEN :start AND :end',
        ExpressionAttributeNames: {
          '#d': 'date',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':start': startKey,
          ':end': endKey,
        },
        Limit: limit,
        ScanIndexForward: false, // newest first by date
      })
      .promise();

    const items = result.Items || [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(items),
    };
  } catch (error) {
    console.error('get-daily-status error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

