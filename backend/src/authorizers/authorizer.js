'use strict';
const jwt = require('jsonwebtoken');
const { generatePolicy, buildWildCardResource } = require('./authorizer-utils');

module.exports.handler = async (event) => {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET;
  const resource = buildWildCardResource(event.methodArn);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return generatePolicy(decoded.uuid, 'Allow', resource, decoded);
  } catch (err) {
    return generatePolicy('user', 'Deny', resource, {});
  }
};
