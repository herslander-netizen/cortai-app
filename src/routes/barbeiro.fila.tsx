import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { brl } from "@/lib/format";
import { avisarFila, getFila, removerDaFila } from "@/lib/barbeiro.functions";

export const Route = createFileRoute("/barbeiro/fila")({
  head: () => ({
    meta: [
      { title: "Fila de espera — Painel do barbeiro | Cortaí" },
      { name: "description", content: "Quem espera vaga, quem já foi avisado e quanto a fila recuperou no mês." },
      { property: "og:title", content: "Fila de espera — Cortaí" },
      { property: "og:description", content: "Horários vagos viram atendimento com a fila." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FilaPage,
});

function janelaTexto(inicio: number | null, fim: number | null) {
  if (inicio === null || fim === null) return "Qualquer horário";
  return `Entre ${String(inicio).padStart(2, "0")}h e ${String(fim).padStart(2, "0")}h`;
}

function FilaPage() {
  const avisar = useServerFn(avisarFila);
  const remover = useServerFn(removerDaFila);
  const [aviso, setAviso] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["fila"], queryFn: () => getFila() });

  return (
    <Screen voltarPara="/barbeiro/mais" title="Fila de espera" subtitle="Horário que vagou não fica vazio.">
      {aviso ? <p className="mb-4 text-sm text-sage">{aviso}</p> : null}
      {isLoading ? <p className="text-sm text-mute">Carregando…</p> : null}

      {data ? (
        <div className="rounded-lg border border-line bg-ink2 px-5 py-5">
          <p className="text-xs text-mute">Recuperado neste mês pela fila</p>
          <p className="mt-1 text-[28px] font-bold leading-none text-paper">{brl(data.recuperadoCentavos)}</p>
          <p className="mt-2 text-xs text-mute2">
            {data.recuperadosMes}{" "}
            {data.recuperadosMes === 1 ? "horário que ficaria vazio" : "horários que ficariam vazios"} viraram
            atendimento.
          </p>
        </div>
      ) : null}

      <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Na fila</h2>
      {data && data.itens.length === 0 ? <EmptyState text="Ninguém esperando vaga agora." /> : null}
      <ul>
        {(data?.itens ?? []).map((f) => (
          <li key={f.id} className="flex items-start gap-4 border-b border-line py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
              {f.posicao}
            </span>
            <div className="flex-1">
              <p className="text-sm text-paper">{f.cliente}</p>
              <p className="mt-0.5 text-xs text-mute">
                {janelaTexto(f.janelaInicio, f.janelaFim)}
                {f.profissional ? ` · ${f.profissional}` : ""}
              </p>
              <p className={`mt-0.5 text-xs ${f.avisado_em ? "text-sage" : "text-mute2"}`}>
                {f.avisado_em ? "Avisado — aguardando resposta" : "Ainda não avisado"}
              </p>
              <div className="mt-2 flex gap-4">
                <button
                  type="button"
                  className="btn-tertiary text-xs"
                  onClick={async () => {
                    await avisar({ data: { filaId: f.id } });
                    setAviso(`${f.cliente} foi avisado. Quem responder primeiro fica com a vaga.`);
                    refetch();
                  }}
                >
                  Avisar
                </button>
                <button
                  type="button"
                  className="text-xs text-brick underline"
                  onClick={async () => {
                    await remover({ data: { filaId: f.id } });
                    setAviso(`${f.cliente} saiu da fila.`);
                    refetch();
                  }}
                >
                  Tirar da fila
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-mute2">
        Quando um horário abre, o primeiro da fila é avisado. Quem responder primeiro fica com a vaga.
      </p>
    </Screen>
  );
}
