import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Star } from "lucide-react";

import { Signature } from "@/components/layout/Signature";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { Button } from "@/components/ui/button";
import {
  getConviteDeAvaliacao,
  registrarAvaliacaoPublica,
} from "@/lib/avaliacoes-publicas.functions";

export const Route = createFileRoute("/avaliar/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Como foi sua experiência? — Flow" },
      { name: "description", content: "Avalie sua experiência com segurança pelo Flow." },
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

function Estrelas({
  valor,
  aoMudar,
  rotulo,
}: {
  valor: number;
  aoMudar: (nota: number) => void;
  rotulo: string;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label={rotulo}>
      {[1, 2, 3, 4, 5].map((nota) => (
        <Button
          key={nota}
          type="button"
          variant="ghost"
          aria-pressed={valor === nota}
          aria-label={`${nota} de 5`}
          onClick={() => aoMudar(nota)}
          className="h-12 w-12 rounded-lg p-0"
        >
          <Star
            size={26}
            aria-hidden
            className={nota <= valor ? "fill-gold text-gold" : "text-mute2"}
          />
        </Button>
      ))}
    </div>
  );
}

function AvaliacaoPage() {
  const { token } = Route.useParams();
  const registrar = useServerFn(registrarAvaliacaoPublica);
  const convite = useQuery({
    queryKey: ["convite-avaliacao", token],
    queryFn: () => getConviteDeAvaliacao({ data: { token } }),
  });
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
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-paper">Obrigado por nos contar.</h1>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          {envio.data.positiva
            ? "Ficamos felizes que sua experiência tenha sido boa."
            : "Seu feedback foi registrado e será considerado pela equipe."}
        </p>
        {envio.data.linkPublico ? (
          <Button asChild variant="primary" size="lg" className="mt-7">
            <a href={envio.data.linkPublico} target="_blank" rel="noreferrer">
              Compartilhar experiência publicamente
            </a>
          </Button>
        ) : null}
        <Signature variant="app" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--figaro-primary,var(--primary))]">
        {convite.data.negocio}
      </p>
      <h1 className="mt-3 text-[22px] font-semibold leading-7 tracking-tight text-paper md:text-2xl">Como foi sua experiência?</h1>
      <p className="mt-2 text-sm text-mute">{convite.data.servico} · leva menos de um minuto.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          if (nota) envio.mutate();
        }}
      >
        <section className="rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-5">
          <h2 className="text-sm font-semibold text-paper">Nota geral</h2>
          <div className="mt-3">
            <Estrelas valor={nota} aoMudar={setNota} rotulo="Nota geral" />
          </div>
        </section>
        <section className="grid gap-2 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
          {DIMENSOES.map(([chave, rotulo]) => (
            <div key={chave} className="rounded-[12px] bg-[var(--figaro-surface-container-high,var(--ink3))] px-4 py-3">
              <p className="text-sm text-paper">
                {rotulo} <span className="text-mute2">(opcional)</span>
              </p>
              <Estrelas
                valor={dimensoes[chave] ?? 0}
                aoMudar={(valor) => setDimensoes((atual) => ({ ...atual, [chave]: valor }))}
                rotulo={rotulo}
              />
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
            className="field-control mt-2 min-h-28 w-full py-3"
          />
        </label>
        <Button variant="primary" size="lg" className="w-full" disabled={!nota || envio.isPending}>
          {envio.isPending ? "Enviando…" : "Enviar avaliação"}
        </Button>
        {envio.isError ? (
          <p className="text-sm text-brick" role="alert">
            {envio.error.message}
          </p>
        ) : null}
      </form>
      <Signature variant="app" />
    </main>
  );
}
