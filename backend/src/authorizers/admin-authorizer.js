'use strict';
const jwt = require('jsonwebtoken');
const { generatePolicy, buildWildCardResource } = require('./authorizer-utils');

/**
 * Custom Lambda authorizer that validates the JWT token AND requires the
 * caller to have the ADMIN role. Attach this to admin-only endpoints in
 * serverless.yml instead of the generic jwtAuthorizer.
 */
module.exports.handler = async (event) => {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET;
  const resource = buildWildCardResource(event.methodArn);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const roles = decoded.roles || [];

    if (!roles.includes('ADMIN')) {
      return generatePolicy('user', 'Deny', resource, {});
    }

    return generatePolicy(decoded.uuid, 'Allow', resource, decoded);
  } catch (err) {
    return generatePolicy('user', 'Deny', resource, {});
  }
};
