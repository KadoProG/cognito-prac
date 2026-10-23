import { useAuth } from "../auth/useAuth.ts";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { useSubmit } from "../lib/useSubmit.ts";

export function HomePage() {
  const { state, logout } = useAuth();
  const { pending, error, submit } = useSubmit();

  if (state.status !== "authenticated") return null;
  const { user } = state;

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">ようこそ</h1>
      <dl className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">メールアドレス</dt>
          <dd className="font-medium text-gray-900">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Cognito sub</dt>
          <dd className="font-mono text-xs text-gray-900">{user.sub}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">最終ログイン</dt>
          <dd className="text-gray-900">
            {new Date(user.lastLoginAt).toLocaleString("ja-JP")}
          </dd>
        </div>
      </dl>
      <FormMessage kind="error">{error}</FormMessage>
      <div className="mt-4">
        <Button type="button" pending={pending} onClick={() => submit(logout)}>
          ログアウト
        </Button>
      </div>
    </main>
  );
}
