import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, children, footer }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">{title}</h1>
        {children}
        {footer && <div className="mt-6 text-sm text-gray-600">{footer}</div>}
      </div>
    </main>
  );
}
