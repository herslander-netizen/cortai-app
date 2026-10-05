import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export type OpcaoDeEscolha = { id: string; rotulo: string; detalhe?: string };

/** Campo que abre a seleção numa folha (serviço, profissional...). */
export function CampoDeEscolha({
  rotulo,
  valor,
  opcoes,
  onEscolher,
}: {
  rotulo: string;
  valor: string;
  opcoes: OpcaoDeEscolha[];
  onEscolher: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.id === valor);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setAberto(true)}
        className="field-control h-auto justify-between gap-3 px-4 py-2 text-left hover:bg-[var(--cartao)]"
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-mute">{rotulo}</span>
          <span className="truncate text-[17px] font-normal text-paper">
            {atual?.rotulo ?? "Escolher"}
          </span>
          {atual?.detalhe ? (
            <span className="truncate text-[13px] font-normal text-mute">{atual.detalhe}</span>
          ) : null}
        </span>
        <ChevronDown size={18} className="shrink-0 text-mute" />
      </Button>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-[var(--raio-folha)] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="px-1 text-xl font-semibold">{rotulo}</SheetTitle>
          <SheetDescription className="sr-only">Escolha uma opção</SheetDescription>
          <ul className="mt-4 flex flex-col gap-0.5">
            {opcoes.map((o) => (
              <li key={o.id}>
                <Button
                  type="button"
                  variant="ghost"
                  aria-selected={o.id === valor}
                  onClick={() => {
                    onEscolher(o.id);
                    setAberto(false);
                  }}
                  className="h-auto min-h-14 w-full justify-between gap-3 rounded-[var(--raio-grupo-interno)] bg-ink3 px-4 py-3 text-left"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium text-paper">{o.rotulo}</span>
                    {o.detalhe ? (
                      <span className="truncate text-[13px] font-normal text-mute">
                        {o.detalhe}
                      </span>
                    ) : null}
                  </span>
                  {o.id === valor ? <Check size={18} className="shrink-0 text-gold" /> : null}
                </Button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
