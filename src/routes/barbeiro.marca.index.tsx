import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eye, LayoutTemplate, MoreVertical, Palette, Save, Send, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { RouteError } from "@/components/layout/RouteError";
import { LacunasDaPagina } from "@/components/marca/editor/LacunasDaPagina";
import { SecaoConteudo } from "@/components/marca/editor/SecaoConteudo";
import { Screen } from "@/components/layout/Screen";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PaineisDoEditor, type AbaPainelDoEditor } from "@/components/marca/editor/PaineisDoEditor";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { alterarStatusPaginaPublica, getMarca, type MarcaData } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { urlPublica } from "@/lib/origem-publica";
import {
  ajustarAoCatalogo,
  LAYOUTS,
  secoesObrigatoriasAusentes,
  TEMAS,
  totalDeSecoesAtivas,
} from "@/lib/pagina-config";
import { CATALOGO_DE_SECOES } from "@/components/marca/editor/secoes/catalogo";
import { CapaDoTema } from "@/components/marca/editor/CapaDoTema";
import { registrar } from "@/lib/diagnostico/telemetria";

export const Route = createFileRoute("/barbeiro/marca/")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  pendingComponent: MarcaPendente,
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { title: "Personalizar Página — Flow" },
      { name: "description", content: "Personalize e publique a página pública do seu negócio." },
      { property: "og:title", content: "Personalizar página — Flow" },
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

/** Evita o outlet vazio enquanto o bundle da tela ou os dados do negócio chegam no celular. */
function MarcaPendente() {
  return (
    <Screen voltarPara="/barbeiro" title="Personalizar página">
      <EsqueletoFormulario campos={6} />
    </Screen>
  );
}

function MarcaPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  const ramo = query.isLoading
    ? "carregando"
    : query.isError && !query.data
      ? "erro"
      : !query.data
        ? "sem-acesso"
        : "conteudo";
  useEffect(() => {
    registrar("marca", { ramo });
    return () => registrar("marca", { ramo: `${ramo}-desmontou` });
  }, [ramo]);
  const reduzirMovimento = useReducedMotion();
  const transicaoEntrada = { opacity: { duration: reduzirMovimento ? 0 : 0.22 } };
  const transicaoSaida = { opacity: { duration: reduzirMovimento ? 0 : 0.18 } };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {query.isLoading ? (
        <motion.div
          key="carregando"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: transicaoSaida }}
          transition={transicaoEntrada}
        >
          <Screen voltarPara="/barbeiro" title="Personalizar Página">
            <EsqueletoFormulario campos={6} onTentarDeNovo={() => void query.refetch()} />
          </Screen>
        </motion.div>
      ) : query.isError && !query.data ? (
        <motion.div
          key="erro-carregamento"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: transicaoSaida }}
          transition={transicaoEntrada}
        >
          <Screen voltarPara="/barbeiro" title="Personalizar Página">
            <div className="space-y-4">
              <Aviso tom="acao" titulo="Não foi possível carregar sua página">
                Confira a conexão e tente novamente. Seus dados não foram alterados.
              </Aviso>
              <Button
                variant="outline"
                className="min-h-12"
                loading={query.isFetching}
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          </Screen>
        </motion.div>
      ) : !query.data ? (
        <motion.div
          key="sem-acesso"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: transicaoSaida }}
          transition={transicaoEntrada}
        >
          <Screen title="Personalizar página">
            <p className="text-sm text-brick">
              Entre como responsável pelo negócio para personalizar a página.
            </p>
          </Screen>
        </motion.div>
      ) : (
        <motion.div
          key="conteudo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: transicaoSaida }}
          transition={transicaoEntrada}
        >
          <Editor
            initial={query.data.marca}
            versions={query.data.versoes}
            reload={() => query.refetch()}
          />
        </motion.div>
      )}
    </AnimatePresence>
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
  // Como no Figaro, sempre há um layout e um tema do catálogo escolhidos (só na tela; nada é gravado).
  const visual = ajustarAoCatalogo(e.config);
  const alterarStatus = useServerFn(alterarStatusPaginaPublica);
  const [paginaOnline, setPaginaOnline] = useState(initial.pagina_online);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [previaAberta, setPreviaAberta] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaPainelDoEditor>("detalhes");
  const [avancadoAberto, setAvancadoAberto] = useState(false);
  const telaLarga = useMediaQuery("(min-width: 1280px)");
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
  // Figaro (`PageSettingsViewModel.publish`): seção obrigatória desligada bloqueia a publicação.
  const publicar = async () => {
    const ausentes = secoesObrigatoriasAusentes(e.config);
    if (ausentes.length > 0) {
      await confirmar({
        titulo: "Seções obrigatórias ausentes",
        descricao: `As seções a seguir são obrigatórias para este layout: ${ausentes.map((id) => CATALOGO_DE_SECOES[id].nome).join(", ")}. Ative-as para publicar.`,
        confirmar: "Entendi",
        cancelar: "Cancelar",
      });
      return;
    }
    await e.executar("publish");
  };
  const descartarAlteracoes = async () => {
    const aceitou = await confirmar({
      titulo: "Descartar alterações?",
      descricao: "As alterações não publicadas serão perdidas. Esta ação não pode ser desfeita.",
      confirmar: "Descartar",
      cancelar: "Cancelar",
      destrutivo: true,
    });
    if (aceitou) await e.descartar();
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <p role="status" className="min-w-0 truncate text-sm text-mute">
          {paginaOnline ? "Página pública online" : "Página pública fora do ar"}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Mais ações da página">
              <MoreVertical size={18} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={link} target="_blank" rel="noreferrer">
                Ver página publicada
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setAbaAtiva("divulgacao");
                setAvancadoAberto(true);
              }}
            >
              Editar link
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/barbeiro/qr-code">QR Code e compartilhar</Link>
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
            initial={
              reduzirMovimento
                ? { opacity: 0 }
                : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }
            }
            animate={
              reduzirMovimento
                ? { opacity: 1 }
                : {
                    opacity: 1,
                    height: "auto",
                    paddingTop: 16,
                    paddingBottom: 16,
                    marginBottom: 16,
                  }
            }
            exit={
              reduzirMovimento
                ? { opacity: 0 }
                : { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0 }
            }
            transition={{ duration: reduzirMovimento ? 0.15 : 0.22 }}
            className="overflow-hidden rounded-xl border border-gold/40 bg-gold/5 p-4 sm:p-5"
          >
            <h2 className="text-sm font-semibold text-paper">Alterações não publicadas</h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">
              Há um rascunho que ainda não aparece na sua página pública.
            </p>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="mb-5 overflow-hidden rounded-[28px] bg-ink2">
        <div className="p-3 sm:p-4">
          <div className="aspect-video overflow-hidden rounded-[20px] bg-background">
            <CapaDoTema tema={visual.tema} />
          </div>
          <div className="mt-4 grid grid-cols-2 divide-x divide-line">
            <div className="min-w-0 pr-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mute">
                <LayoutTemplate size={16} aria-hidden />
                Layout
              </div>
              <p className="mt-2 text-sm font-semibold text-paper">{LAYOUTS[visual.layout]}</p>
              <p className="mt-1 text-xs leading-relaxed text-mute">
                {visual.layout === "cortai-chat"
                  ? "Atendimento em conversa"
                  : `${totalDeSecoesAtivas(e.config)} seções ativas`}
              </p>
            </div>
            <div className="min-w-0 pl-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mute">
                <Palette size={16} aria-hidden />
                Tema
              </div>
              <p className="mt-2 text-sm font-semibold text-paper">{TEMAS[visual.tema].nome}</p>
              <div
                className="mt-2 flex h-2 overflow-hidden rounded-full"
                aria-label="Paleta do tema atual"
              >
                <span
                  className="flex-1"
                  style={{ background: TEMAS[visual.tema].cores.principal }}
                />
                <span
                  className="flex-1"
                  style={{ background: TEMAS[visual.tema].cores.destaque }}
                />
                <span className="flex-1" style={{ background: TEMAS[visual.tema].cores.fundo }} />
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-mute">
            Altere o visual e confira o exemplo antes de salvar.
          </p>
          <Button asChild className="mt-3 min-h-12 w-full">
            <Link to="/barbeiro/marca/layout-tema">Escolher Layout & Tema</Link>
          </Button>
        </div>
      </section>

      <section className="mb-5 space-y-4" aria-label="Seções da página pública">
        <SecaoConteudo config={e.config} />
        <LacunasDaPagina lacunas={initial.lacunas} />
      </section>

      <Accordion
        type="single"
        collapsible
        value={avancadoAberto ? "avancado" : ""}
        onValueChange={(value) => setAvancadoAberto(value === "avancado")}
        className="mb-6"
      >
        <AccordionItem
          value="avancado"
          className="rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] px-4"
        >
          <AccordionTrigger className="min-h-14 text-sm font-semibold text-paper hover:no-underline">
            Outras configurações
          </AccordionTrigger>
          <AccordionContent>
            <PaineisDoEditor
              e={e}
              initial={initial}
              versions={versions}
              abaAtiva={abaAtiva}
              onAbaChange={setAbaAtiva}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,520px)_minmax(420px,1fr)]">
        <div>
          <div className="sticky bottom-20 z-20 mt-6 rounded-xl border-0 bg-[var(--agenda-cartao,var(--ink2))] p-2 shadow-[var(--elevacao-3)] xl:bottom-4">
            <Button
              variant="ghost"
              className="mb-2 h-12 w-full xl:hidden"
              onClick={() => setPreviaAberta(true)}
            >
              <Eye />
              Ver prévia
            </Button>
            {e.pendente ? (
              <Button
                variant="ghost"
                className="mb-2 h-12 w-full text-brick"
                disabled={e.busy}
                onClick={() => void descartarAlteracoes()}
              >
                <Undo2 />
                Descartar alterações
              </Button>
            ) : null}
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
              <Button className="h-12" disabled={e.busy} onClick={() => void publicar()}>
                <Send />
                {e.busy ? "Publicando…" : "Publicar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Só no computador: no celular a prévia escondida carregava dados e fontes à toa. */}
        {telaLarga ? (
          <aside>
            <div className="sticky top-5">{previa()}</div>
          </aside>
        ) : null}
      </div>

      {dialogo}
      <Sheet open={previaAberta} onOpenChange={setPreviaAberta}>
        <SheetContent
          side="bottom"
          className="h-[100dvh] overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader>
            <SheetTitle>Prévia da página</SheetTitle>
          </SheetHeader>
          <div className="mt-2">{previa("h-[calc(100dvh-140px)]")}</div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
