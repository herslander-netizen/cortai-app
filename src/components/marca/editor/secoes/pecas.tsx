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

/** Botões conectados (Mostrar | Ocultar, Data | Nota): uma opção marcada por vez. */
export function OpcoesConectadas<T extends string>({
  rotulo,
  valor,
  opcoes,
  onChange,
}: {
  rotulo: string;
  valor: T;
  opcoes: ReadonlyArray<{ valor: T; texto: string }>;
  onChange: (valor: T) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex gap-0.5">
      {opcoes.map((o, i) => {
        const marcada = o.valor === valor;
        const raio =
          i === 0
            ? "rounded-l-full rounded-r-md"
            : i === opcoes.length - 1
              ? "rounded-r-full rounded-l-md"
              : "rounded-md";
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={marcada}
            onClick={() => onChange(o.valor)}
            className={`min-h-12 flex-1 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${raio} ${
              marcada ? "bg-gold text-ink" : "bg-ink3 text-paper hover:bg-ink3/80"
            }`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
