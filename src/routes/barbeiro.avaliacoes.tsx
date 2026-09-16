import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, Screen } from "@/components/layout/Screen";
import { dataCurta } from "@/lib/format";
import { getAvaliacoes, registrarAvaliacao, salvarLinkAvaliacao } from "@/lib/crescimento.functions";
import { Carregando } from "@/components/layout/Carregando";
import { useAcao } from "@/hooks/useAcao";

export const Route = createFileRoute("/barbeiro/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações — Cortaí Gestão" },
      { name: "description", content: "Registre a nota de cada atendimento e convide os satisfeitos a avaliar publicamente." },
      { property: "og:title", content: "Avaliações — Cortaí Gestão" },
      { property: "og:description", content: "Feedback interno e convite público na medida certa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvaliacoesPage,
});

function Estrelas({ nota, onChange }: { nota: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
          onClick={() => onChange?.(n)}
          className={n <= nota ? "text-gold" : "text-mute2"}
        >
          <Star size={18} fill={n <= nota ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function AvaliacoesPage() {
  const registrar = useServerFn(registrarAvaliacao);
  const salvarLink = useServerFn(salvarLinkAvaliacao);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["avaliacoes"], queryFn: () => getAvaliacoes() });

  const [notas, setNotas] = useState<Record<string, number>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [link, setLink] = useState("");
  const [convite, setConvite] = useState<string | null>(null);
  const acao = useAcao();

  useEffect(() => {
    if (data) setLink(data.linkPublico ?? "");
  }, [data]);

  return (
    <Screen voltarPara="/barbeiro/mais" title="Avaliações" subtitle="Feedback interno, convite público só quando faz sentido.">
      {isLoading ? <Carregando /> : null}

      {data ? (
        <div className="rounded-xl border border-line bg-ink2 px-5 py-5">
          <p className="text-xs text-mute">Média interna</p>
          <p className="mt-1 text-[30px] font-bold leading-none text-paper">{data.media ?? "—"}</p>
          <p className="mt-2 text-xs text-mute2">
            {data.registradas.length} {data.registradas.length === 1 ? "avaliação registrada" : "avaliações registradas"}
          </p>
        </div>
      ) : null}

      <label className="mt-6 block">
        <span className="text-xs text-mute2">Link de avaliação pública (Google, por exemplo)</span>
        <input value={link} onChange={(e) => setLink(e.target.value)} className="input-premium mt-1 w-full" placeholder="https://" />
      </label>
      <button
        type="button"
        className="btn-tertiary mt-2 text-xs disabled:opacity-60"
        disabled={acao.ocupado}
        onClick={() =>
          acao.executar("link", () => salvarLink({ data: { link } }), {
            sucesso: "Link de avaliação salvo.",
            aoConcluir: async () => { await refetch(); },
          })
        }
      >
        {acao.estaEm("link") ? "Salvando…" : "Salvar link"}
      </button>

      <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Atendimentos sem avaliação</h2>
      {data && data.pendentes.length === 0 ? <EmptyState text="Todos os atendimentos recentes já foram avaliados." /> : null}
      <ul>
        {(data?.pendentes ?? []).map((p) => {
          const nota = notas[p.id] ?? 0;
          return (
            <li key={p.id} className="border-b border-line py-4">
              <p className="text-sm text-paper">{p.cliente}</p>
              <p className="mt-0.5 text-xs text-mute">
                {p.servico} · {dataCurta(p.inicio)}
              </p>
              <div className="mt-3">
                <Estrelas nota={nota} onChange={(n) => setNotas((s) => ({ ...s, [p.id]: n }))} />
              </div>
              {nota > 0 ? (
                <>
                  <textarea
                    value={comentarios[p.id] ?? ""}
                    onChange={(e) => setComentarios((s) => ({ ...s, [p.id]: e.target.value }))}
                    rows={2}
                    placeholder="Comentário (opcional)"
                    className="input-premium mt-3 w-full resize-none"
                  />
                  <button
                    type="button"
                    className="btn-tertiary mt-2 text-xs disabled:opacity-60"
                    disabled={acao.ocupado}
                    onClick={() =>
                      acao.executar(
                        `avaliar-${p.id}`,
                        () => registrar({ data: { agendamentoId: p.id, nota, comentario: comentarios[p.id] ?? "" } }),
                        {
                          sucesso: "Avaliação registrada.",
                          aoConcluir: async (r) => {
                            setConvite(
                              r.convidarPublico && r.link
                                ? `${p.cliente} gostou. Convide para avaliar publicamente: ${r.link}`
                                : r.convidarPublico
                                  ? `${p.cliente} gostou. Cadastre o link público acima para convidar.`
                                  : "Feedback registrado internamente.",
                            );
                            await refetch();
                          },
                        },
                      )
                    }
                  >
                    {acao.estaEm(`avaliar-${p.id}`) ? "Salvando…" : "Registrar avaliação"}
                  </button>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      {convite ? <p className="mt-4 break-words text-sm text-sage">{convite}</p> : null}

      <h2 className="mb-1 mt-8 text-sm font-semibold text-paper">Registradas</h2>
      {data && data.registradas.length === 0 ? <EmptyState text="Nenhuma avaliação ainda." /> : null}
      <ul>
        {(data?.registradas ?? []).map((a) => (
          <li key={a.id} className="border-b border-line py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="truncate text-sm text-paper">{a.cliente}</p>
              <Estrelas nota={a.nota} />
            </div>
            {a.comentario ? <p className="mt-1 text-xs text-mute">{a.comentario}</p> : null}
            <p className="mt-0.5 text-xs text-mute2">{dataCurta(a.criadoEm)}</p>
          </li>
        ))}
      </ul>
    </Screen>
  );
}
