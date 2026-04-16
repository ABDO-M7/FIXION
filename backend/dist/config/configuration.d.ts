export declare const databaseConfig: (() => {
    url: string | undefined;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    url: string | undefined;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
}>;
export declare const jwtConfig: (() => {
    secret: string | undefined;
    refreshSecret: string | undefined;
    expiresIn: string;
    refreshExpiresIn: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    secret: string | undefined;
    refreshSecret: string | undefined;
    expiresIn: string;
    refreshExpiresIn: string;
}>;
export declare const r2Config: (() => {
    accountId: string | undefined;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    bucketName: string | undefined;
    publicUrl: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    accountId: string | undefined;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    bucketName: string | undefined;
    publicUrl: string | undefined;
}>;
export declare const googleConfig: (() => {
    clientId: string | undefined;
    clientSecret: string | undefined;
    callbackUrl: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    clientId: string | undefined;
    clientSecret: string | undefined;
    callbackUrl: string | undefined;
}>;
export declare const resendConfig: (() => {
    apiKey: string | undefined;
    fromEmail: string | undefined;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    apiKey: string | undefined;
    fromEmail: string | undefined;
}>;
export declare const appConfig: (() => {
    port: number;
    frontendUrl: string;
    nodeEnv: string;
    appName: string;
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    port: number;
    frontendUrl: string;
    nodeEnv: string;
    appName: string;
}>;
