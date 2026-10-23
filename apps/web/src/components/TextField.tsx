import type { ComponentProps } from "react";

type Props = ComponentProps<"input"> & {
  label: string;
  name: string;
};

export function TextField({ label, name, ...rest }: Props) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        id={name}
        name={name}
        className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
        {...rest}
      />
    </label>
  );
}
