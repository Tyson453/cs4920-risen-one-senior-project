const AWS = require("aws-sdk");

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";

// Force DynamoDB Local (prevents AWS credential / metadata issues)
const ddb = new AWS.DynamoDB({
  region: "local",
  endpoint: new AWS.Endpoint(DYNAMODB_ENDPOINT),
  credentials: new AWS.Credentials("dummy", "dummy"),
});

const dynamodb = new AWS.DynamoDB.DocumentClient({ service: ddb });

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};

module.exports.handler = async (event) => {
  console.log("DYNAMODB_ENDPOINT =", DYNAMODB_ENDPOINT);

  try {
    const userId = event?.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: "Missing userId in path" }),
      };
    }

    const TableName = process.env.CERTIFICATIONS_TABLE || "certifications";

    // ✅ Use SCAN + FILTER (works regardless of table key schema)
    const params = {
      TableName,
      FilterExpression: "#uid = :u",
      ExpressionAttributeNames: { "#uid": "userId" },
      ExpressionAttributeValues: { ":u": userId },
    };

    const result = await dynamodb.scan(params).promise();

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.Items || []),
    };
  } catch (err) {
    console.error("get-certifications error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};