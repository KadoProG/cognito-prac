import { useCallback, useState } from "react";

import { errorMessage } from "./api.ts";

/**
 * フォーム送信の pending と失敗の文言をまとめて持つ。
 * 二重送信は pending 中の Button の disabled で防ぐ。
 * 失敗は文言として state に残すだけで、呼び出し側には成否を boolean で返す。
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setPending(true);
      setError(null);
      try {
        await action();
        return true;
      } catch (caught) {
        setError(errorMessage(caught));
        return false;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return { pending, error, setError, submit };
}
