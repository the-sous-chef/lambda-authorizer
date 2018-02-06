'use strict';

require('dotenv').config({ silent: true });
var jwksClient = require('jwks-rsa');
var jwt = require('jsonwebtoken');

var getPolicyDocument = function (effect, resource) {

    var policyDocument = {};
    policyDocument.Version = '2012-10-17'; // default version
    policyDocument.Statement = [];
    var statementOne = {};
    statementOne.Action = 'execute-api:Invoke'; // default action
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    return policyDocument;
}


// extract and return the Bearer Token from the Lambda event parameters
var getToken = function (params) {
    var token;

    if (!params.type || params.type !== 'TOKEN') {
        throw new Error("Expected 'event.type' parameter to have value TOKEN");
    }

    var tokenString = params.authorizationToken;
    if (!tokenString) {
        throw new Error("Expected 'event.authorizationToken' parameter to be set");
    }

    var match = tokenString.match(/^Bearer (.*)$/i);
    if (!match || match.length < 2) {
        throw new Error("Invalid Authorization token - '" + tokenString + "' does not match 'Bearer .*' or 'bearer .*");
    }
    return match[1];
}

module.exports.authenticate = function (params, cb) {
    console.log(params);
    var token = getToken(params);

    var client = jwksClient({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10, // Default value
        jwksUri: process.env.JWKS_URI
    });

    var decoded = jwt.decode(token, { complete: true });
    var kid = decoded.header.kid;
    client.getSigningKey(kid, function (err, key) {
        if(err)
        {
            console.log(err.message);
            cb(err);
        }
        else 
        {
        var signingKey = key.publicKey || key.rsaPublicKey;
        jwt.verify(token, signingKey, { audience: process.env.AUDIENCE, issuer: process.env.TOKEN_ISSUER },
            function (err, decoded) {
                if (err) {
                    console.log(err.message);
                    cb(err);
                }
                else {
                    // Make sure that the user is a cimpress employee
                    if(decoded[process.env.CIMPRESS_CLAIM] === true) {
                        cb(null, {
                            principalId: decoded.sub,
                            policyDocument: getPolicyDocument('Allow', params.methodArn),
                            context: {
                                scope: decoded.scope
                            }
                        });
                    }
                    else {
                        console.log(decoded.sub + " is not authorized to access this endpoint as they are not a Cimpress User.");
                        cb("The user is not authorized to access this endpoint.");
                    }
                }
            });
        }
    });
}
