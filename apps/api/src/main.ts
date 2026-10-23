import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { createJwksTokenVerifier } from "./auth/verifier.js";
import { createSdkCognitoGateway } from "./cognito/sdkGateway.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { createUserRepository } from "./users/repository.js";

const config = loadConfig(process.env);

const app = createApp({
  cognito: createSdkCognitoGateway(config.cognito),
  verifier: createJwksTokenVerifier(config.cognito),
  users: createUserRepository(createDb(config.databaseUrl)),
  cookieSecure: config.cookieSecure,
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
