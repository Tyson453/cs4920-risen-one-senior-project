'use strict';

const AWS = require('aws-sdk');
const { randomUUID } = require('crypto');

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

/**
 * POST /pdt
 * Creates a new PDT record with status DRAFT.
 * Body: { userId, empName, shortTermGoals, mediumTermGoals, longTermGoals,
 *         developmentNeeds, actionPlan, empSignature }
 */
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.PDT_TABLE;
  if (!tableName) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  if (!body.userId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'userId is required' }) };
  }

  const now = new Date();
  const pdtId = randomUUID();

  const item = {
    pdtId,
    userId: body.userId,
    empName: body.empName || '',
    shortTermGoals: body.shortTermGoals || '',
    mediumTermGoals: body.mediumTermGoals || '',
    longTermGoals: body.longTermGoals || '',
    developmentNeeds: body.developmentNeeds || '',
    actionPlan: body.actionPlan || '',
    empSignature: body.empSignature || '',
    superSignature: '',
    supervisorComments: '',
    status: 'DRAFT',
    createdDate: now.toLocaleDateString('en-US'),
    createdTimestamp: now.toISOString()
  };

  try {
    await dynamoDb.put({ TableName: tableName, Item: item }).promise();
    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, id: pdtId, item })
    };
  } catch (error) {
    console.error('create-pdt error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};
