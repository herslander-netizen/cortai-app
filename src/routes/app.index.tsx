import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock3, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import coverAsset from "@/assets/cortai-barbershop-cover.jpg.asset.json";
import { Signature } from "@/components/layout/Signature";
import { brl } from "@/lib/format";
import { DescobrirBarbearias } from "@/components/cliente/DescobrirBarbearias";
import { getContextoCliente } from "@/lib/contexto-cliente.functions";
import { TelaDeCarregamento } from "@/components/layout/Carregando";

export const Route = createFileRoute("/app/")({
  validateSearch: (search: Record<string, unknown>): { b?: string } =>
    typeof search["b"] === "string" && search["b"] ? { b: search["b"] } : {},
  head: () => ({
    meta: [
      { title: "Início — Cortaí" },
      { name: "description", content: "Escolha sua barbearia e agende seu próximo corte no Cortaí." },
      { property: "og:title", content: "Início — Cortaí" },
      { property: "og:description", content: "Seu próximo corte em um toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InicioCliente,
});

function InicioCliente() {
  const { b } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["contexto-cliente", b ?? null],
    queryFn: () => getContextoCliente({ data: b ? { slug: b } : {} }),
  });

  if (isLoading) {
    return (
      <TelaDeCarregamento />
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-10">
        <main className="flex-1">
          <h1 className="sr-only">Início — Cortaí</h1>
          <DescobrirBarbearias />
        </main>
        <Signature />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pb-5 pt-7">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {data.logo_signed_url ? (
              <img src={data.logo_signed_url} alt={`Logo ${data.nome}`} className="h-11 w-11 shrink-0 rounded-md object-contain" />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-[26px] font-bold leading-tight text-paper">{data.nome}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mute"><Clock3 size={13} aria-hidden /> Agendamentos online</p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-mute"><MapPin size={13} className="shrink-0" aria-hidden /><span className="truncate">{data.endereco ?? "Atendimento na barbearia"}</span></p>
            </div>
          </div>
          <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink2 px-2.5 py-1.5 text-[9px] font-semibold uppercase text-sage">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" aria-hidden /> Agenda online
          </span>
        </div>
      </header>

      <main className="flex-1 px-5">
        <section className="relative min-h-[340px] overflow-hidden rounded-2xl">
          <img src={data.capa_signed_url ?? coverAsset.url} alt="Cadeira de barbearia em ambiente sofisticado" width={1200} height={1500} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="relative flex min-h-[340px] flex-col justify-end p-5">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase text-gold"><Sparkles size={13} /> Sua melhor versão</p>
            <p className="mt-2 max-w-[300px] text-[30px] font-bold leading-[1.1] text-paper">Seu estilo, no seu horário.</p>
            <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-paper/75">{data.texto_boas_vindas ?? "Sua barbearia, no seu tempo."}</p>
            <Link to="/app/agendar" search={{ b: data.slug }} className="btn-primary mt-5 self-start px-6 py-3.5">Agendar horário</Link>
          </div>
        </section>

        <section className="py-7">
          <h2 className="text-xs font-semibold uppercase text-mute">Seu próximo corte</h2>
          <div className="mt-4 border-y border-line py-5">
            <p className="text-base font-semibold text-paper">Nenhum horário marcado</p>
            <p className="mt-1 text-sm text-mute">Escolha o melhor dia para o próximo corte.</p>
          </div>
          <Link to="/app/espera" className="mt-5 flex items-center justify-between gap-4 border-b border-line pb-5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-paper">Sem horário bom para você?</span>
              <span className="mt-1 block text-xs text-mute">Entre na lista de espera e avisamos quando vagar.</span>
            </span>
            <span className="shrink-0 text-xs text-gold">Entrar</span>
          </Link>
          <Link to="/" className="mt-5 block text-xs text-mute underline">
            Trocar de barbearia
          </Link>
        </section>

        {data.loja.ativa ? (
          <section className="pb-7">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-xs font-semibold uppercase text-mute">Na loja da barbearia</h2>
              <Link to="/loja/$slug" params={{ slug: data.slug }} className="text-xs text-gold">Ver tudo</Link>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {data.loja.destaques.slice(0, 4).map((produto) => (
                <li key={produto.id}>
                  <Link to="/loja/$slug" params={{ slug: data.slug }} className="block overflow-hidden rounded-xl border border-line bg-ink2">
                    {produto.foto_url ? (
                      <img src={produto.foto_url} alt={produto.nome} loading="lazy" className="aspect-square w-full object-cover" />
                    ) : (
                      <span className="flex aspect-square w-full items-center justify-center bg-ink3 text-mute"><ShoppingBag size={20} /></span>
                    )}
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold text-paper">{produto.nome}</span>
                      <span className="mt-1 block text-sm font-semibold text-gold">{brl(produto.preco_centavos)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

      </main>
      <Signature />
    </div>
  );
}
