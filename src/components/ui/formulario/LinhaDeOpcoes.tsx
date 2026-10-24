import type { LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { LinhaDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type OpcaoDaLinha<T extends string | number> = {
  valor: T;
  rotulo: string;
  detalhe?: string;
};

/**
 * Linha de configuração que mostra o valor escolhido e abre uma folha de baixo com as opções
 * (`FigarooSheetScaffold` com seletor de uma linha por opção, ponto de rádio à direita),
 * como "Intervalo padrão dos horários" nas opções de agendamento do Figaro.
 */
export function LinhaDeOpcoes<T extends string | number>({
  icone,
  titulo,
  suporte,
  tituloDaFolha,
  opcoes,
  valor,
  aoEscolher,
  desabilitada,
  rodapeDaFolha,
}: {
  icone?: LucideIcon;
  titulo: string;
  suporte?: string;
  tituloDaFolha?: string;
  opcoes: readonly OpcaoDaLinha<T>[];
  valor: T;
  aoEscolher: (valor: T) => void;
  desabilitada?: boolean;
  rodapeDaFolha?: ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const atual = opcoes.find((o) => o.valor === valor);
  return (
    <>
      <LinhaDeConfiguracao
        {...(icone ? { icone } : {})}
        titulo={titulo}
        {...(suporte ? { suporte } : {})}
        fim={atual?.rotulo ?? ""}
        aoTocar={() => setAberta(true)}
        {...(desabilitada ? { desabilitada } : {})}
      />
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-[520px] rounded-t-[28px]">
          <SheetHeader className="text-left">
            <SheetTitle>{tituloDaFolha ?? titulo}</SheetTitle>
            <SheetDescription className="sr-only">Escolha uma opção.</SheetDescription>
          </SheetHeader>
          <ul role="radiogroup" aria-label={titulo} className="mt-4 flex flex-col gap-0.5">
            {opcoes.map((o) => {
              const marcada = o.valor === valor;
              return (
                <li key={String(o.valor)}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={marcada}
                    onClick={() => {
                      setAberta(false);
                      if (!marcada) aoEscolher(o.valor);
                    }}
                    className="flex min-h-14 w-full items-center gap-3 rounded-[4px] bg-[var(--agenda-cartao,var(--ink2))] px-4 py-3 text-left first:rounded-t-[28px] last:rounded-b-[28px] active:bg-paper/5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-5 text-paper">
                        {o.rotulo}
                      </span>
                      {o.detalhe ? (
                        <span className="mt-0.5 block text-sm leading-5 text-mute">
                          {o.detalhe}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border-2",
                        marcada ? "border-primary" : "border-mute2",
                      )}
                    >
                      {marcada ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {rodapeDaFolha ? <div className="mt-3">{rodapeDaFolha}</div> : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
