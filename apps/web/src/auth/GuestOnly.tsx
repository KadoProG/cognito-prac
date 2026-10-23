import { Navigate, Outlet } from "react-router";

import { useAuth } from "./useAuth.ts";

/** ログイン済みならトップへ。ログイン・サインアップ系の画面に使う。 */
export function GuestOnly() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return <p className="p-8 text-center text-gray-500">読み込み中…</p>;
  }
  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
