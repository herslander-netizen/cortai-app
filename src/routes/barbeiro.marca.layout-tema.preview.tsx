import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { getMarca } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { aplicarTema, layoutIds, LAYOUTS, TEMAS, temaIds } from "@/lib/pagina-config";

export const Route = createFileRoute("/barbeiro/marca/layout-tema/preview")({
  validateSearch: z.object({
    layout: z.enum(layoutIds).optional(),
    tema: z.enum(temaIds).optional(),
  }),
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Ver Exemplo — Layout & Tema — Cortaí" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PreviaLayoutTemaPage,
});

function PreviaLayoutTemaPage() {
  const navigate = useNavigate();
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

  return (
    <ConteudoPrevia
      initial={query.data.marca}
      layout={layout}
      tema={tema}
      voltar={() => void navigate({ to: "/barbeiro/marca/layout-tema" })}
    />
  );
}

function ConteudoPrevia({
  initial,
  layout,
  tema,
  voltar,
}: {
  initial: NonNullable<Awaited<ReturnType<typeof getMarca>>>["marca"];
  layout?: (typeof layoutIds)[number] | undefined;
  tema?: (typeof temaIds)[number] | undefined;
  voltar: () => void;
}) {
  const e = useEditorDaPagina(initial, () => undefined);
  const comLayout = { ...e.config, ...(layout ? { layout } : {}) };
  const config = tema ? aplicarTema(comLayout, tema) : comLayout;

  return (
    <Screen
      wide
      voltarPara="/barbeiro/marca/layout-tema"
      title={`${LAYOUTS[config.layout]} · ${TEMAS[config.tema].nome}`}
    >
      <div className="space-y-4 pb-6">
        <PreviaDaExperiencia
          data={e.previewData}
          config={config}
          device={e.device}
          setDevice={e.setDevice}
          nome={e.form.nome}
          avatarUrl={e.avatarPreview || e.logoPreview}
          capaUrl={e.coverPreview}
          altura="h-[calc(100dvh-250px)]"
        />
        <Button variant="outline" className="min-h-12 w-full" onClick={voltar}>
          Voltar para Layout & Tema
        </Button>
      </div>
    </Screen>
  );
}
