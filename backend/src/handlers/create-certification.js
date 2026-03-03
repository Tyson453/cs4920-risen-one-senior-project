'use strict';

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers':
    'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json',
};

// ✅ IMPORTANT: serverless-offline sets IS_OFFLINE=true
const isOffline = process.env.IS_OFFLINE === 'true' || !!process.env.DYNAMODB_ENDPOINT;

const dynamoDbClientConfig = {
  region: 'us-east-2',
};

if (isOffline) {
  dynamoDbClientConfig.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
  dynamoDbClientConfig.sslEnabled = false;
  dynamoDbClientConfig.credentials = new AWS.Credentials({
    accessKeyId: 'local',
    secretAccessKey: 'local',
  });

  // also prevents AWS SDK from trying metadata creds
  AWS.config.update({
    region: 'us-east-2',
    credentials: dynamoDbClientConfig.credentials,
  });
}

const dynamoDb = new AWS.DynamoDB.DocumentClient(dynamoDbClientConfig);

module.exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'OK' }) };
  }

  const tableName = process.env.CERTIFICATIONS_TABLE || 'certifications';

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Invalid JSON body' }) };
  }

  const userId = body.userId;
  const name = body.name ?? body.title ?? body.certificationName;
  const issuer = body.issuer ?? body.provider ?? body.organization;
  const status = body.status ?? 'ACTIVE';
  const achievedDate = body.achievedDate ?? body.completedDate ?? body.date;
  const expirationDate = body.expirationDate ?? body.expiresOn ?? body.expiryDate;
  const credentialId = body.credentialId ?? body.certificateId ?? body.certId;
  const credentialUrl = body.credentialUrl ?? body.url ?? body.link;

  if (!userId || typeof userId !== 'string') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'userId is required' }) };
  }
  if (!name || typeof name !== 'string') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'name is required' }) };
  }
  if (!issuer || typeof issuer !== 'string') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'issuer is required' }) };
  }
  if (!achievedDate || typeof achievedDate !== 'string') {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'achievedDate is required' }) };
  }

  const item = {
    uuid: uuidv4(),
    userId: userId.trim(),
    name: name.trim(),
    issuer: issuer.trim(),
    status,
    achievedDate,
    createdAt: new Date().toISOString(),
  };

  if (expirationDate) item.expirationDate = expirationDate;
  if (credentialId) item.credentialId = credentialId;
  if (credentialUrl) item.credentialUrl = credentialUrl;

  try {
    await dynamoDb
      .put({
        TableName: tableName,
        Item: item,
      })
      .promise();

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify(item),
    };
  } catch (err) {
    console.error('create-certification error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
};