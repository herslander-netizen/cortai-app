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
        { property: "og:url", content: "https://cortai.dev/" },
        ...(imagem ? [{ property: "og:image", content: imagem }, { name: "twitter:image", content: imagem }] : []),
      ],
      links: [{ rel: "canonical", href: seo.canonica || "https://cortai.dev/" }],
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
      <header className="fixed inset-x-0 top-0 z-40 border-b border-paper/10 bg-ink">
        <div className="mx-auto flex h-16 max-w-[var(--home-largura)] items-center justify-between px-5 md:px-10">
          <MarcaCortai variante="branca" className="h-7 w-auto md:h-8" />
          <div className="flex items-center gap-1.5">
            <Button asChild variant="ghost" size="sm" className="hidden text-paper hover:bg-paper/10 sm:inline-flex">
              <Link to="/configurar-minha-barbearia">Configurar minha barbearia</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="border-paper/25 bg-paper/5 text-paper transition-colors hover:border-gold/60 hover:bg-paper/10 hover:text-gold">
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

      <AtendimentoWhatsapp />
    </div>
  );
}

/** Atendimento pelo WhatsApp oficial do Cortaí, sempre à mão na página. */
const WHATSAPP_ATENDIMENTO = "557998181983";

function AtendimentoWhatsapp() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_ATENDIMENTO}?text=${encodeURIComponent("Olá! Quero saber mais sobre o Cortaí.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-paper/15 bg-ink/85 text-whatsapp shadow-lg transition-transform hover:scale-105"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden>
        <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.9 9.9 0 0 0 4.84 1.24h.01c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.9 9.9 0 0 0 12.04 2Zm0 18.2c-1.5 0-2.98-.4-4.26-1.16l-.3-.18-3.08.8.82-3-.2-.32a8.2 8.2 0 0 1-1.26-4.38c0-4.56 3.72-8.28 8.28-8.28 2.22 0 4.3.86 5.86 2.42a8.24 8.24 0 0 1 2.42 5.86c0 4.56-3.72 8.24-8.28 8.24Zm4.54-6.18c-.25-.12-1.47-.72-1.7-.8-.22-.09-.39-.13-.55.12-.17.25-.63.8-.78.97-.14.16-.28.18-.53.06-.25-.13-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.38.1-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.09-.17.05-.31-.02-.44-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.85.84-.85 2.04s.87 2.37.99 2.53c.12.17 1.71 2.62 4.15 3.67.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
      </svg>
    </a>
  );
}
