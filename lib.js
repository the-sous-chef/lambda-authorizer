const jwksClient = require("jwks-rsa");
const jwt = require("jsonwebtoken");
const util = require("util");
const coam = require("./coam");

const INCLUDE_PERMISSIONS = process.env.INCLUDE_PERMISSIONS === "true";
const ALLOW_WEB = process.env.ALLOW_WEB === "true";

const internalUsersAccounts = [
    "g2Ez5VaoZWoqU22XqPjTLU", // Cimpress Technology
    "ozoDdrmewShEcbUDWX8J3V", // Vistaprint
];
const webUsersAccounts = [
    "4HVsAccqLzE6BPbmvrDaKw", // Vistaprint
];

const client = jwksClient({
    cache: true,
    cacheMaxAge: 86400000, //value in ms
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    strictSsl: true,
    jwksUri: process.env.JWKS_URI,
});

const jwtOptions = {
    audience: process.env.AUDIENCE,
    issuer: process.env.TOKEN_ISSUER,
};

const getResponse = (
    principalId,
    effect,
    resource,
    scope,
    isInternalUser,
    permissions
) => {
    return {
        principalId,
        policyDocument: getPolicyDocument(effect, resource),
        context: {
            scope,
            isInternalUser,
            permissions,
        },
    };
};

/**
 * Creates a Resource Policy Document allowing or denying invocation of the resource
 * @param effect Allow/Deny
 * @param resource ARN of the resource
 * @returns {{Version: string, Statement: [{Action: string, Resource: *, Effect: *}]}}
 */
const getPolicyDocument = (effect, resource) => {
    const policyDocument = {
        Version: "2012-10-17", // default version
        Statement: [
            {
                Action: "execute-api:Invoke", // default action
                Effect: effect,
                Resource: resource,
            },
        ],
    };
    return policyDocument;
};

/**
 * Extracts the token from the authorization header
 * @param params event parameters
 * @returns {string} Token
 */
const getToken = (params) => {
    if (!params.type || params.type !== "TOKEN") {
        throw new Error('Expected "event.type" parameter to have value "TOKEN"');
    }

    const tokenString = params.authorizationToken;
    if (!tokenString) {
        throw new Error('Expected "event.authorizationToken" parameter to be set');
    }

    const match = tokenString.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new Error(
            `Invalid Authorization token - ${tokenString} does not match "Bearer .*"`
        );
    }
    return match[1];
};

/**
 *
 * @param params Event parameters containing user token
 * @returns A promise with a Resource policy document allowing o denying access to the requested resource to the principal
 * defined in the token. The COAM permissions of the user are included in the context. They can be accessed as a string
 * in the 'event.requestContext.authorizer.permissions' object in the authorized lambda.
 */
module.exports.authenticate = async (params) => {
    const token = getToken(params);

    const decoded = jwt.decode(token, {complete: true});
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error("Invalid token. Could not decode JWT.");
    }

    const getSigningKey = util.promisify(client.getSigningKey);
    const key = await getSigningKey(decoded.header.kid);
    const signingKey = key.publicKey || key.rsaPublicKey;
    try {
        const tokenVerified = await jwt.verify(token, signingKey, jwtOptions);
        const accountClaim = tokenVerified["https://claims.cimpress.io/account"];
        if (internalUsersAccounts.includes(accountClaim)) {
            let userPermissions = null;
            if (INCLUDE_PERMISSIONS) {
                userPermissions = await coam.getUserPermissions(
                    token,
                    tokenVerified.sub
                );
            }
            return getResponse(
                tokenVerified.sub,
                "Allow",
                "*",
                tokenVerified.scope,
                "true",
                userPermissions
            );
        } else if (ALLOW_WEB && webUsersAccounts.includes(accountClaim)) {
            const isAnonymous = tokenVerified["https://claims.cimpress.io/is_anonymous"] || false;
            return getResponse(
                tokenVerified["https://claims.cimpress.io/canonical_id"],
                "Allow",
                "*",
                tokenVerified.scope,
                "false",
                null
            );
        }
        console.error(
            tokenVerified.sub +
            " is not authorized to access this endpoint as they are not a Cimpress User."
        );
    } catch (error) {
        console.error(error);
    }
    throw new Error("Unauthorized");
};
