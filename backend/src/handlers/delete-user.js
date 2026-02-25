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

module.exports.handler = async (event) => {
  try {
    const uuid = event?.pathParameters?.uuid;

    if (!uuid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required path parameter: uuid" }),
      };
    }

    await dynamoDb
  .delete({
    TableName: process.env.USERS_TABLE || "users",
    Key: { uuid },
    // ensures we return 404 if it doesn't exist
    ConditionExpression: "attribute_exists(#uuid)",
    ExpressionAttributeNames: {
      "#uuid": "uuid",
    },
  })
  .promise();

    return { statusCode: 204, body: "" };
  } catch (err) {
    if (err?.code === "ConditionalCheckFailedException") {
      return { statusCode: 404, body: JSON.stringify({ message: "User not found" }) };
    }
    console.error("delete-user error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  }
};