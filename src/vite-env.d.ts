/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AWS_REGION?: string;
  readonly VITE_APPSYNC_URL?: string;
  readonly VITE_GRAPHQL_ENDPOINT?: string;
  readonly VITE_APPSYNC_API_ID?: string;
  readonly VITE_USER_POOL_ID?: string;
  readonly VITE_USER_POOL_CLIENT_ID?: string;
  readonly VITE_WEBHOOKS_INGRESS_URL?: string;
  readonly VITE_CLOUDFRONT_DOMAIN?: string;
  readonly VITE_CLOUDFRONT_URL?: string;
  readonly VITE_ASSET_BUCKET_NAME?: string;
  readonly VITE_DYNAMODB_TABLE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
