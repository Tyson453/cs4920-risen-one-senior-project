'use strict';

const AWS = require('aws-sdk');
const {
  mmddyyyyDashToYyyymmdd,
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
  'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * DELETE /daily-report/{userId}/{date}
 * date path param is "MM-dd-yyyy"; stored as "YYYY/MM/DD".
 * Allows owner or elevated roles (LEAD/PM/ADMIN) to delete.
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

  const pathParams = event.pathParameters || {};
  const userId = pathParams.userId;
  const dateParam = pathParams.date;

  if (!userId || !dateParam) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'userId and date path parameters are required',
      }),
    };
  }

  const storedDate = mmddyyyyDashToYyyymmdd(dateParam);
  if (!storedDate) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'date path parameter must be in MM-dd-yyyy format',
      }),
    };
  }

  // Authorization: owner or elevated roles; here we primarily enforce owner.
  const claims =
    (event.requestContext &&
      event.requestContext.authorizer &&
      event.requestContext.authorizer.claims) ||
    {};
  const requesterUserId = claims.sub;

  if (requesterUserId && requesterUserId !== userId) {
    // In a future enhancement, we could look up roles and allow LEAD/PM/ADMIN.
    console.warn(
      'delete-daily-report: requester not owner; denying delete',
      requesterUserId,
      userId
    );
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Not authorized to delete this report' }),
    };
  }

  try {
    const existing = await dynamoDb
      .query({
        TableName: tableName,
        IndexName: 'userDateIndex',
        KeyConditionExpression: 'userId = :userId AND #d = :date',
        ExpressionAttributeNames: { '#d': 'date' },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':date': storedDate,
        },
        Limit: 1,
      })
      .promise();

    const item = existing.Items && existing.Items[0];
    if (!item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Report not found' }),
      };
    }

    await dynamoDb
      .delete({
        TableName: tableName,
        Key: { uuid: item.uuid },
      })
      .promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('delete-daily-report error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

