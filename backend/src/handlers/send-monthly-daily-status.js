'use strict';

const AWS = require('aws-sdk');
const {
  yyyymmddDashToYyyymmddSlash,
} = require('../lib/daily-status-utils');
const { sendDailyStatusEmail } = require('../lib/send-daily-status-email');

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
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * POST /daily-status/monthly-email
 * Body: { userId, requesterId, month, year, date1, date2 }
 * - If month/year != '0', use that month.
 * - Else use custom date1/date2 ('yyyy-mm-dd').
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  const dailyStatusTable = process.env.DAILY_STATUS_TABLE;
  if (!dailyStatusTable) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
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

  const { userId, requesterId, month, year, date1, date2 } = body;
  if (!userId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message: 'userId is required',
      }),
    };
  }

  let startKey;
  let endKey;

  if (month && year && month !== '0' && year !== '0') {
    // Compute first/last day of that month in YYYY/MM/DD
    const mm = month.padStart(2, '0');
    const yyyy = year;
    startKey = `${yyyy}/${mm}/01`;
    const lastDay = new Date(parseInt(yyyy, 10), parseInt(mm, 10), 0).getDate();
    endKey = `${yyyy}/${mm}/${String(lastDay).padStart(2, '0')}`;
  } else if (date1 && date2) {
    startKey = yyyymmddDashToYyyymmddSlash(date1);
    endKey = yyyymmddDashToYyyymmddSlash(date2);
  } else {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        message:
          'Either month/year or date1/date2 must be provided for the date range',
      }),
    };
  }

  try {
    const reportsResult = await dynamoDb
      .query({
        TableName: dailyStatusTable,
        IndexName: 'userDateIndex',
        KeyConditionExpression: 'userId = :userId AND #d BETWEEN :start AND :end',
        ExpressionAttributeNames: { '#d': 'date' },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':start': startKey,
          ':end': endKey,
        },
        ScanIndexForward: true,
      })
      .promise();

    const reports = reportsResult.Items || [];

    // Resolve target email from JWT claims instead of querying users table.
    const claims =
      (event.requestContext &&
        event.requestContext.authorizer &&
        event.requestContext.authorizer.claims) ||
      {};
    const targetEmail = claims.email || claims['custom:email'] || null;

    // Build a plain-text summary
    let textBody = `Daily Status Report for user ${userId}\n\n`;
    textBody += `Range: ${startKey} to ${endKey}\n\n`;
    if (reports.length === 0) {
      textBody += 'No reports found in this range.\n';
    } else {
      for (const report of reports) {
        textBody += `Date: ${report.date}\n`;
        if (Array.isArray(report.projects)) {
          for (const proj of report.projects) {
            textBody += `  - Project ${proj.projectId}: ${
              proj.reportText || ''
            }`;
            if (proj.reportStatus) {
              textBody += ` [${proj.reportStatus}]`;
            }
            textBody += '\n';
          }
        }
        textBody += `  Status: ${report.reportStatus || ''}\n`;
        textBody += '\n';
      }
    }

    if (targetEmail) {
      await sendDailyStatusEmail({
        toEmail: targetEmail,
        subject: 'Daily Status Report Summary',
        textBody,
      });
    } else {
      console.log('[DEV] Would send monthly DSU email:', {
        userId,
        requesterId,
        range: { startKey, endKey },
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('send-monthly-daily-status error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

