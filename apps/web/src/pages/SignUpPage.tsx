import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { AuthLayout } from "../components/AuthLayout.tsx";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { api, unwrap } from "../lib/api.ts";
import { useSubmit } from "../lib/useSubmit.ts";

export function SignUpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const { pending, error, setError, submit } = useSubmit();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }
    await submit(async () => {
      await unwrap(
        await api.api.auth.signup.$post({ json: { email, password } }),
      );
      navigate(`/confirm?email=${encodeURIComponent(email)}`);
    });
  };

  return (
    <AuthLayout
      title="サインアップ"
      footer={
        <p>
          すでにアカウントをお持ちの方は{" "}
          <Link to="/login" className="text-blue-600 underline">
            ログイン
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
          label="パスワード（8 文字以上）"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="パスワード（確認）"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />
        <Button pending={pending}>登録する</Button>
      </form>
    </AuthLayout>
  );
}
