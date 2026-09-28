import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { IconeDaIA } from "./IconeDaIA";
import { useProgressoCortai } from "./useProgressoCortai";
import { getSessao } from "@/lib/sessao.functions";

const AssistenteCortai = lazy(() =>
  import("./AssistenteCortai").then((m) => ({ default: m.AssistenteCortai })),
);

const CHAVE_DO_ROTULO = "cortai:rotulo-fab";

/**
 * Bolha flutuante global da CortAI no painel de gestão.
 * Não navega: abre a folha inferior sobre a tela atual.
 */
export function FabCortai() {
  const [aberto, setAberto] = useState(false);
  const [rotulo, setRotulo] = useState(false);
  const progresso = useProgressoCortai();
  const { data: sessao } = useQuery({ queryKey: ["sessao"], queryFn: () => getSessao() });
  const pendentes = progresso?.pendentes ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(CHAVE_DO_ROTULO)) return;
    sessionStorage.setItem(CHAVE_DO_ROTULO, "1");
    setRotulo(true);
    const id = window.setTimeout(() => setRotulo(false), 4000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <div className="cortai-fab-area">
        {rotulo ? (
          <span aria-hidden className="cortai-fab-rotulo">
            CortAI
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label={
            pendentes > 0
              ? `Abrir CortAI · ${pendentes} ${pendentes === 1 ? "passo pendente" : "passos pendentes"}`
              : "Abrir CortAI"
          }
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className="cortai-fab"
        >
          {pendentes > 0 ? <span aria-hidden className="cortai-fab-pulso" /> : null}
          <IconeDaIA segmento={sessao?.segmento} size={30} />
          {pendentes > 0 ? (
            <span aria-hidden className="cortai-fab-badge">
              {pendentes}
            </span>
          ) : null}
        </button>
      </div>

      {aberto ? (
        <Suspense fallback={null}>
          <AssistenteCortai segmento={sessao?.segmento} onFechar={() => setAberto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
