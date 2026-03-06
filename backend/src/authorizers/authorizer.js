'use strict';
const jwt = require('jsonwebtoken');

module.exports.handler = async (event) => {
  const token = (event.authorizationToken || '').replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const resource = buildWildCardResource(event.methodArn);
    return generatePolicy(decoded.uuid, 'Allow', resource, decoded);
  } catch (err) {
    return generatePolicy('user', 'Deny', event.methodArn, {});
  }
};

function buildWildCardResource(methodArn) {
  const arnParts = methodArn.split(':');
  const apiGatewayParts = arnParts[5].split('/');
  
  const region = arnParts[3];
  const accountId = arnParts[4];
  const apiId = apiGatewayParts[0];
  const stage = apiGatewayParts[1];

  return `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*/*`;
}

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
