'use strict';

const AWS = require('aws-sdk');
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
 * POST /daily-status/send-report-email
 * Supports two shapes:
 * - { uuid, text, date } from ReportDialogComponent
 * - { emailAddress, empName, reportText, projects, submittedAt } from ReportReviewComponent
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  const usersTable = process.env.USERS_TABLE;
  if (!usersTable) {
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

  let toEmail = body.emailAddress;
  let empName = body.empName;
  let subject;
  let textBody = '';
  let htmlBody;

  if (body.uuid && body.text && body.date) {
    // Shape from ReportDialogComponent
    const userId = body.uuid;
    const date = body.date;

    if (!toEmail) {
      try {
        const userResp = await dynamoDb
          .get({
            TableName: usersTable,
            Key: { uuid: userId },
          })
          .promise();
        const user = userResp.Item || {};
        toEmail = user.email;
        empName = user.name || user.firstName || '';
      } catch (err) {
        console.error('send-daily-status-email: user lookup failed', err);
      }
    }

    subject = `Daily Status Report – ${empName || ''} (${date})`;
    htmlBody = body.text;
    textBody = `Daily Status Report for ${empName || ''} (${date})\n\n` +
      body.text.replace(/<br\s*\/?>/gi, '\n');
  } else if (body.emailAddress && body.empName && body.reportText) {
    // Shape from ReportReviewComponent
    toEmail = body.emailAddress;
    empName = body.empName;
    subject = `Daily Status Report – ${empName}`;

    textBody = `Daily Status Report for ${empName}\n\n${body.reportText}\n\n`;
    if (Array.isArray(body.projects)) {
      textBody += 'Projects:\n';
      for (const proj of body.projects) {
        textBody += `  - ${proj.projectId}: ${proj.reportText || ''}`;
        if (proj.reportStatus) {
          textBody += ` [${proj.reportStatus}]`;
        }
        textBody += '\n';
      }
    }
    if (body.submittedAt) {
      textBody += `\nSubmitted at: ${body.submittedAt}\n`;
    }
  } else {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Unsupported email payload shape' }),
    };
  }

  if (!toEmail) {
    console.warn(
      'send-daily-status-email: no recipient email resolved; logging only'
    );
  }

  try {
    if (toEmail) {
      await sendDailyStatusEmail({
        toEmail,
        subject,
        textBody,
        htmlBody,
      });
    } else {
      console.log('[DEV] Would send DSU email without resolved toEmail', {
        subject,
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error('send-daily-status-email error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

