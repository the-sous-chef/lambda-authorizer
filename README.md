# About
This repo is for a custom authorizer for AWS API Gateway that will verify a JWT Token that has been passed to the API, and that it meets the required Issuer, Audience, and that it is from a Cimpress internal user.

This was initially pulled from https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer and modified to work for our use case.

The documentation below was trimmed and customized for our particular use case and implementation.

## What does this package do?

This package gives you the code for a custom authorizer that will perform authorization on AWS API Gateway requests via the following:

* It confirms that an OAuth2 bearer token has been passed via the `Authorization` header.
* It confirms that the token is a JWT that has been signed using the RS256 algorithm with a specific public key
* It obtains the public key by inspecting the configuration returned by a configured JWKS endpoint
* It also ensures that the JWT has the required Issuer (`iss` claim) and Audience (`aud` claim)
* It also confirms that the JWT has been issued to a Cimpress Employee 

## Setup

Install Node Packages:

```bash
npm install
```

This is a prerequisite for deployment as AWS Lambda requires these files to be included in a bundle (a special ZIP file).

## Local testing

Configure the local environment with a `.env` file by copying the sample:

```bash
cp .env.sample .env
```

### Environment Variables

Modify the `.env`:
* `TOKEN_ISSUER`: The issuer of the token. If you're using Auth0 as the token issuer, this would be: `https://your-tenant.auth0.com/`
* `JWKS_URI`: This is the URL of the associated JWKS endpoint. If you are using Auth0 as the token issuer, this would be: `https://your-tenant.auth0.com/.well-known/jwks.json`
* `AUDIENCE`: This is the required audience of the token. If you are using Auth0 as the Authorization Server, the audience value is the same thing as your API
* `CIMPRESS_CLAIM`: This is the parameter that will be true if that generated the token is a cimpress employee.

You can test the custom authorizer locally. You just need to obtain a valid JWT access token to perform the test. If you're using Auth0, see [these instructions](https://auth0.com/docs/tokens/access-token#how-to-get-an-access-token) on how to obtain one.

With a valid token, now you just need to create a local `event.json` file that contains it. Start by copying the sample file:

```bash
cp event.json.sample event.json
```

Then replace the `ACCESS_TOKEN` text in that file with the JWT you obtained in the previous step.

Finally, perform the test:

```bash
npm test
```

This uses the [lambda-local](https://www.npmjs.com/package/lambda-local) package to test the authorizer with your token. A successful test run will look something like this:

```
> lambda-local --timeout 300 --lambdapath index.js --eventpath event.json

Logs
----
START RequestId: fe210d1c-12de-0bff-dd0a-c3ac3e959520
{ type: 'TOKEN',
    authorizationToken: 'Bearer eyJ0eXA...M2pdKi79742x4xtkLm6qNSdDYDEub37AI2h_86ifdIimY4dAOQ',
    methodArn: 'arn:aws:execute-api:us-east-1:1234567890:apiId/stage/method/resourcePath' }
END


Message
------
{
    "principalId": "user_id",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "Stmt1459758003000",
                "Effect": "Allow",
                "Action": [
                    "execute-api:Invoke"
                ],
                "Resource": [
                    "arn:aws:execute-api:*"
                ]
            }
        ]
    }
}
```

An `Action` of `Allow` means the authorizer would have allowed the associated API call to the API Gateway if it contained your token.

## Deploying 
This code is currently deployed in the Press Integration AWS Account in the jwtAuthorizer Lambda

To create the lambda bundle, run the following command:

    npm run package

Then upload the zip `lambda-authorizer-dist.zip` to the jwtAuthorizer Lambda in EU West 1.

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE.txt) file for more info.
