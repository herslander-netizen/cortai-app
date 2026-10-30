import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { ChatPreview } from "@/components/agendamento/ChatPreview";
import { PreviaDireta } from "@/components/marca/editor/PreviaDireta";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { useMediaQuery } from "@/hooks/use-mobile";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { paginaDeExemplo } from "@/lib/pagina-exemplo";
import { getMarca } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import {
  aplicarLayout,
  aplicarTema,
  layoutIds,
  LAYOUTS,
  TEMAS,
  temaIds,
} from "@/lib/pagina-config";
import { RouteError } from "@/components/layout/RouteError";

export const Route = createFileRoute("/barbeiro/marca/layout-tema_/preview")({
  validateSearch: z.object({
    layout: z.enum(layoutIds).optional(),
    tema: z.enum(temaIds).optional(),
  }),
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { title: "Ver Exemplo — Layout & Tema — Flow" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviaLayoutTemaPage,
});

function PreviaLayoutTemaPage() {
  const { layout, tema } = Route.useSearch();
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });

  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/marca/layout-tema" title="Ver Exemplo">
        <EsqueletoFormulario campos={3} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro/marca/layout-tema" title="Ver Exemplo">
        <div className="surface space-y-3 p-4">
          <p className="text-sm text-paper">Não foi possível carregar o exemplo.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }

  return <ConteudoPrevia initial={query.data.marca} layout={layout} tema={tema} />;
}

/**
 * "Ver Exemplo" como no Figaro (vídeo do dono, 30/10): o site de exemplo em tela cheia, só com a barra
 * "Layout · Tema" e o voltar por cima. Substitui a prévia dentro de um celular desenhado.
 */
function ConteudoPrevia({
  initial,
  layout,
  tema,
}: {
  initial: NonNullable<Awaited<ReturnType<typeof getMarca>>>["marca"];
  layout?: (typeof layoutIds)[number] | undefined;
  tema?: (typeof temaIds)[number] | undefined;
}) {
  const e = useEditorDaPagina(initial, () => undefined);
  const celular = useMediaQuery("(max-width: 767px)");
  const comLayout = layout ? aplicarLayout(e.config, layout) : e.config;
  const config = tema ? aplicarTema(comLayout, tema) : comLayout;
  // Exemplo com um negócio fictício (como no Figaro): mostra o layout e o tema escolhidos sem depender dos dados do negócio.
  const exemplo = paginaDeExemplo(config);

  return (
    <Screen
      wide
      barraSimples
      voltarPara="/barbeiro/marca/layout-tema"
      voltarBusca={{ layout, tema }}
      title={`${LAYOUTS[config.layout]} · ${TEMAS[config.tema].nome}`}
    >
      {/* O site ocupa a largura toda, sem moldura nem margem da tela. */}
      <div className="-mx-4 md:-mx-8">
        {config.experiencia === "conversa" ? (
          <ChatPreview
            ativo
            config={config}
            nome={exemplo.tenant.nome}
            logoUrl={exemplo.tenant.logo_signed_url}
            capaUrl={exemplo.tenant.capa_signed_url}
          />
        ) : config.experiencia === "direta" ? (
          <PreviaDireta data={exemplo} config={config} />
        ) : (
          <PaginaPublicaConteudo data={exemplo} config={config} preview previaCelular={celular} />
        )}
      </div>
    </Screen>
  );
}
