declare namespace AWS {
    export type Statement = {
        Action: string;
        Effect: string;
        Resource: string;
    };

    export type PolicyDocument = {
        Version: string;
        Statement: Statement[];
    };

    export type Policy = {
        principalId: string;
        policyDocument: PolicyDocument;
        context: any;
    };
}