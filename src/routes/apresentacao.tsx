import { createFileRoute, Link } from "@tanstack/react-router";

import { SecaoDaHome, SecaoHero } from "@/components/home/SecoesHome";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";
import { getHomePublicada } from "@/lib/home.functions";

export const Route = createFileRoute("/apresentacao")({
  loader: () => getHomePublicada(),
  head: ({ loaderData }) => {
    const titulo = loaderData?.seo.titulo || "Cortaí — Gestão para barbearias";
    const descricao =
      loaderData?.seo.descricao ||
      "Agenda, clientes, equipe, caixa e presença digital em um só aplicativo.";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://cortai.dev/apresentacao" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: "https://cortai.dev/apresentacao" }],
    };
  },
  component: ApresentacaoPage,
});

function ApresentacaoPage() {
  const config = Route.useLoaderData();
  const espaco =
    config.aparencia.espacamento === "compacto"
      ? 64
      : config.aparencia.espacamento === "amplo"
        ? 104
        : 80;
  return (
    <main
      className={`home-publica home-preset-${config.aparencia.preset}`}
      style={
        {
          "--home-largura": `${config.aparencia.larguraPx}px`,
          "--home-espaco": `${espaco}px`,
        } as React.CSSProperties
      }
    >
      <header className="absolute inset-x-0 top-0 z-30 mx-auto flex max-w-[var(--home-largura)] items-center justify-between px-5 py-5 md:px-10">
        <MarcaCortai variante="clara" className="h-auto w-32" prioridade />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-paper/30 bg-ink/35 text-paper"
        >
          <Link to="/login">Entrar</Link>
        </Button>
      </header>
      <SecaoHero hero={config.hero} />
      {config.secoes.map((secao) => (
        <SecaoDaHome key={secao.id} secao={secao} aparencia={config.aparencia} />
      ))}
    </main>
  );
}
