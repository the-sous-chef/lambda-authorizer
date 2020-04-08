# About

This repo is for a custom authorizer for AWS API Gateway that will verify a JWT Token that has been passed to the API, and that it meets the required Issuer, Audience, and that it is from a Cimpress internal user.

This was initially pulled from https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer and modified to work for our use case.

The documentation below was trimmed and customized for our particular use case and implementation.

## What does this package do?

This package gives you the code for a custom authorizer that will perform authorization on AWS API Gateway requests via the following:

- It confirms that an OAuth2 bearer token has been passed via the `Authorization` header.
- It confirms that the token is a JWT that has been signed using the RS256 algorithm with a specific public key.
- It obtains the public key by inspecting the configuration returned by a configured JWKS endpoint.
- It also ensures that the JWT has the required Issuer (`iss` claim) and Audience (`aud` claim).
- It also confirms that the JWT has been issued to a Cimpress Employee.
- It returns an Resource Policy document allowing for the execution of **any API method in any AWS Gateway based  API**. Be careful as you may need authorization of the request in your lambda.

## Setup

Install Node Packages:

```bash
npm install
```

This is a prerequisite for deployment as AWS Lambda requires these files to be included.

### Environment Variables

The following environment variables are needed:

- `TOKEN_ISSUER`: The issuer of the token. If you're using Auth0 as the token issuer, this would be: `https://your-tenant.auth0.com/`
- `JWKS_URI`: This is the URL of the associated JWKS endpoint. If you are using Auth0 as the token issuer, this would be: `https://your-tenant.auth0.com/.well-known/jwks.json`
- `AUDIENCE`: This is the required audience of the token. If you are using Auth0 as the Authorization Server, the audience value is the same thing as your API

With a valid token, now you just need to create a local `event.json` file that contains it. Start by copying the sample file:

```bash
cp event.json.sample event.json
```

Then replace the `ACCESS_TOKEN` text in that file with the JWT you obtained in the previous step.

Finally, perform the test:

```bash
serverless invoke local -f authorize -p event.json
```

```
Message
------
{
    "principalId": "G3ufqzDveZ72DXBL9rkU2egpIR3Wsf5z@clients",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": "execute-api:Invoke",
                "Effect": "Allow",
                "Resource": "arn:aws:execute-api:us-east-1:1234567890:apiId/stage/method/resourcePath"
            }
        ]
    },
    "context": {}
}
```

An `Action` of `Allow` means the authorizer would have allowed the associated API call to the API Gateway if it contained your token.

## Deploying

This code is currently deployed in the Product Catalog Triebe AWS Account in the `jwt-authorizer` Lambda

To create the lambda bundle, run the following command:

```bash
    sls deploy
```

# How to use it

Create a custom authorizer under the `API Gateway > Resources` desired method pointing to this lambda and using the `Authorization` header.

If your are using `Serverless.com` you need to add the `authorizer`section and ARN of this lambda to the http event configuration of the desired function:

```
path: api/private
  method: get
  authorizer:
    arn: arn:aws:lambda:eu-west-1:938096484345:function:jwt-authorizer-prod-authorize
```

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE.txt) file for more info.
