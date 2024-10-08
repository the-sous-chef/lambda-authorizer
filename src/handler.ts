import debugFactory from "debug";
import jwt, { NotBeforeError, TokenExpiredError } from "jsonwebtoken";
import middy from "@middy/core";
import middyJsonBodyParser from "@middy/http-json-body-parser";
import httpErrorHandler from "@middy/http-error-handler";
import { createHttpError } from "src/utils";
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler,
} from "aws-lambda";

interface AuthorizerEvent extends APIGatewayProxyEvent {
  type: string;
  methodArn: string;
  authorizationToken?: string;
}

// Set in `environment` of serverless.yml
const { AUTH0_CLIENT_ID, AUTH0_CLIENT_PUBLIC_KEY, AUTH0_DOMAIN } = process.env;
const UNAUTHORIZED = "Unauthorized";
const LOGGER = debugFactory("authorize/handler");

// Policy helper function
function generatePolicy(
  principalId: string,
  effect: string,
  resource: string,
  context?: unknown,
): AWS.Policy {
  const authResponse = {
    principalId,
    context,
  } as AWS.Policy;

  if (effect && resource) {
    const policyDocument = {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    } as AWS.PolicyDocument;

    authResponse.policyDocument = policyDocument;
  }

  return authResponse;
}

export const authorize: Handler<
  AuthorizerEvent,
  APIGatewayProxyResult
> = async (event: AuthorizerEvent): Promise<APIGatewayProxyResult> => {
  if (!event.authorizationToken) {
    LOGGER(`Missing authorization token in event: ${JSON.stringify(event)}`);
    throw createHttpError(500, "Internal Error");
  }

  const tokenParts = event.authorizationToken.split(" ");
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === "bearer" && tokenValue)) {
    LOGGER(`Bearer token required, got ${event.authorizationToken} instead`);
    throw createHttpError(401, UNAUTHORIZED);
  }

  try {
    const options = {
      audience: AUTH0_CLIENT_ID,
      issuer: `https://${AUTH0_DOMAIN}/`,
    };

    const decoded = jwt.verify(
      tokenValue,
      AUTH0_CLIENT_PUBLIC_KEY,
      options,
    ) as { sub: string };

    return {
      statusCode: 200,
      body: JSON.stringify(
        generatePolicy(decoded.sub, "Allow", event.methodArn),
      ),
    };
  } catch (e) {
    LOGGER(`Token invalid: ${e}`);

    if (e instanceof TokenExpiredError) {
      LOGGER(`Token expired at ${new Date(e.expiredAt).toUTCString()}`);

      throw createHttpError(401, UNAUTHORIZED, {
        expiredAt: e.expiredAt,
        type: "TokenExpiredError",
      });
    }

    if (e instanceof NotBeforeError) {
      LOGGER(`Token not valid before ${e.date}`);

      throw createHttpError(401, UNAUTHORIZED, {
        date: e.date,
        type: "NotBeforeError",
      });
    }

    throw createHttpError(401, UNAUTHORIZED, {
      type: "InvalidToken",
    });
  }
};

export const main = middy(authorize)
  .use(middyJsonBodyParser())
  .use(httpErrorHandler());
