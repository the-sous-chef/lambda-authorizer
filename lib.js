'use strict';

const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const getPolicyDocument = function (effect, resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17'; // default version
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke'; // default action
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    return policyDocument;
};


// extract and return the Bearer Token from the Lambda event parameters
const getToken = function (params) {
    if (!params.type || params.type !== 'TOKEN') {
        throw new Error("Expected 'event.type' parameter to have value TOKEN");
    }

    const tokenString = params.authorizationToken;
    if (!tokenString) {
        throw new Error("Expected 'event.authorizationToken' parameter to be set");
    }

    const match = tokenString.match(/^Bearer (.*)$/i);
    if (!match || match.length < 2) {
        throw new Error("Invalid Authorization token - '" + tokenString + "' does not match 'Bearer .*' or 'bearer .*");
    }
    return match[1];
};

module.exports.authenticate = function (params, cb) {
    const token = getToken(params);

    const client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: process.env.JWKS_URI
    });

    const decoded = jwt.decode(token, {complete: true});
    if (decoded === null)
    {
        console.error("Could not decode JWT.");
        cb("Could not decode JWT.");
    }
    const kid = decoded.header.kid;
    client.getSigningKey(kid, function (err, key) {
        if(err)
        {
            console.error(err.message);
            cb(err);
        }
        else
        {
            const signingKey = key.publicKey || key.rsaPublicKey;
            jwt.verify(token, signingKey, { audience: process.env.AUDIENCE, issuer: process.env.TOKEN_ISSUER },
            function (err, decoded) {
                if (err) {
                    console.error(err.message);
                    cb(err);
                }
                else {
                    // Make sure that the user is a cimpress employee
                    const accountClaim = decoded['https://claims.cimpress.io/account'];
                    const validAccounts = [
                        'g2Ez5VaoZWoqU22XqPjTLU', // Cimpress Technology
                        'ozoDdrmewShEcbUDWX8J3V', // Vistaprint
                    ];
                    if(validAccounts.includes(accountClaim)) {
                        cb(null, {
                            principalId: decoded.sub,
                            policyDocument: getPolicyDocument('Allow', params.methodArn),
                            context: {
                                scope: decoded.scope
                            }
                        });
                    }
                    else {
                        console.error(decoded.sub + " is not authorized to access this endpoint as they are not a Cimpress User.");
                        cb("The user is not authorized to access this endpoint.");
                    }
                }
            });
        }
    });
};
