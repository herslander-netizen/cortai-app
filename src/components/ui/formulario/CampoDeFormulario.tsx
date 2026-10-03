import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Campo preenchido com rótulo flutuante: sobe ao focar ou preencher.
 * Erro aparece abaixo (field-error); obrigatório ganha asterisco.
 */
export function CampoDeFormulario({
  rotulo,
  erro,
  dica,
  obrigatorio,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  obrigatorio?: boolean;
}) {
  const id = useId();
  const idApoio = `${id}-apoio`;
  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          placeholder=" "
          required={obrigatorio}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro || dica ? idApoio : undefined}
          className="field-control peer pb-2 pt-6"
          {...props}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-mute transition-all duration-150",
            "peer-focus:top-4 peer-focus:text-xs peer-focus:text-gold",
            "peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-xs",
          )}
        >
          {rotulo}
          {obrigatorio ? <span aria-hidden> *</span> : null}
        </label>
      </div>
      {erro ? (
        <span id={idApoio} className="field-error" role="alert">
          {erro}
        </span>
      ) : dica ? (
        <span id={idApoio} className="field-hint">
          {dica}
        </span>
      ) : null}
    </div>
  );
}
