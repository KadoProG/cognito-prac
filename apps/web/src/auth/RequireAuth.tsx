import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "./useAuth.ts";

/** 未ログインなら /login へ。戻り先を state に持たせ、ログイン後に元の画面へ戻す。 */
export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <p className="p-8 text-center text-gray-500">読み込み中…</p>;
  }
  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
