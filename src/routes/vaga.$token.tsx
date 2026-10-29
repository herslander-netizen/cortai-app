import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Signature } from "@/components/layout/Signature";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { getOfertaPublica, responderOferta } from "@/lib/fila-ofertas.functions";

export const Route = createFileRoute("/vaga/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Abriu uma vaga para você — Flow" },
      { name: "description", content: "Confirme a vaga oferecida pela lista de espera." },
      { property: "og:title", content: "Abriu uma vaga para você — Flow" },
      { property: "og:description", content: "Confirme a vaga da sua lista de espera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VagaPage,
});

const MENSAGENS: Record<string, string> = {
  expirada:
    "O prazo desta vaga terminou e ela seguiu para o próximo da lista. Você continua na lista de espera.",
  recusada: "Tudo certo. Você continua na lista de espera e avisaremos na próxima vaga.",
  cancelada: "Esta vaga já foi preenchida. Você continua na lista de espera.",
  ocupado: "Esta vaga acabou de ser preenchida. Você continua na lista de espera.",
  nao_encontrada: "Não encontramos esta vaga.",
  indisponivel: "Esta vaga não está mais disponível.",
};

function VagaPage() {
  const { token } = Route.useParams();
  const responder = useServerFn(responderOferta);
  const oferta = useQuery({
    queryKey: ["oferta-fila", token],
    queryFn: () => getOfertaPublica({ data: { token } }),
  });
  const envio = useMutation({
    mutationFn: (aceitar: boolean) => responder({ data: { token, aceitar } }),
    onSettled: () => void oferta.refetch(),
  });

  if (oferta.isLoading) return <TelaDeCarregamento texto="Abrindo sua vaga…" />;
  const o = oferta.data;
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: o?.fuso, ...opts }).format(new Date(iso));

  let aviso: string | null = null;
  if (!o) aviso = MENSAGENS["nao_encontrada"]!;
  else if (envio.data && !envio.data.ok)
    aviso = MENSAGENS[envio.data.motivo ?? "indisponivel"] ?? MENSAGENS["indisponivel"]!;
  else if (o.status !== "enviada" && o.status !== "aceita") aviso = MENSAGENS[o.status] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-6 pb-10 pt-12">
      {o ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {o.negocio}
        </p>
      ) : null}
      <h1 className="mt-3 text-[22px] font-semibold leading-7 text-paper md:text-2xl">
        {o?.status === "aceita" ? "Horário confirmado" : "Abriu uma vaga para você"}
      </h1>
      {o ? (
        <section className="surface mt-6 p-5">
          <p className="text-lg font-semibold text-paper">{o.servico}</p>
          <p className="mt-1 text-sm text-mute">
            {fmt(o.inicio, { weekday: "long", day: "2-digit", month: "long" })} às{" "}
            {fmt(o.inicio, { hour: "2-digit", minute: "2-digit" })}
            {o.profissional ? ` · com ${o.profissional}` : ""}
          </p>
          {o.status === "enviada" && !aviso ? (
            <p className="mt-3 text-xs text-mute2">
              Confirme até {fmt(o.expiraEm, { hour: "2-digit", minute: "2-digit" })}. Depois disso a
              vaga segue para o próximo da lista.
            </p>
          ) : null}
        </section>
      ) : null}

      {aviso ? (
        <Aviso tom="atencao" className="mt-6">{aviso}</Aviso>
      ) : null}
      {o?.status === "aceita" ? (
        <Aviso tom="sucesso" className="mt-6">Pronto! Seu horário está na agenda.</Aviso>
      ) : null}

      {o?.status === "enviada" && !aviso ? (
        <div className="mt-8 flex flex-col gap-3">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={envio.isPending}
            onClick={() => envio.mutate(true)}
          >
            {envio.isPending ? "Confirmando…" : "Quero este horário"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            disabled={envio.isPending}
            onClick={() => envio.mutate(false)}
          >
            Não posso, continuar na lista
          </Button>
        </div>
      ) : null}
      {envio.isError ? (
        <Aviso tom="acao" className="mt-3">Não foi possível responder agora. Tente de novo.</Aviso>
      ) : null}
      <Signature />
    </main>
  );
}
