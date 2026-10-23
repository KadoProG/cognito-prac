import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * アプリ側のユーザー。認証は Cognito が持ち、ここには Cognito の sub との対応と
 * アプリが必要とする最小の情報だけを置く。
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  cognitoSub: text("cognito_sub").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
