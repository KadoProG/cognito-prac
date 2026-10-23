import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const booleanString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  COGNITO_REGION: z.string().min(1),
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  COOKIE_SECURE: booleanString.default(false),
});

export type Config = {
  port: number;
  databaseUrl: string;
  cognito: {
    region: string;
    userPoolId: string;
    clientId: string;
    endpoint: string | undefined;
    issuer: string;
  };
  cookieSecure: boolean;
};

export function loadConfig(env: Record<string, string | undefined>): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Invalid environment variables: ${detail}`);
  }
  const e = parsed.data;
  // cognito-local は IssuerDomain（既定 http://localhost:9229）配下にプール ID を付けた
  // iss を発行する。本物の Cognito も同じ形で、ドメインだけが違う。
  const issuerDomain =
    e.COGNITO_ENDPOINT ??
    `https://cognito-idp.${e.COGNITO_REGION}.amazonaws.com`;
  return {
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    cognito: {
      region: e.COGNITO_REGION,
      userPoolId: e.COGNITO_USER_POOL_ID,
      clientId: e.COGNITO_CLIENT_ID,
      endpoint: e.COGNITO_ENDPOINT,
      issuer: `${issuerDomain.replace(/\/$/, "")}/${e.COGNITO_USER_POOL_ID}`,
    },
    cookieSecure: e.COOKIE_SECURE,
  };
}
