import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";

type DatalistInputProps = ComponentProps<typeof Input> & {
  listId: string;
  options: readonly string[];
};

export function DatalistInput({
  listId,
  options,
  ...props
}: DatalistInputProps) {
  return (
    <>
      <Input list={listId} {...props} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
