import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api, ApiError, unwrap } from "../lib/api.ts";
import type { User } from "../lib/api.ts";
import { AuthContext } from "./AuthContext.ts";
import type { AuthState } from "./AuthContext.ts";

/**
 * Cookie のセッションから現在のユーザーを復元する。
 * アクセストークンが切れていれば一度だけリフレッシュを試し、それも駄目なら未ログイン。
 */
async function loadSession(): Promise<User | null> {
  try {
    const { user } = await unwrap(await api.api.auth.me.$get());
    return user;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
  }
  try {
    const { user } = await unwrap(await api.api.auth.refresh.$post());
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadSession()
      .then((user) => {
        if (cancelled) return;
        setState(
          user
            ? { status: "authenticated", user }
            : { status: "unauthenticated" },
        );
      })
      .catch(() => {
        // API に届かないときは未ログイン扱いにして、ログイン画面で再試行してもらう。
        if (!cancelled) setState({ status: "unauthenticated" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await unwrap(
      await api.api.auth.login.$post({ json: { email, password } }),
    );
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(async () => {
    await unwrap(await api.api.auth.logout.$post());
    setState({ status: "unauthenticated" });
  }, []);

  const updateName = useCallback(async (name: string) => {
    const { user } = await unwrap(await api.api.me.$patch({ json: { name } }));
    setState({ status: "authenticated", user });
  }, []);

  const value = useMemo(
    () => ({ state, login, logout, updateName }),
    [state, login, logout, updateName],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
