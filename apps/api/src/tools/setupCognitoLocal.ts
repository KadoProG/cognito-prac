/**
 * cognito-local にユーザープールとクライアントを作り、ID を apps/api/.env に書く。
 * 何度実行しても同じ名前のものを使い回す（無ければ作る）。
 */
import {
  CognitoIdentityProviderClient,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  ListUserPoolClientsCommand,
  ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { existsSync } from "node:fs";
import { copyFile, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const POOL_NAME = "cognito-prac-local";
const CLIENT_NAME = "web";

const endpoint = process.env.COGNITO_ENDPOINT || "http://localhost:9229";
const client = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || "ap-northeast-1",
  endpoint,
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

async function ensureUserPool(): Promise<string> {
  const pools = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
  const existing = pools.UserPools?.find((pool) => pool.Name === POOL_NAME);
  if (existing?.Id) return existing.Id;

  const created = await client.send(
    new CreateUserPoolCommand({
      PoolName: POOL_NAME,
      UsernameAttributes: ["email"],
      AutoVerifiedAttributes: ["email"],
      Policies: { PasswordPolicy: { MinimumLength: 8 } },
    }),
  );
  const id = created.UserPool?.Id;
  if (!id) throw new Error("CreateUserPool returned no Id");
  return id;
}

async function ensureClient(userPoolId: string): Promise<string> {
  const clients = await client.send(
    new ListUserPoolClientsCommand({ UserPoolId: userPoolId, MaxResults: 60 }),
  );
  const existing = clients.UserPoolClients?.find(
    (c) => c.ClientName === CLIENT_NAME,
  );
  if (existing?.ClientId) return existing.ClientId;

  const created = await client.send(
    new CreateUserPoolClientCommand({
      UserPoolId: userPoolId,
      ClientName: CLIENT_NAME,
      GenerateSecret: false,
      ExplicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
    }),
  );
  const id = created.UserPoolClient?.ClientId;
  if (!id) throw new Error("CreateUserPoolClient returned no ClientId");
  return id;
}

/** .env の該当キーだけを置き換える。無いキーは末尾に足す。 */
async function updateEnvFile(values: Record<string, string>) {
  const dir = fileURLToPath(new URL("../../", import.meta.url));
  const envPath = `${dir}.env`;
  if (!existsSync(envPath)) {
    await copyFile(`${dir}.env.example`, envPath);
  }
  let content = await readFile(envPath, "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    content = pattern.test(content)
      ? content.replace(pattern, line)
      : `${content.trimEnd()}\n${line}\n`;
  }
  await writeFile(envPath, content);
  return envPath;
}

const userPoolId = await ensureUserPool();
const clientId = await ensureClient(userPoolId);
const envPath = await updateEnvFile({
  COGNITO_USER_POOL_ID: userPoolId,
  COGNITO_CLIENT_ID: clientId,
});

console.log(`User pool: ${userPoolId}`);
console.log(`Client:    ${clientId}`);
console.log(`Written to ${envPath}`);
