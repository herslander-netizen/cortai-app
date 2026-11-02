import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Eye, ListChecks, MessageCircle, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { SecaoLayoutsETemas } from "@/components/marca/editor/SecaoLayoutsETemas";
import { PreviaDaExperiencia } from "@/components/marca/editor/PreviaDaExperiencia";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { useConfirmar } from "@/components/ui/useConfirmar";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import {
  aplicarTema,
  ajustarAoCatalogo,
  layoutIds,
  temaIds,
  trocarLayoutNoCatalogo,
  secoesObrigatoriasAusentes,
  type LayoutId,
} from "@/lib/pagina-config";
import { CATALOGO_DE_SECOES } from "@/components/marca/editor/secoes/catalogo";
import { LinhaDeOpcoes } from "@/components/ui/formulario/LinhaDeOpcoes";
import { GrupoDeLinhas, LinhaDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";
import { RouteError } from "@/components/layout/RouteError";

export const Route = createFileRoute("/barbeiro/marca/layout-tema")({
  // Mantém layout e tema selecionados ao reabrir a tela.
  validateSearch: z.object({
    layout: z.enum(layoutIds).optional(),
    tema: z.enum(temaIds).optional(),
  }),
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  pendingComponent: LayoutTemaPendente,
  errorComponent: RouteError,
  head: () => ({
    meta: [
      { title: "Layout & Tema — Flow" },
      { name: "description", content: "Escolha o layout e o tema da página pública." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LayoutTemaPage,
});

/** Esqueleto da tela enquanto o código ou os dados chegam (evita o painel com a área vazia no celular). */
function LayoutTemaPendente() {
  return (
    <Screen voltarPara="/barbeiro/marca" title="Layout & Tema">
      <EsqueletoFormulario campos={4} />
    </Screen>
  );
}

function LayoutTemaPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });

  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Layout & Tema">
        <EsqueletoFormulario campos={4} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Layout & Tema">
        <div className="surface space-y-3 p-4">
          <p className="text-sm text-paper">
            Não foi possível carregar as configurações da página.
          </p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }

  const marcaInicial = query.data!.marca;

  return (
    <EditorLayoutTema
      initial={marcaInicial}
      reload={async () => {
        await queryClient.invalidateQueries({ queryKey: ["marca"] });
        await queryClient.invalidateQueries({ queryKey: ["pagina-publica", marcaInicial.slug] });
      }}
      onVoltar={() => void navigate({ to: "/barbeiro/marca" })}
    />
  );
}

function EditorLayoutTema({
  initial,
  reload,
  onVoltar,
}: {
  initial: NonNullable<Awaited<ReturnType<typeof getMarca>>>["marca"];
  reload: () => Promise<void>;
  onVoltar: () => void;
}) {
  const saveDraft = useServerFn(salvarRascunhoPagina);
  const e = useEditorDaPagina(initial, () => void reload());
  // Como no Figaro, a tela abre com um layout e um tema do catálogo já escolhidos.
  const { setConfig } = e;
  const { layout: layoutPedido, tema: temaPedido } = Route.useSearch();
  useEffect(
    () =>
      setConfig((antigo) => {
        let c = ajustarAoCatalogo(antigo);
        if (layoutPedido) c = trocarLayoutNoCatalogo(c, layoutPedido);
        if (temaPedido) c = aplicarTema(c, temaPedido);
        return c;
      }),
    // Só ao abrir a tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [previaAberta, setPreviaAberta] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, dialogo] = useConfirmar();

  const salvar = async () => {
    setSalvando(true);
    try {
      await saveDraft({ data: { marca: e.form, pagina: e.config } });
      await reload();
      onVoltar();
    } catch (error) {
      e.setStatus(
        error instanceof Error ? error.message : "Não foi possível salvar o rascunho.",
        true,
      );
    } finally {
      setSalvando(false);
    }
  };

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

  return (
    <Screen
      wide
      voltarPara="/barbeiro/marca"
      title="Layout & Tema"
      subtitle="Escolha o visual da página pública do seu negócio."
    >
      <div className="space-y-4 pb-48">
        <SecaoLayoutsETemas
          config={e.config}
          setLayout={(layout: LayoutId) =>
            e.setConfig((old) => trocarLayoutNoCatalogo(old, layout))
          }
          atualizar={(config) => e.setConfig(config)}
          escolherTema={(tema) => e.setConfig((old) => aplicarTema(old, tema))}
        />
        {e.config.layout === "figaro-agendamento" ? (
          <p className="px-4 text-sm leading-relaxed text-mute">
            No layout Agendamento o link abre direto na escolha do serviço, do profissional e do
            horário. Nada muda para seus clientes até você publicar.
          </p>
        ) : (
          <section aria-label="Como o cliente agenda" className="space-y-2">
            <h2 className="rotulo-secao">Como o cliente agenda</h2>
            <GrupoDeLinhas>
              {e.config.layout === "figaro-site-completo" && e.config.experiencia === "vitrine" ? (
                <li>
                  <LinhaDeOpcoes
                    icone={ListChecks}
                    titulo="Ao tocar em Agendar"
                    tituloDaFolha="Ao tocar em Agendar"
                    opcoes={[
                      { valor: "tradicional", rotulo: "Passo a passo" },
                      { valor: "conversa", rotulo: "Conversa" },
                    ]}
                    valor={e.config.chat.modo === "conversa" ? "conversa" : "tradicional"}
                    aoEscolher={(modo) => e.setPagina("chat", { ...e.config.chat, modo })}
                  />
                </li>
              ) : null}
              {e.usaConversa ? (
                <LinhaDeConfiguracao
                  icone={MessageCircle}
                  titulo="Personalizar o chat"
                  suporte="Recepção virtual, mensagens e estilo da conversa."
                  para="/barbeiro/marca/chat"
                />
              ) : null}
            </GrupoDeLinhas>
            <p className="px-4 text-xs leading-relaxed text-mute">
              Nada muda para seus clientes até você publicar.
            </p>
          </section>
        )}
        {e.status ? (
          <p role={e.erro ? "alert" : "status"} className={`px-4 text-sm ${e.erro ? "text-brick" : "text-mute"}`}>
            {e.status}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:bottom-0 md:rounded-xl md:border md:bg-ink">
        <div className="mx-auto max-w-[1180px] rounded-[26px] border border-line bg-ink2 p-3 shadow-[var(--elevacao-2)] md:p-4">
          <Button
            variant="ghost"
            className="mb-2 h-12 w-full rounded-full text-base font-semibold"
            onClick={() => setPreviaAberta(true)}
          >
            <Eye size={20} aria-hidden />
            Prévia ao vivo
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-14 w-full rounded-full"
              disabled={e.busy || salvando}
              loading={salvando}
              onClick={() => void salvar()}
            >
              <Save size={18} aria-hidden />
              {salvando ? "Salvando…" : "Salvar rascunho"}
            </Button>
            <Button
              className="h-14 w-full rounded-full"
              disabled={e.busy || salvando}
              onClick={() => void publicar()}
            >
              <Send size={18} aria-hidden />
              {e.fase === "publicando" ? "Publicando…" : "Publicar"}
            </Button>
          </div>
        </div>
      </div>

      {previaAberta ? (
        <div className="fixed inset-0 z-[70] flex h-[100dvh] flex-col overflow-hidden bg-background" role="dialog" aria-modal="true" aria-label="Prévia ao vivo da página pública">
          <div className="relative z-10 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-background/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur">
            <Button variant="ghost" size="icon" aria-label="Voltar ao editor" onClick={() => setPreviaAberta(false)}>
              <ArrowLeft size={21} aria-hidden />
            </Button>
            <p className="text-sm font-semibold">Prévia ao vivo</p>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <PreviaDaExperiencia data={e.previewData} config={e.config} device={e.device} setDevice={e.setDevice} nome={e.form.nome} avatarUrl={e.avatarPreview || e.logoPreview} capaUrl={e.coverPreview} altura="h-full" telaCheia />
          </div>
        </div>
      ) : null}
      {dialogo}
    </Screen>
  );
}
