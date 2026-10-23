import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { AuthLayout } from "../components/AuthLayout.tsx";
import { Button } from "../components/Button.tsx";
import { FormMessage } from "../components/FormMessage.tsx";
import { TextField } from "../components/TextField.tsx";
import { api, unwrap } from "../lib/api.ts";
import { useSubmit } from "../lib/useSubmit.ts";

export function ConfirmSignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const { pending, error, submit } = useSubmit();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await submit(async () => {
      await unwrap(await api.api.auth.confirm.$post({ json: { email, code } }));
      navigate("/login", {
        state: {
          message: "メールアドレスを確認しました。ログインしてください",
        },
      });
    }).catch(() => {});
  };

  const onResend = async () => {
    setInfo(null);
    await submit(async () => {
      await unwrap(
        await api.api.auth["resend-code"].$post({ json: { email } }),
      );
      setInfo("確認コードを再送しました");
    }).catch(() => {});
  };

  return (
    <AuthLayout
      title="メールアドレスの確認"
      footer={
        <p>
          <Link to="/login" className="text-blue-600 underline">
            ログインに戻る
          </Link>
        </p>
      }
    >
      <p className="mb-4 text-sm text-gray-600">
        メールで届いた確認コードを入力してください。
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormMessage kind="info">{info}</FormMessage>
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
        <Button pending={pending}>確認する</Button>
        <button
          type="button"
          onClick={onResend}
          disabled={pending || email === ""}
          className="w-full text-sm text-blue-600 underline disabled:opacity-50"
        >
          確認コードを再送する
        </button>
      </form>
    </AuthLayout>
  );
}
