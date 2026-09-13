import { lazy, Suspense, useState } from "react";
import { Sparkles } from "lucide-react";

const AssistenteCortai = lazy(() =>
  import("./AssistenteCortai").then((m) => ({ default: m.AssistenteCortai })),
);

/** Atalho para o assistente. `variante="linha"` serve para listas e menus. */
export function BotaoAssistente({ variante = "destaque" }: { variante?: "destaque" | "linha" }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {variante === "destaque" ? (
        <button
          type="button"
          data-guia="dash-assistente"
          onClick={() => setAberto(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-gold/40 bg-ink2 px-4 py-3.5 text-left"
        >
          <Sparkles size={18} className="shrink-0 text-gold" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-paper">Perguntar ao CortAI</span>
            <span className="mt-0.5 block text-xs text-mute">
              Cadastre serviços, ajuste horários ou tire dúvidas escrevendo normal.
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex w-full items-center gap-3 border-b border-line py-4 text-left"
        >
          <Sparkles size={17} className="shrink-0 text-gold" aria-hidden />
          <span className="text-sm text-paper">Perguntar ao CortAI</span>
        </button>
      )}

      {aberto ? (
        <Suspense fallback={null}>
          <AssistenteCortai onFechar={() => setAberto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
