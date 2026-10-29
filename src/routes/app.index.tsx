import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import coverNeutra from "@/assets/flow-capa-neutra.png.asset.json";
import coverBarbearia from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { Signature } from "@/components/layout/Signature";
import { Button } from "@/components/ui/button";
import { brl, dataHoraLonga } from "@/lib/format";
import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { StatusAgendamento } from "@/components/cliente/StatusAgendamento";
import { getContextoCliente } from "@/lib/contexto-cliente.functions";
import { listarAgendamentosCliente } from "@/lib/agendamento.functions";
import { EsqueletoCascoCliente, EsqueletoLista } from "@/components/layout/Esqueleto";
import { salvarContextoCliente, useContextoCliente } from "@/lib/contexto-cliente";
import { useEffect } from "react";

export const Route = createFileRoute("/app/")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Início — Flow" },
      {
        name: "description",
        content: "Escolha um negócio e agende seu próximo serviço no Flow.",
      },
      { property: "og:title", content: "Início — Flow" },
      { property: "og:description", content: "Seu próximo horário em um toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InicioCliente,
});

function InicioCliente() {
  const { b } = Route.useSearch();
  const contexto = useContextoCliente(b);
  const { data, isLoading } = useQuery({
    queryKey: ["contexto-cliente", contexto],
    queryFn: () => getContextoCliente({ data: contexto ? { slug: contexto } : {} }),
  });
  useEffect(() => {
    if (data?.slug) salvarContextoCliente(data.slug);
  }, [data?.slug]);

  const agendamentos = useQuery({
    queryKey: ["historico", data?.slug ?? null],
    queryFn: () => listarAgendamentosCliente({ data: data?.slug ? { slug: data.slug } : {} }),
    enabled: Boolean(data?.slug),
  });
  const agora = Date.now();
  const ehBarbearia = data?.segmento === "barbearia";
  const proximo = (agendamentos.data ?? [])
    .filter(
      (a) =>
        new Date(a.inicio).getTime() > agora &&
        a.status !== "cancelado" &&
        a.status !== "remarcado" &&
        a.status !== "nao_compareceu",
    )
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0];

  const ultimo = (agendamentos.data ?? [])
    .filter((a) => a.status === "finalizado")
    .sort((x, y) => new Date(y.inicio).getTime() - new Date(x.inicio).getTime())[0];

  if (isLoading) {
    return <EsqueletoCascoCliente />;
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-10">
        <main className="flex-1">
          <h1 className="sr-only">Início — Flow</h1>
          <DescobrirBarbearias />
        </main>
        <Signature variant="app" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-4 pt-7">
        <div className="flex min-w-0 items-center gap-3">
          {data.logo_signed_url ? (
            <img
              src={data.logo_signed_url}
              alt={`Logo ${data.nome}`}
              className="h-11 w-11 shrink-0 rounded-md object-contain"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-bold leading-tight text-paper">{data.nome}</h1>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-mute">
              <MapPin size={13} className="shrink-0" aria-hidden />
              <span className="truncate">{data.endereco ?? "Atendimento no local"}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5">
        <section aria-labelledby="proximo-horario">
          <h2 id="proximo-horario" className="text-xs font-semibold uppercase text-mute">
            Seu próximo horário
          </h2>
          {proximo ? (
            <Link
              to="/app/historico"
              search={{ b: data.slug }}
              className="mt-3 flex min-h-[72px] items-center gap-4 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4 transition-transform duration-200 active:scale-[0.98]"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold text-paper">
                    {proximo.servicos?.nome ?? "Serviço"}
                  </span>
                  <StatusAgendamento status={proximo.status} />
                </span>
                <span className="mt-1 block text-sm text-mute">
                  {dataHoraLonga(proximo.inicio)}
                </span>
                <span className="mt-0.5 block text-xs text-mute2">
                  com {proximo.profissionais?.nome ?? "profissional"}
                </span>
              </span>
              <ChevronRight
                size={18}
                strokeWidth={1.75}
                className="shrink-0 text-mute"
                aria-hidden
              />
            </Link>
          ) : agendamentos.isLoading ? (
            <EsqueletoLista linhas={1} />
          ) : (
            <div className="mt-3 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4">
              <p className="text-base font-semibold text-paper">Nenhum horário marcado</p>
              <p className="mt-1 text-sm text-mute">
                Escolha o melhor dia para o próximo atendimento.
              </p>
            </div>
          )}
          <Button asChild size="lg" variant="primary" className="mt-3 w-full">
            <Link to="/app/agendar" search={{ b: data.slug }}>
              {proximo ? "Agendar outro horário" : "Agendar horário"}
            </Link>
          </Button>
          {ultimo ? (
            <p className="mt-2 text-center text-xs text-mute">
              Último atendimento: {ultimo.servicos?.nome ?? "serviço"}
              {ultimo.profissionais?.nome ? ` com ${ultimo.profissionais.nome}` : ""}
            </p>
          ) : null}
        </section>

        <section className="relative mt-6 min-h-[200px] overflow-hidden rounded-2xl">
          <img
            src={data.capa_signed_url ?? (ehBarbearia ? coverBarbearia.url : coverNeutra.url)}
            alt={`Capa de ${data.nome}`}
            width={1200}
            height={1500}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="relative flex min-h-[200px] flex-col justify-end p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-gold">
              <Sparkles size={13} aria-hidden /> Sua melhor versão
            </p>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-paper/85">
              {data.texto_boas_vindas ?? "Seu cuidado, no seu tempo."}
            </p>
          </div>
        </section>

        <section className="py-6">
          <Link
            to="/app/espera"
            search={{ b: data.slug }}
            className="flex min-h-[64px] items-center justify-between gap-4 rounded-[28px] bg-[var(--figaro-surface-container,var(--ink2))] p-4 transition-transform duration-200 active:scale-[0.98]"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-paper">
                Sem horário bom para você?
              </span>
              <span className="mt-1 block text-xs text-mute">
                Entre na lista de espera e avisamos quando vagar.
              </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-[var(--figaro-primary,var(--primary))]">Entrar</span>
          </Link>
          <Link
            to="/barbearias"
            className="mt-4 flex min-h-12 items-center text-xs text-mute underline"
          >
            Trocar de negócio
          </Link>
        </section>

        {data.loja.ativa ? (
          <section className="pb-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase text-mute">Na loja</h2>
              <Link to="/loja/$slug" params={{ slug: data.slug }} className="text-sm font-medium text-[var(--figaro-primary,var(--primary))]">
                Ver tudo
              </Link>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {data.loja.destaques.slice(0, 4).map((produto) => (
                <li key={produto.id}>
                  <Link
                    to="/loja/$slug"
                    params={{ slug: data.slug }}
                    className="block overflow-hidden rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] transition-transform duration-200 active:scale-[0.98]"
                  >
                    {produto.foto_url ? (
                      <img
                        src={produto.foto_url}
                        alt={produto.nome}
                        width={320}
                        height={320}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <span className="flex aspect-square w-full items-center justify-center bg-[var(--figaro-surface-container-high,var(--ink3))] text-mute">
                        <ShoppingBag size={20} />
                      </span>
                    )}
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold text-paper">
                        {produto.nome}
                      </span>
                      <span className="mt-1 block text-sm font-semibold text-gold">
                        {brl(produto.preco_centavos)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
      <Signature variant="app" />
    </div>
  );
}
