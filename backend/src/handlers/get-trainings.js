const AWS = require("aws-sdk");

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";

const ddb = new AWS.DynamoDB({
  region: "local",
  endpoint: new AWS.Endpoint(DYNAMODB_ENDPOINT),
  credentials: new AWS.Credentials("dummy", "dummy"),
});

const dynamodb = new AWS.DynamoDB.DocumentClient({ service: ddb });

module.exports.handler = async (event) => {
  console.log("DYNAMODB_ENDPOINT =", DYNAMODB_ENDPOINT);

  try {
    const userId = event?.pathParameters?.userId;
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "Missing userId in path" }),
      };
    }

    const TableName = process.env.TRAININGS_TABLE || "trainings";

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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(result.Items || []),
    };
  } catch (err) {
    console.error("get-trainings error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};