"use strict";

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";

// ✅ HARD FORCE DynamoDB Local (prevents AWS metadata calls)
const ddb = new AWS.DynamoDB({
  region: "local",
  endpoint: new AWS.Endpoint(DYNAMODB_ENDPOINT),
  credentials: new AWS.Credentials("dummy", "dummy"),
});

const dynamoDb = new AWS.DynamoDB.DocumentClient({ service: ddb });

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

module.exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "OK" }),
    };
  }

  console.log("DYNAMODB_ENDPOINT =", DYNAMODB_ENDPOINT);

  const tableName = process.env.TRAININGS_TABLE || "trainings";

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Invalid JSON body" }),
    };
  }

  const { userId, title, provider, status, completedDate, startedDate } = body;

  if (!userId || typeof userId !== "string") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "userId is required" }),
    };
  }
  if (!title || typeof title !== "string") {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "title is required" }),
    };
  }

  const item = {
    uuid: uuidv4(),
    userId: userId.trim(),
    title: title.trim(),
    provider: provider ? String(provider).trim() : "",
    status: status ? String(status).trim() : "",
    startedDate: startedDate ? String(startedDate).trim() : "",
    completedDate: completedDate ? String(completedDate).trim() : "",
    createdAt: new Date().toISOString(),
  };

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
    console.error("create-training error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};