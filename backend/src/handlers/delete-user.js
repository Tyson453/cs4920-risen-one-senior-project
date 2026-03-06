"use strict";

const AWS = require("aws-sdk");

// DynamoDB local config (same as import-data.js)
const dynamoDbClientConfig = {};
if (process.env.DYNAMODB_ENDPOINT) {
  dynamoDbClientConfig.region = "us-east-2";
  dynamoDbClientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  dynamoDbClientConfig.sslEnabled = false;
  dynamoDbClientConfig.credentials = new AWS.Credentials({
    accessKeyId: "local",
    secretAccessKey: "local",
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

module.exports.handler = async (event) => {
  try {
    const uuid = event?.pathParameters?.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Missing required path parameter: uuid" }),
      };
    }

    const usersTable = process.env.USERS_TABLE || "users";
    const teamsTable = process.env.TEAMS_TABLE || "teams";

    // Read the user first so we can preserve their org team if needed.
    const existing = await dynamoDb.get({ TableName: usersTable, Key: { uuid } }).promise();
    if (!existing.Item) {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "User not found" })
      };
    }

    const orgTeamName = existing.Item.teamName || null;

    // If the user belongs to an org team, ensure that team is registered in the
    // teams table so it persists as an empty team after this user is removed.
    // (Teams created via the UI are already there; imported/seeded users may not be.)
    if (orgTeamName) {
      await dynamoDb.put({
        TableName: teamsTable,
        Item: { type: "org", teamName: orgTeamName },
        ConditionExpression: "attribute_not_exists(#type)",
        ExpressionAttributeNames: { "#type": "type" },
      }).promise().catch(() => {
        // Ignore ConditionalCheckFailedException — team already exists, nothing to do.
      });
    }

    await dynamoDb
      .delete({
        TableName: usersTable,
        Key: { uuid },
        ConditionExpression: "attribute_exists(#uuid)",
        ExpressionAttributeNames: {
          "#uuid": "uuid",
        },
      })
      .promise();

    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  } catch (err) {
    if (err?.code === "ConditionalCheckFailedException") {
      return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "User not found" })
      };
    }
    console.error("delete-user error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};
