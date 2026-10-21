import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, Save, Send, Share2, Smartphone, Undo2 } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { PaineisDoEditor } from "@/components/marca/editor/PaineisDoEditor";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getMarca, type MarcaData } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { urlPublica } from "@/lib/origem-publica";

export const Route = createFileRoute("/barbeiro/marca")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Personalizar página — Cortaí" },
      { name: "description", content: "Personalize e publique a página pública do seu negócio." },
      { property: "og:title", content: "Personalizar página — Cortaí" },
      {
        property: "og:description",
        content: "Experiência, tema, conteúdo e links da página do negócio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarcaPage,
});

function MarcaPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  if (query.isLoading)
    return (
      <Screen voltarPara="/barbeiro/mais" title="Personalizar página">
        <EsqueletoFormulario campos={6} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  if (!query.data)
    return (
      <Screen title="Personalizar página">
        <p className="text-sm text-brick">
          Entre como responsável pelo negócio para personalizar a página.
        </p>
      </Screen>
    );
  return (
    <Editor
      initial={query.data.marca}
      versions={query.data.versoes}
      reload={() => query.refetch()}
    />
  );
}

function Editor({
  initial,
  versions,
  reload,
}: {
  initial: MarcaData;
  versions: NonNullable<Awaited<ReturnType<typeof getMarca>>>["versoes"];
  reload: () => void;
}) {
  const e = useEditorDaPagina(initial, reload);
  const [previaAberta, setPreviaAberta] = useState(false);
  const [confirmar, dialogo] = useConfirmar();
  const link = urlPublica(`/${e.slug}`);
  const previa = (altura?: string) => (
    <PreviaDaExperiencia
      data={e.previewData}
      config={e.config}
      device={e.device}
      setDevice={e.setDevice}
      nome={e.form.nome}
      avatarUrl={e.avatarPreview || e.logoPreview}
      capaUrl={e.coverPreview}
      altura={altura}
    />
  );

  return (
    <Screen
      wide
      voltarPara="/barbeiro/mais"
      title="Personalizar página"
      subtitle={`Escolha como seu cliente chega até ${e.vocabulario.comArtigo} e veja a mudança na hora.`}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={link} target="_blank" rel="noreferrer">
            <Eye />
            Ver publicada
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="xl:hidden"
          onClick={() => setPreviaAberta(true)}
        >
          <Smartphone />
          Ver como ficou
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({ title: e.form.nome, url: link });
                e.setStatus("Link compartilhado.");
              } else {
                await navigator.clipboard.writeText(link);
                e.setStatus("Link copiado.");
              }
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") return;
              e.setStatus("Não foi possível compartilhar o link. Tente copiá-lo.", true);
            }
          }}
        >
          <Share2 />
          Compartilhar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              e.setStatus("Link copiado.");
            } catch {
              e.setStatus("Não foi possível copiar o link. Tente novamente.", true);
            }
          }}
        >
          <Copy />
          Copiar link
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(420px,1fr)]">
        <div>
          <PaineisDoEditor e={e} initial={initial} versions={versions} onVerExemplo={() => setPreviaAberta(true)} />

          <div className="sticky bottom-20 z-20 mt-6 rounded-lg border border-line bg-ink p-2 shadow-xl xl:bottom-4">
            <Button
              variant="ghost"
              className="mb-2 h-12 w-full xl:hidden"
              onClick={() => setPreviaAberta(true)}
            >
              <Eye />
              Ver prévia
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12"
                disabled={e.busy}
                onClick={() => e.executar("draft")}
              >
                <Save />
                {e.busy ? "Salvando…" : "Salvar rascunho"}
              </Button>
              <Button className="h-12" disabled={e.busy} onClick={() => e.executar("publish")}>
                <Send />
                {e.busy ? "Publicando…" : "Publicar"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-5">{previa()}</div>
        </aside>
      </div>

      {dialogo}
      <Sheet open={previaAberta} onOpenChange={setPreviaAberta}>
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Ver Exemplo</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{previa("h-[calc(100dvh-140px)]")}</div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
