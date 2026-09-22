import { createFileRoute, Link } from "@tanstack/react-router";

import { SecaoDaHome, SecaoHero } from "@/components/home/SecoesHome";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { Button } from "@/components/ui/button";
import { getHomePublicada } from "@/lib/home.functions";
import { ESPACAMENTO_PX, HOME_PADRAO, type ConfigHome } from "@/lib/home-publica";

export const Route = createFileRoute("/")({
  loader: () => getHomePublicada(),
  head: ({ loaderData }) => {
    const seo = (loaderData as ConfigHome | undefined)?.seo ?? HOME_PADRAO.seo;
    const imagem = seo.imagem?.startsWith("http") ? seo.imagem : "";
    return {
      meta: [
        { title: seo.titulo },
        { name: "description", content: seo.descricao },
        { property: "og:title", content: seo.titulo },
        { property: "og:description", content: seo.descricao },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(imagem ? [{ property: "og:image", content: imagem }, { name: "twitter:image", content: imagem }] : []),
      ],
      links: seo.canonica ? [{ rel: "canonical", href: seo.canonica }] : [],
    };
  },
  errorComponent: () => <ConteudoHome config={HOME_PADRAO} />,
  component: Inicio,
});

function Inicio() {
  return <ConteudoHome config={Route.useLoaderData()} />;
}

/** A Home é sempre montada a partir da configuração — o padrão é o conteúdo atual. */
function ConteudoHome({ config }: { config: ConfigHome }) {
  const { aparencia } = config;
  const estilo = {
    "--home-largura": `${aparencia.larguraPx}px`,
    "--home-espaco": `${ESPACAMENTO_PX[aparencia.espacamento]}px`,
    "--gold": aparencia.corDestaque,
    "--radius": `${aparencia.raioPx}px`,
    fontFamily: `"${aparencia.tipografia}", system-ui, sans-serif`,
  } as React.CSSProperties;

  return (
    <div className="landing-page min-h-screen bg-ink text-paper" style={estilo}>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-paper/10 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[var(--home-largura)] items-center justify-between px-5 md:px-10">
          <MarcaCortai variante="escura" className="h-7 w-auto md:h-8" />
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="text-paper hover:bg-paper/10">
              <Link to="/demonstracao">Explorar demonstração</Link>
            </Button>
            <Button asChild size="sm" className="font-semibold">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <SecaoHero hero={config.hero} />
        {config.secoes.map((secao) => (
          <SecaoDaHome key={secao.id} secao={secao} aparencia={aparencia} />
        ))}
      </main>
    </div>
  );
}
