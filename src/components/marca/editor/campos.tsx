import { Field, Select } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Classe legada para controles especiais do editor, alinhada ao sistema compartilhado. */
export const fieldClass = "field-control mt-2";

export function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        className="mt-2"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function SelectNative({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select className="mt-2" value={value} onChange={(event) => onChange(event.target.value)}>
        {Object.entries(options).map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
