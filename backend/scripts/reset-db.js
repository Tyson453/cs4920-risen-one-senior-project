#!/usr/bin/env node
/**
 * Resets local DynamoDB state by removing only the data files in .dynamodb.
 * Keeps DynamoDBLocal.jar and DynamoDBLocal_lib/ so the install is not lost.
 * Run from backend: npm run db:reset
 * After running, restart the backend (npm start) to recreate empty tables.
 */

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const dynamoPath = path.join(backendDir, '.dynamodb');

const KEEP = new Set(['DynamoDBLocal.jar', 'DynamoDBLocal_lib']);

function resetData(dir) {
  if (!fs.existsSync(dir)) {
    console.log('No local DynamoDB directory found (.dynamodb).');
    return;
  }
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (KEEP.has(name)) continue;
    const full = path.join(dir, name);
    fs.rmSync(full, { recursive: true });
    removed++;
  }
  if (removed > 0) {
    console.log('Local DynamoDB data cleared (.dynamodb).');
  } else {
    console.log('No DynamoDB data to clear (tables were already empty or in-memory).');
  }
}

resetData(dynamoPath);
console.log('Restart the backend (npm start or npm run start:local) to use empty tables.');
