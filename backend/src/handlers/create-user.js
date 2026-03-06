'use strict';

const USER_FIELDS = [
    'uuid',
    'assignments',
    'birthday',
    'birthdayNoAcknowledge',
    'email',
    'firstName',
    'lastName',
    'maxHours',
    'maxSickHours',
    'name',
    'notes',
    'password',
    'pmTeams',
    'requestedPTO',
    'roles',
    'startDate',
    'startYear',
    'state',
    'supervisorId',
    'teamName',
    'username'
]

const REQUIRED_FIELDS = [
    'uuid',
    'email',
    'firstName',
    'lastName',
    'maxHours',
    'maxSickHours',
    'name',
    'password',
    'roles',
    'startDate',
    'startYear',
    'state',
    'username'
]

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Content-Type': 'application/json'
};

module.exports.handler = async (event) => {
    const payload = JSON.parse(event?.body);
    // Only keep valid fields
    const user = Object.fromEntries(Object.entries(payload).filter(([key, _val]) => USER_FIELDS.includes(key)))

    // validate payload
    if (!REQUIRED_FIELDS.every((field) => Object.hasOwn(user, field))) {
        return {
            statusCode: 422,
            body: { message: "Failed to create user because payload is missing fields" }
        }
    }

    try {
        await dynamoDb.put({
            TableName: process.env.USERS_TABLE,
            Item: user
        }).promise()
    } catch (e) {
        console.error(e)
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: { message: "Failed to create user" }
        }
    }

    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(user)
    }
}