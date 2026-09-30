import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";

import { Signature } from "@/components/layout/Signature";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { getConviteDeAvaliacao, registrarAvaliacaoPublica } from "@/lib/avaliacoes-publicas.functions";

export const Route = createFileRoute("/avaliar/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Como foi sua experiência? — Cortaí" },
      { name: "description", content: "Avalie sua experiência com segurança pelo Cortaí." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AvaliacaoPage,
});

const DIMENSOES = [
  ["atendimento", "Atendimento"],
  ["pontualidade", "Pontualidade"],
  ["agendamento", "Facilidade para agendar"],
  ["experiencia", "Experiência com o negócio"],
] as const;

function Estrelas({ valor, aoMudar, rotulo }: { valor: number; aoMudar: (nota: number) => void; rotulo: string }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={rotulo}>
      {[1, 2, 3, 4, 5].map((nota) => (
        <button
          key={nota}
          type="button"
          role="radio"
          aria-checked={valor === nota}
          aria-label={`${nota} de 5`}
          onClick={() => aoMudar(nota)}
          className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <Star size={26} className={nota <= valor ? "fill-cyan-400 text-cyan-400" : "text-mute2"} />
        </button>
      ))}
    </div>
  );
}

function AvaliacaoPage() {
  const { token } = Route.useParams();
  const registrar = useServerFn(registrarAvaliacaoPublica);
  const convite = useQuery({ queryKey: ["convite-avaliacao", token], queryFn: () => getConviteDeAvaliacao({ data: { token } }) });
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [dimensoes, setDimensoes] = useState<Record<string, number>>({});
  const envio = useMutation({
    mutationFn: () => registrar({ data: { token, nota, comentario, dimensoes } }),
  });

  if (convite.isLoading) return <TelaDeCarregamento texto="Abrindo sua avaliação…" />;
  if (!convite.data) throw notFound();
  if (envio.data) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-6 py-12 text-center">
        <h1 className="text-2xl font-bold text-paper">Obrigado por nos contar.</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          {envio.data.positiva
            ? "Ficamos felizes que sua experiência tenha sido boa."
            : "Seu feedback foi registrado e será considerado pela equipe."}
        </p>
        {envio.data.linkPublico ? (
          <a className="btn-primary mt-7 py-3" href={envio.data.linkPublico} target="_blank" rel="noreferrer">
            Compartilhar experiência publicamente
          </a>
        ) : null}
        <Signature />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-6 pb-10 pt-12">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">{convite.data.negocio}</p>
      <h1 className="mt-3 text-3xl font-bold text-paper">Como foi sua experiência?</h1>
      <p className="mt-2 text-sm text-mute">{convite.data.servico} · leva menos de um minuto.</p>

      <form
        className="mt-8 space-y-7"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (nota) envio.mutate();
        }}
      >
        <section className="surface p-5">
          <h2 className="text-sm font-semibold text-paper">Nota geral</h2>
          <div className="mt-3"><Estrelas valor={nota} aoMudar={setNota} rotulo="Nota geral" /></div>
        </section>
        <section className="surface divide-y divide-line px-5">
          {DIMENSOES.map(([chave, rotulo]) => (
            <div key={chave} className="py-4">
              <p className="text-sm text-paper">{rotulo} <span className="text-mute2">(opcional)</span></p>
              <Estrelas valor={dimensoes[chave] ?? 0} aoMudar={(valor) => setDimensoes((atual) => ({ ...atual, [chave]: valor }))} rotulo={rotulo} />
            </div>
          ))}
        </section>
        <label className="block text-sm text-paper">
          Comentário <span className="text-mute2">(opcional)</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={400}
            rows={4}
            className="mt-2 w-full rounded-xl border border-line2 bg-ink2 p-4 text-sm text-paper outline-none focus:border-cyan-400"
          />
        </label>
        <button className="btn-primary min-h-12 w-full" disabled={!nota || envio.isPending}>
          {envio.isPending ? "Enviando…" : "Enviar avaliação"}
        </button>
        {envio.isError ? <p className="text-sm text-brick" role="alert">{envio.error.message}</p> : null}
      </form>
      <Signature />
    </main>
  );
}