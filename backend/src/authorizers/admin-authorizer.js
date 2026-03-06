'use strict';
const jwt = require('jsonwebtoken');

/**
 * Custom Lambda authorizer that validates the JWT token AND requires the
 * caller to have the ADMIN role. Attach this to admin-only endpoints in
 * serverless.yml instead of the generic jwtAuthorizer.
 */
module.exports.handler = async (event) => {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const roles = decoded.roles || [];

    if (!roles.includes('ADMIN')) {
      return generatePolicy('user', 'Deny', event.methodArn, {});
    }

    return generatePolicy(decoded.uuid, 'Allow', event.methodArn, decoded);
  } catch (err) {
    return generatePolicy('user', 'Deny', event.methodArn, {});
  }
};

function generatePolicy(principalId, effect, resource, claims) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [{ Action: 'execute-api:Invoke', Effect: effect, Resource: resource }],
    },
    context: {
      uuid: claims.uuid || '',
      username: claims.username || '',
      roles: JSON.stringify(claims.roles || []),
      name: claims.name || '',
      email: claims.email || '',
      assignments: JSON.stringify(claims.assignments || []),
    },
  };
}
