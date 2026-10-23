import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { AuthLayout } from "../components/AuthLayout.tsx";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { api, unwrap } from "../lib/api.ts";
import { useSubmit } from "../lib/useSubmit.ts";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const { pending, error, submit } = useSubmit();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit(async () => {
      await unwrap(
        await api.api.auth["forgot-password"].$post({ json: { email } }),
      );
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    });
  };

  return (
    <AuthLayout
      title="パスワードの再設定"
      footer={
        <p>
          <Link to="/login" className="text-blue-600 underline">
            ログインに戻る
          </Link>
        </p>
      }
    >
      <p className="mb-4 text-sm text-gray-600">
        登録したメールアドレスに確認コードを送ります。
      </p>
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
        <Button pending={pending}>確認コードを送る</Button>
      </form>
    </AuthLayout>
  );
}
