import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { useAuth } from "../auth/useAuth.ts";
import { AuthLayout } from "../components/AuthLayout.tsx";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { ApiError } from "../lib/api.ts";
import { useSubmit } from "../lib/useSubmit.ts";

type LocationState = { from?: string; message?: string } | null;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { pending, error, submit } = useSubmit();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit(async () => {
      try {
        await login(email, password);
      } catch (caught) {
        if (
          caught instanceof ApiError &&
          caught.code === "USER_NOT_CONFIRMED"
        ) {
          navigate(`/confirm?email=${encodeURIComponent(email)}`);
          return;
        }
        throw caught;
      }
      navigate(locationState?.from ?? "/", { replace: true });
    });
  };

  return (
    <AuthLayout
      title="ログイン"
      footer={
        <>
          <p>
            アカウントをお持ちでない方は{" "}
            <Link to="/signup" className="text-blue-600 underline">
              サインアップ
            </Link>
          </p>
          <p className="mt-2">
            <Link to="/forgot-password" className="text-blue-600 underline">
              パスワードをお忘れの方
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormMessage kind="info">{locationState?.message}</FormMessage>
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
          label="パスワード"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button pending={pending}>ログイン</Button>
      </form>
    </AuthLayout>
  );
}
