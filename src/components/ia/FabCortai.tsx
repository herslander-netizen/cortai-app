import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { IconeDaIA } from "./IconeDaIA";
import { PontoDaCortai } from "./SeloDaCortai";
import { useEstadoDaCortai } from "./useEstadoDaCortai";
import { useProgressoCortai } from "./useProgressoCortai";
import { Button } from "@/components/ui/button";
import { SELO_DA_CORTAI } from "@/lib/brain/estado-cortai";
import { getSessao } from "@/lib/sessao.functions";

const AssistenteCortai = lazy(() =>
  import("./AssistenteCortai").then((m) => ({ default: m.AssistenteCortai })),
);

const CHAVE_DO_ROTULO = "cortai:rotulo-fab";

/**
 * Bolha flutuante global da Flow IA no painel de gestão.
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
            Flow
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label={
            pendentes > 0
              ? `Abrir Flow IA · ${pendentes} ${pendentes === 1 ? "passo pendente" : "passos pendentes"}`
              : "Abrir Flow IA"
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

/**
 * Ícone da Flow IA no cabeçalho do painel, ao lado do sininho.
 * Abre a mesma conversa (`AssistenteCortai`) sobre a tela atual e mostra um ponto
 * quando a Flow IA está desligada, pausada ou no limite.
 */
export function AtalhoCortaiNoCabecalho() {
  const [aberto, setAberto] = useState(false);
  const estado = useEstadoDaCortai();
  const { data: sessao } = useQuery({
    queryKey: ["sessao"],
    queryFn: () => getSessao(),
    staleTime: 300_000,
  });
  const situacao = estado && estado !== "ativa" ? ` · ${SELO_DA_CORTAI[estado].rotulo}` : "";

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setAberto(true)}
        aria-label={`Abrir Flow IA${situacao}`}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className="relative h-12 w-12 shrink-0 rounded-none border-0 text-mute hover:text-gold"
      >
        <IconeDaIA segmento={sessao?.segmento} size={22} />
        <PontoDaCortai estado={estado} />
      </Button>

      {aberto ? (
        <Suspense fallback={null}>
          <AssistenteCortai segmento={sessao?.segmento} onFechar={() => setAberto(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
