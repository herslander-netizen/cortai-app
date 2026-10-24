import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";

/** Grupo de campos de um editor (`SectionGroup` do Figaro): rótulo pequeno e cartão. */
export function GrupoDeCampos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2" aria-label={titulo}>
      <h3 className="px-2 text-sm font-medium text-mute">{titulo}</h3>
      <div className="space-y-4 rounded-[28px] bg-ink2 p-5">{children}</div>
    </section>
  );
}

/** Linha com switch e dica, como "Show photo" / "Show extra details" do Figaro. */
export function LinhaComSwitch({
  rotulo,
  dica,
  marcado,
  onChange,
}: {
  rotulo: string;
  dica?: string;
  marcado: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-base text-paper">{rotulo}</span>
        {dica ? <span className="mt-0.5 block text-sm leading-snug text-mute">{dica}</span> : null}
      </span>
      <Switch checked={marcado} onCheckedChange={onChange} aria-label={rotulo} />
    </label>
  );
}

export { OpcoesConectadas } from "@/components/ui/opcoes-conectadas";
