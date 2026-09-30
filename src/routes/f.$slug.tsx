import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Clock3, Users } from "lucide-react";

import { brl } from "@/lib/format";
import { Signature } from "@/components/layout/Signature";
import { TelaDeCarregamento } from "@/components/layout/Carregando";
import { LogoBarbearia } from "@/components/marca/LogoBarbearia";
import { entrarNaFilaPublica, getFilaPublica, getStatusNaFila } from "@/lib/fila-publica.functions";

export const Route = createFileRoute("/f/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Entrar na fila — ${params.slug} | Cortaí` },
      { name: "description", content: "Entre na fila do negócio pelo celular e acompanhe sua posição." },
      { property: "og:title", content: `Entrar na fila — ${params.slug}` },
      { property: "og:description", content: "Escolha o serviço e acompanhe sua vez." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `https://cortai.dev/f/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `https://cortai.dev/f/${params.slug}` }],
  }),
  component: FilaPublicaPage,
});

const CHAVE = "cortai:fila:";

function FilaPublicaPage() {
  const { slug } = Route.useParams();
  const entrar = useServerFn(entrarNaFilaPublica);
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servicoId, setServicoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["fila-publica", slug], queryFn: () => getFilaPublica({ data: { slug } }) });

  useEffect(() => {
    setToken(localStorage.getItem(CHAVE + slug));
  }, [slug]);

  const { data: status } = useQuery({
    queryKey: ["fila-status", token],
    queryFn: () => getStatusNaFila({ data: { token: token! } }),
    enabled: Boolean(token),
    refetchInterval: 20000,
  });

  if (isLoading) return <TelaDeCarregamento texto="Abrindo a fila…" />;
  if (!data) throw notFound();

  const acompanhando = Boolean(token && status);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-6 pb-10 pt-12">
      <div className="flex items-center gap-3">
        <LogoBarbearia nome={data.nome} url={data.logoUrl} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-paper">{data.nome}</h1>
          <p className="text-xs text-mute">
            {data.naFila === 0
              ? "Ninguém esperando agora"
              : `${data.naFila} ${data.naFila === 1 ? "pessoa" : "pessoas"} na fila`}
          </p>
        </div>
      </div>

      {acompanhando ? (
        <section className="mt-8 surface px-5 py-6 text-center">
          {status!.status === "atendido" || status!.status === "saiu" ? (
            <>
              <p className="text-sm text-mute">
                {status!.status === "atendido" ? "Atendimento concluído." : "Você saiu da fila."}
              </p>
              <button
                type="button"
                className="btn-secondary mt-5 w-full py-2.5 text-sm"
                onClick={() => {
                  localStorage.removeItem(CHAVE + slug);
                  setToken(null);
                }}
              >
                Entrar na fila de novo
              </button>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-mute">Sua posição</p>
              <p className="mt-2 text-[56px] font-bold leading-none text-gold">{status!.posicao}</p>
              <p className="mt-3 flex items-center justify-center gap-4 text-xs text-mute">
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} aria-hidden /> {status!.pessoasNaFrente} na frente
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={13} aria-hidden /> ~{status!.esperaMin} min
                </span>
              </p>
              {status!.servico ? <p className="mt-3 text-xs text-mute2">{status!.servico}</p> : null}
              {status!.avisado ? (
                <p className="mt-4 rounded-lg border border-gold/40 px-4 py-3 text-sm text-gold">
                  É quase a sua vez — fique por perto.
                </p>
              ) : null}
              <p className="mt-4 text-xs text-mute2">
                A posição atualiza sozinha. Você pode deixar esta tela aberta.
              </p>
            </>
          )}
        </section>
      ) : (
        <form
          className="mt-8"
          onSubmit={async (e) => {
            e.preventDefault();
            setEnviando(true);
            setErro(null);
            try {
              const r = await entrar({ data: { slug, nome: nome.trim(), telefone, servicoId } });
              localStorage.setItem(CHAVE + slug, r.token);
              setToken(r.token);
            } catch (err) {
              setErro(err instanceof Error ? err.message : "Não consegui te colocar na fila agora.");
            } finally {
              setEnviando(false);
            }
          }}
        >
          {data.servicos.length ? (
            <>
              <p className="text-xs font-medium text-mute">Escolha o serviço</p>
              <div className="mt-2 space-y-2">
                {data.servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServicoId(servicoId === s.id ? null : s.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left ${
                      servicoId === s.id ? "border-gold bg-ink2" : "border-line2"
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm text-paper">{s.nome}</span>
                    <span className="shrink-0 text-xs text-mute">
                      {s.duracaoMin} min · {brl(s.precoCentavos)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <label className="mt-5 block text-xs font-medium text-mute">
            Seu nome
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={2}
              className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
            />
          </label>
          <label className="mt-4 block text-xs font-medium text-mute">
            WhatsApp
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
              inputMode="tel"
              placeholder="(11) 90000-0000"
              className="mt-2 h-12 w-full rounded-lg border border-line2 bg-ink2 px-4 text-sm text-paper outline-none"
            />
          </label>

          <button className="btn-primary mt-6 w-full py-3.5" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar na fila"}
          </button>
          <p className="mt-3 text-center text-xs text-mute2">
            Sem cadastro e sem senha. Usamos seu WhatsApp só para te chamar.
          </p>
          {erro ? (
            <p className="mt-4 text-sm text-brick" role="alert">
              {erro}
            </p>
          ) : null}
        </form>
      )}

      <Signature />
    </main>
  );
}
