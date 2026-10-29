import { lazy, Suspense, useState } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const AssistenteCortai = lazy(() =>
  import("./AssistenteCortai").then((m) => ({ default: m.AssistenteCortai })),
);

/** Atalho para o assistente. `variante="linha"` serve para listas e menus. */
export function BotaoAssistente({
  variante = "destaque",
}: {
  variante?: "destaque" | "linha" | "grupo";
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {variante === "destaque" ? (
        <Button
          variant="ghost"
          type="button"
          data-guia="dash-assistente"
          onClick={() => setAberto(true)}
          className="h-auto min-h-12 w-full justify-start whitespace-normal rounded-xl border border-gold/40 bg-ink2 px-4 py-3.5 text-left"
        >
          <Sparkles size={18} className="shrink-0 text-gold" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-paper">Perguntar à Flow IA</span>
            <span className="mt-0.5 block text-xs text-mute">
              Cadastre serviços, ajuste horários ou tire dúvidas escrevendo normal.
            </span>
          </span>
        </Button>
      ) : variante === "grupo" ? (
        // Linha de grupo de configuração (mesmo desenho de `LinhaDeConfiguracao`): vai dentro de um `GrupoDeLinhas`.
        <li>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setAberto(true)}
            className="h-auto min-h-14 w-full justify-start gap-3 whitespace-normal rounded-none px-4 py-3 text-left"
          >
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary"
            >
              <Sparkles size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-5 text-paper">
                Perguntar à Flow IA
              </span>
              <span className="mt-0.5 block text-sm font-normal leading-5 text-mute">
                Cadastre serviços, ajuste horários ou tire dúvidas.
              </span>
            </span>
          </Button>
        </li>
      ) : (
        <Button
          variant="ghost"
          type="button"
          onClick={() => setAberto(true)}
          className="h-auto min-h-12 w-full justify-start whitespace-normal rounded-none border-b border-line px-0 py-4 text-left"
        >
          <Sparkles size={17} className="shrink-0 text-gold" aria-hidden />
          <span className="text-sm text-paper">Perguntar à Flow IA</span>
        </Button>
      )}

      {aberto ? (
        <Suspense fallback={null}>
          <AssistenteCortai onFechar={() => setAberto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
