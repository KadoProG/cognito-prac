import { eq } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { users } from "../db/schema.js";

export type User = {
  sub: string;
  email: string;
  name: string;
  lastLoginAt: Date;
};

/** 名前の初期値。メールアドレスの `@` より前。取れなければメールアドレスそのもの。 */
export function defaultNameFromEmail(email: string): string {
  return email.split("@")[0] || email;
}

export interface UserRepository {
  /**
   * ログイン（とリフレッシュ）のたびに呼ぶ。無ければ名前の初期値つきで作り、
   * あれば email と最終ログインを更新する（名前は変えない）。
   */
  upsertOnLogin(input: { cognitoSub: string; email: string }): Promise<User>;
  findByCognitoSub(cognitoSub: string): Promise<User | null>;
}

const toUser = (row: typeof users.$inferSelect): User => ({
  sub: row.cognitoSub,
  email: row.email,
  name: row.name,
  lastLoginAt: row.lastLoginAt,
});

export function createUserRepository(db: Db): UserRepository {
  return {
    async upsertOnLogin(input) {
      const [row] = await db
        .insert(users)
        .values({
          cognitoSub: input.cognitoSub,
          email: input.email,
          name: defaultNameFromEmail(input.email),
        })
        .onConflictDoUpdate({
          target: users.cognitoSub,
          set: { email: input.email, lastLoginAt: new Date() },
        })
        .returning();
      if (!row) throw new Error("Upsert returned no row");
      return toUser(row);
    },

    async findByCognitoSub(cognitoSub) {
      const row = await db.query.users.findFirst({
        where: eq(users.cognitoSub, cognitoSub),
      });
      return row ? toUser(row) : null;
    },
  };
}
