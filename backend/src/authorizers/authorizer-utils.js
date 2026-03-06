'use strict';

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

module.exports = {
  buildWildCardResource,
  generatePolicy
};