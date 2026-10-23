type Props = {
  kind: "error" | "info";
  children: string | null | undefined;
};

export function FormMessage({ kind, children }: Props) {
  if (!children) return null;
  const className =
    kind === "error"
      ? "rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      : "rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700";
  return (
    <p role={kind === "error" ? "alert" : "status"} className={className}>
      {children}
    </p>
  );
}
