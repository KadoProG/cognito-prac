import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  pending?: boolean;
};

export function Button({
  pending = false,
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      {...rest}
    >
      {pending ? "送信中…" : children}
    </button>
  );
}
