import { useCallback, useState } from "react";

import { errorMessage } from "./api.ts";

/**
 * フォーム送信の pending と失敗の文言をまとめて持つ。
 * 二重送信は pending 中の Button の disabled で防ぐ。
 */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
      throw caught;
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, error, setError, submit };
}
