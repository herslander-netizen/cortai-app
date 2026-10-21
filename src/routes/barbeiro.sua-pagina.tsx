import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, CircleHelp, Eye, LayoutTemplate, PencilLine } from "lucide-react";
import { useState } from "react";

import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/button";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { getMarca } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { urlPublica } from "@/lib/origem-publica";
import { componenteIds, LAYOUTS, TEMAS } from "@/lib/pagina-config";

export const Route = createFileRoute("/barbeiro/sua-pagina")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Sua página — Cortaí" },
      { name: "description", content: "Gerencie a página pública e personalize a experiência dos seus clientes." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuaPagina,
});

function SuaPagina() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  const [mensagem, setMensagem] = useState("");

  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro" title="Sua Página">
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro" title="Sua Página" subtitle="Página pública do negócio">
        <div className="surface space-y-3 p-5">
          <CircleHelp className="text-mute" size={24} aria-hidden />
          <p className="text-sm text-paper">
            Não foi possível carregar as informações da página. Confira se você está no negócio correto e tente novamente.
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>
        </div>
      </Screen>
    );
  }

  const marca = query.data.marca;
  const link = urlPublica(`/${marca.slug}`);

  return (
    <Screen
      voltarPara="/barbeiro"
      title="Sua Página"
      subtitle="A página que seus clientes usam para conhecer seu negócio e iniciar um agendamento."
    >
      <div className="space-y-4">
        <section className="surface overflow-hidden p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink2 text-gold">
              <Eye size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-paper">{marca.nome}</h2>
              <p className="mt-1 break-all text-sm text-mute">{link}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                {marca.alteracoes_pendentes ? (
                  <>
                    <CircleHelp size={15} className="text-gold" aria-hidden />
                    <span className="text-paper">Há alterações que ainda precisam ser publicadas</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="text-sage" aria-hidden />
                    <span className="text-paper">Nenhuma alteração pendente no editor</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button asChild variant="outline">
              <a href={link} target="_blank" rel="noreferrer">
                Ver página <ArrowUpRight size={16} aria-hidden />
              </a>
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setMensagem("Link copiado.");
                } catch {
                  setMensagem("Não foi possível copiar o link neste navegador.");
                }
              }}
            >
              Copiar link
            </Button>
          </div>
          {mensagem ? <p role="status" className="mt-3 text-xs text-mute">{mensagem}</p> : null}
        </section>

        <section className="surface overflow-hidden">
          <div
            className="relative aspect-[16/9] overflow-hidden"
            style={{
              background: `linear-gradient(125deg, ${TEMAS[marca.pagina.tema].cores.fundo}, ${TEMAS[marca.pagina.tema].cores.secundaria} 55%, ${TEMAS[marca.pagina.tema].cores.destaque})`,
            }}
            aria-hidden
          >
            <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `linear-gradient(135deg, ${TEMAS[marca.pagina.tema].cores.principal} 25%, transparent 25%, transparent 50%, ${TEMAS[marca.pagina.tema].cores.principal} 50%, ${TEMAS[marca.pagina.tema].cores.principal} 75%, transparent 75%, transparent)`, backgroundSize: "54px 54px" }} />
            <div className="absolute inset-x-[8%] top-[13%] h-[6%] w-[28%] rounded-full" style={{ backgroundColor: TEMAS[marca.pagina.tema].cores.texto, opacity: 0.75 }} />
            <div className="absolute inset-x-[8%] top-[25%] h-[12%] w-[62%] rounded-lg" style={{ backgroundColor: TEMAS[marca.pagina.tema].cores.texto, opacity: 0.12 }} />
            <div className="absolute inset-x-[8%] bottom-[14%] flex gap-2">
              <div className="h-14 flex-1 rounded-lg border border-white/20" style={{ backgroundColor: TEMAS[marca.pagina.tema].cores.secundaria, opacity: 0.92 }} />
              <div className="h-14 flex-1 rounded-lg border border-white/20" style={{ backgroundColor: TEMAS[marca.pagina.tema].cores.secundaria, opacity: 0.72 }} />
              <div className="h-14 w-1/4 rounded-lg" style={{ backgroundColor: TEMAS[marca.pagina.tema].cores.botao }} />
            </div>
            <span className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Prévia visual
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-line">
            <div className="min-w-0 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-mute">
                <LayoutTemplate size={20} aria-hidden />
                <span className="text-xs font-semibold">LAYOUT</span>
              </div>
              <h2 className="mt-2 truncate text-base font-semibold text-paper">{LAYOUTS[marca.pagina.layout]}</h2>
              <p className="mt-1 text-xs text-mute">{componenteIds.filter((id) => marca.pagina.componentes[id]).length} seções ativas</p>
            </div>
            <div className="min-w-0 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-mute">
                <Palette size={20} aria-hidden />
                <span className="text-xs font-semibold">TEMA</span>
              </div>
              <h2 className="mt-2 truncate text-base font-semibold text-paper">{TEMAS[marca.pagina.tema].nome}</h2>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full" aria-label="Paleta de cores do tema">
                {[TEMAS[marca.pagina.tema].cores.principal, TEMAS[marca.pagina.tema].cores.secundaria, TEMAS[marca.pagina.tema].cores.botao, TEMAS[marca.pagina.tema].cores.fundo, TEMAS[marca.pagina.tema].cores.destaque].map((cor, i) => (
                  <span key={i} className="flex-1" style={{ backgroundColor: cor }} />
                ))}
              </div>
            </div>
          </div>
          <Link
            to="/barbeiro/marca"
            className="m-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-4 py-3 text-sm font-semibold text-ink transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:mx-5 sm:mb-5"
          >
            Escolher Layout & Tema
            <PencilLine size={17} aria-hidden />
          </Link>
        </section>

        <section className="surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-paper">Próximo passo</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">
            Personalize primeiro o layout e o tema. Depois revise os textos, as imagens, os serviços e os canais de contato. As alterações só entram na página pública quando forem publicadas pelo editor.
          </p>
          <Button asChild variant="primary" className="mt-4 w-full sm:w-auto">
            <Link to="/barbeiro/marca">Personalizar página</Link>
          </Button>
        </section>
      </div>
    </Screen>
  );
}
