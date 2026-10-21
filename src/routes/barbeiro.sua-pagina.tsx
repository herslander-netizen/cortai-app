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

        <Link
          to="/barbeiro/marca"
          className="surface flex min-h-24 items-center gap-4 p-4 transition-colors hover:bg-ink2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:p-5"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-ink2 text-gold">
            <LayoutTemplate size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-paper">Layout & Tema</span>
            <span className="mt-1 block text-sm text-mute">
              Escolha a aparência, organize o conteúdo e confira a prévia antes de publicar.
            </span>
          </span>
          <PencilLine size={18} className="shrink-0 text-mute" aria-hidden />
        </Link>

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
