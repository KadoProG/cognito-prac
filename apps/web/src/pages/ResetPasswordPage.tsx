import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthLayout } from "../components/AuthLayout.tsx";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { api, unwrap } from "../lib/api.ts";
import { useSubmit } from "../lib/useSubmit.ts";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, submit } = useSubmit();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit(async () => {
      await unwrap(
        await api.api.auth["reset-password"].$post({
          json: { email, code, password },
        }),
      );
      navigate("/login", {
        state: { message: "パスワードを再設定しました。ログインしてください" },
      });
    }).catch(() => {});
  };

  return (
    <AuthLayout
      title="新しいパスワードの設定"
      footer={
        <p>
          <Link to="/forgot-password" className="text-blue-600 underline">
            確認コードを送り直す
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormMessage kind="error">{error}</FormMessage>
        <TextField
          label="メールアドレス"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="確認コード"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <TextField
          label="新しいパスワード（8 文字以上）"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button pending={pending}>パスワードを設定する</Button>
      </form>
    </AuthLayout>
  );
}
