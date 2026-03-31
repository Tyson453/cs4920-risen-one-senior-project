'use strict';

const AWS = require('aws-sdk');
const crypto = require('crypto');
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
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * PUT /daily-report/{userId}/{date}
 * Body: { draft: boolean, projects: [{ projectId, reportText, reportStatus? }] }
 * date path param is "MM-dd-yyyy"; stored as "YYYY/MM/DD".
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

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  const { draft, projects } = body;
  if (!Array.isArray(projects)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'projects array is required in request body',
      }),
    };
  }

  const isDraft = !!draft;
  const reportStatus = isDraft ? 'DRAFT' : 'SUBMITTED';

  // Identify updater from JWT claims if present
  const claims =
    (event.requestContext &&
      event.requestContext.authorizer &&
      event.requestContext.authorizer.claims) ||
    {};
  const updatedBy = claims.name || claims.sub || userId;

  try {
    // Check if an item already exists for (userId, date)
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
      })
      .promise();

    let item = existing.Items && existing.Items[0];
    const nowIso = new Date().toISOString();

    if (item) {
      // Update existing report
      const updateExpressionParts = [
        '#projects = :projects',
        '#reportStatus = :reportStatus',
        '#updatedBy = :updatedBy',
        '#updatedAt = :updatedAt',
      ];
      const expressionAttributeNames = {
        '#projects': 'projects',
        '#reportStatus': 'reportStatus',
        '#updatedBy': 'updatedBy',
        '#updatedAt': 'updatedAt',
      };
      const expressionAttributeValues = {
        ':projects': projects,
        ':reportStatus': reportStatus,
        ':updatedBy': updatedBy,
        ':updatedAt': nowIso,
      };

      if (!isDraft) {
        updateExpressionParts.push('#submittedAt = :submittedAt');
        expressionAttributeNames['#submittedAt'] = 'submittedAt';
        expressionAttributeValues[':submittedAt'] = nowIso;
      }

      await dynamoDb
        .update({
          TableName: tableName,
          Key: { uuid: item.uuid },
          UpdateExpression: 'SET ' + updateExpressionParts.join(', '),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
        .promise();
    } else {
      // Create new report item
      const uuid = crypto.randomUUID
        ? crypto.randomUUID()
        : `${storedDate.replace(/\//g, '')}${Date.now()}`;

      item = {
        uuid,
        userId,
        date: storedDate,
        projects,
        reportStatus,
        updatedBy,
        updatedAt: nowIso,
      };
      if (!isDraft) {
        item.submittedAt = nowIso;
      }

      await dynamoDb
        .put({
          TableName: tableName,
          Item: item,
        })
        .promise();
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('upsert-daily-report error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

