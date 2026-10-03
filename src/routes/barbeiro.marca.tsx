import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Eye, Save, Send, Share2 } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { SecaoAjustesFinos } from "@/components/marca/editor/SecaoAjustesFinos";
import { SecaoConteudo } from "@/components/marca/editor/SecaoConteudo";
import { SecaoExperiencia } from "@/components/marca/editor/SecaoExperiencia";
import { SecaoImagens } from "@/components/marca/editor/SecaoImagens";
import { SecaoLink } from "@/components/marca/editor/SecaoLink";
import { SecaoRedes } from "@/components/marca/editor/SecaoRedes";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { SecaoTema } from "@/components/marca/editor/SecaoTema";
import { SecaoTextos } from "@/components/marca/editor/SecaoTextos";
import { SecaoVersoes } from "@/components/marca/editor/SecaoVersoes";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getMarca, type MarcaData } from "@/lib/marca.functions";
import { TEMAS } from "@/lib/pagina-config";
import { exigirCapacidade } from "@/lib/guarda-capacidade";

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

function Item({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={id} className="border-line">
      <AccordionTrigger className="min-h-12 text-paper hover:no-underline">
        {titulo}
      </AccordionTrigger>
      <AccordionContent className="pb-6 pt-1">{children}</AccordionContent>
    </AccordionItem>
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
  const link = `https://cortai.dev/${e.slug}`;
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
          onClick={() => navigator.share?.({ title: e.form.nome, url: link })}
        >
          <Share2 />
          Compartilhar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            e.setStatus("Link copiado.");
          }}
        >
          <Copy />
          Copiar link
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(420px,1fr)]">
        <div>
          <Accordion type="multiple" defaultValue={["experiencia"]}>
            <Item id="experiencia" titulo="Experiência">
              <SecaoExperiencia config={e.config} setPagina={e.setPagina} />
              {e.usaConversa ? (
                <div className="mt-6 border-t border-line pt-6">
                  <h3 className="mb-4 text-sm font-semibold text-paper">Recepção</h3>
                  <SecaoRecepcao
                    config={e.config}
                    setPagina={e.setPagina}
                    avatarRef={e.avatarRef}
                    avatarPreview={e.avatarPreview}
                    setAvatarPreview={e.setAvatarPreview}
                    upload={e.upload}
                  />
                </div>
              ) : null}
            </Item>
            <Item id="tema" titulo="Tema">
              <SecaoTema
                config={e.config}
                segmento={initial.segmento}
                escolher={(tema) =>
                  e.setConfig((old) => ({ ...old, tema, cores: TEMAS[tema].cores }))
                }
              />
            </Item>
            <Item id="conteudo" titulo="Conteúdo">
              <SecaoConteudo config={e.config} setPagina={e.setPagina} />
            </Item>
            <Item id="textos" titulo="Textos e botão">
              <SecaoTextos
                config={e.config}
                setPagina={e.setPagina}
                form={e.form}
                setMarca={e.setMarca}
                vocabulario={e.vocabulario}
              />
            </Item>
            <Item id="imagens" titulo="Logo e imagens">
              <SecaoImagens
                coverRef={e.coverRef}
                fileRef={e.fileRef}
                coverPreview={e.coverPreview}
                logoPreview={e.logoPreview}
                logoAtual={e.form.logo_url}
                busy={e.busy}
                upload={e.upload}
                usarLogo={e.usarLogo}
                removerLogo={e.removerLogo}
              />
            </Item>
            <Item id="redes" titulo="Redes sociais">
              <SecaoRedes form={e.form} setMarca={e.setMarca} config={e.config} setPagina={e.setPagina} />
            </Item>
            <Item id="ajustes" titulo="Ajustes finos">
              <SecaoAjustesFinos config={e.config} setPagina={e.setPagina} />
            </Item>
            <Item id="link" titulo="Link e contato">
              <SecaoLink
                slug={e.slug}
                setSlug={e.setSlug}
                slugInicial={initial.slug}
                busy={e.busy}
                salvarSlug={e.salvarSlug}
                form={e.form}
                setMarca={e.setMarca}
              />
            </Item>
            <Item id="versoes" titulo="Versões anteriores">
              <SecaoVersoes versions={versions} busy={e.busy} restaurar={e.restaurar} />
            </Item>
          </Accordion>

          {e.status ? (
            <p role="status" className="mt-3 text-sm text-sage">
              {e.status}
            </p>
          ) : null}

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

      <Sheet open={previaAberta} onOpenChange={setPreviaAberta}>
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto p-4">
          <SheetHeader>
            <SheetTitle>Prévia</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{previa("h-[calc(100dvh-140px)]")}</div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
