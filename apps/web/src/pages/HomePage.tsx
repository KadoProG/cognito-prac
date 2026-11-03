import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../auth/useAuth.ts";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { useSubmit } from "../lib/useSubmit.ts";

export function HomePage() {
  const { state, logout, updateName } = useAuth();
  const { pending, error, submit } = useSubmit();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const edit = useSubmit();

  if (state.status !== "authenticated") return null;
  const { user } = state;

  const startEditing = () => {
    setDraft(user.name);
    setEditing(true);
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    const saved = await edit.submit(() => updateName(draft));
    if (saved) setEditing(false);
  };

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">ようこそ</h1>
      <dl className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">名前</dt>
          <dd className="font-medium text-gray-900">{user.name}</dd>
        </div>
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
      {editing ? (
        <form onSubmit={onSave} className="mb-6 space-y-4">
          <FormMessage kind="error">{edit.error}</FormMessage>
          <TextField
            label="名前"
            name="name"
            autoComplete="name"
            required
            maxLength={50}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button pending={edit.pending}>保存</Button>
            <Button
              type="button"
              disabled={edit.pending}
              onClick={() => setEditing(false)}
            >
              キャンセル
            </Button>
          </div>
        </form>
      ) : (
        <div className="mb-6">
          <Button type="button" onClick={startEditing}>
            名前を編集
          </Button>
        </div>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div className="mt-4">
        <Button type="button" pending={pending} onClick={() => submit(logout)}>
          ログアウト
        </Button>
      </div>
    </main>
  );
}
