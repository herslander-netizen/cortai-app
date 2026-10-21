import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Eye, LayoutTemplate, MoreVertical, Save, Send, Share2, Smartphone, Undo2 } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { LacunasDaPagina } from "@/components/marca/editor/LacunasDaPagina";
import { SecaoConteudo } from "@/components/marca/editor/SecaoConteudo";
import { SecaoExperiencia } from "@/components/marca/editor/SecaoExperiencia";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { Screen } from "@/components/layout/Screen";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PaineisDoEditor, type AbaPainelDoEditor } from "@/components/marca/editor/PaineisDoEditor";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { alterarStatusPaginaPublica, getMarca, type MarcaData } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { urlPublica } from "@/lib/origem-publica";

export const Route = createFileRoute("/barbeiro/marca")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Personalizar Página — Cortaí" },
      { name: "description", content: "Personalize e publique a página pública do seu negócio." },
      { property: "og:title", content: "Personalizar página — Cortaí" },
      {
        property: "og:description",
        content: "Escolha o layout, tema e seções que aparecem na página pública do seu negócio.",
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
      <Screen voltarPara="/barbeiro" title="Personalizar Página">
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
  reload: () => Promise<unknown> | void;
}) {
  const e = useEditorDaPagina(initial, reload);
  const alterarStatus = useServerFn(alterarStatusPaginaPublica);
  const [paginaOnline, setPaginaOnline] = useState(initial.pagina_online);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [previaAberta, setPreviaAberta] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaPainelDoEditor>("detalhes");
  const [avancadoAberto, setAvancadoAberto] = useState(false);
  const reduzirMovimento = useReducedMotion();
  const [confirmar, dialogo] = useConfirmar();
  const link = urlPublica(`/${e.slug}`);
  const mudarStatusPagina = async () => {
    const online = !paginaOnline;
    const aceitou = await confirmar({
      titulo: online ? "Colocar a página no ar?" : "Tirar a página do ar?",
      descricao: online
        ? "A página pública voltará a abrir pelo link compartilhável."
        : "A vitrine pública deixará de abrir pelo link. O link direto de agendamento e a agenda interna continuarão funcionando.",
      confirmar: online ? "Colocar no ar" : "Tirar do ar",
      cancelar: "Cancelar",
      destrutivo: !online,
    });
    if (!aceitou) return;

    setAlterandoStatus(true);
    try {
      await alterarStatus({ data: { online } });
      setPaginaOnline(online);
      e.setStatus(online ? "Página pública colocada no ar." : "Página pública tirada do ar.");
      await reload();
    } catch (error) {
      e.setStatus(
        error instanceof Error ? error.message : "Não foi possível alterar o status da página.",
        true,
      );
    } finally {
      setAlterandoStatus(false);
    }
  };
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
      voltarPara="/barbeiro"
      title="Personalizar página"
      subtitle="Escolha o layout, tema e quais seções aparecem na página pública."
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
        <p role="status" className="self-center text-xs text-mute">
          {paginaOnline ? "Página pública online" : "Página pública fora do ar"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Mais ações da página">
              <MoreVertical size={18} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setAbaAtiva("divulgacao");
                setAvancadoAberto(true);
              }}
            >
              Editar link
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/barbeiro/sua-pagina" search={{ qr: "1" }}>QR Code</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={alterandoStatus} onSelect={() => void mudarStatusPagina()}>
              {alterandoStatus
                ? "Atualizando…"
                : paginaOnline
                  ? "Tirar página do ar"
                  : "Colocar página no ar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence>
        {e.pendente ? (
          <motion.section
            key="rascunho-banner"
            layout
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
            animate={reduzirMovimento ? { opacity: 1 } : { opacity: 1, height: "auto", paddingTop: 16, paddingBottom: 16, marginBottom: 16 }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }}
            transition={{ duration: reduzirMovimento ? 0.15 : 0.22 }}
            className="overflow-hidden rounded-xl border border-gold/40 bg-gold/5 p-4 sm:p-5"
          >
            <h2 className="text-sm font-semibold text-paper">Alterações não publicadas</h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">
              Há um rascunho que ainda não aparece na sua página pública.
            </p>
            <Button variant="outline" className="mt-3 min-h-12" onClick={() => setPreviaAberta(true)}>
              <Eye size={17} aria-hidden />
              Prévia do rascunho
            </Button>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="mb-5 rounded-xl border border-line bg-ink p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink2 text-gold"><LayoutTemplate size={20} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-paper">Layout & Tema</h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">Escolha o layout e o tema em uma tela própria, como no fluxo do Figaro.</p>
            <Button asChild variant="outline" className="mt-3 min-h-12 w-full sm:w-auto">
              <Link to="/barbeiro/marca/layout-tema">Escolher Layout & Tema</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mb-5 rounded-xl border border-line bg-ink p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-paper">Experiência de agendamento</h2>
        <p className="mb-4 mt-1 text-sm leading-relaxed text-mute">Defina como o cliente começa a marcar um horário. Esta configuração é própria do Cortaí.</p>
        <SecaoExperiencia config={e.config} setPagina={e.setPagina} />
        {e.usaConversa ? (
          <div className="mt-5 border-t border-line pt-5">
            <h3 className="mb-3 text-sm font-semibold text-paper">Recepção virtual</h3>
            <SecaoRecepcao config={e.config} setPagina={e.setPagina} avatarRef={e.avatarRef} avatarPreview={e.avatarPreview} setAvatarPreview={e.setAvatarPreview} upload={e.upload} />
          </div>
        ) : null}
      </div>

      <section className="mb-5 space-y-4" aria-label="Seções da página pública">
        <SecaoConteudo config={e.config} setPagina={e.setPagina} />
        <LacunasDaPagina lacunas={initial.lacunas} />
      </section>

      <Accordion type="single" collapsible value={avancadoAberto ? "avancado" : ""} onValueChange={(value) => setAvancadoAberto(value === "avancado")} className="mb-6">
        <AccordionItem value="avancado" className="rounded-xl border border-line bg-ink px-4">
          <AccordionTrigger className="min-h-14 text-sm font-semibold text-paper hover:no-underline">Outras configurações</AccordionTrigger>
          <AccordionContent>
            <PaineisDoEditor e={e} initial={initial} versions={versions} abaAtiva={abaAtiva} onAbaChange={setAbaAtiva} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(420px,1fr)]">
        <div>

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
        <SheetContent side="bottom" className="h-[100dvh] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <SheetHeader>
            <SheetTitle>Prévia da página</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{previa("h-[calc(100dvh-140px)]")}</div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
