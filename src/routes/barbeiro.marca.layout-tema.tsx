import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, ListChecks, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { SecaoLayoutsETemas } from "@/components/marca/editor/SecaoLayoutsETemas";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import {
  aplicarTema,
  ajustarAoCatalogo,
  layoutIds,
  temaIds,
  trocarLayoutNoCatalogo,
  type LayoutId,
} from "@/lib/pagina-config";
import { LinhaDeOpcoes } from "@/components/ui/formulario/LinhaDeOpcoes";
import { GrupoDeLinhas, LinhaDeConfiguracao } from "@/components/ui/formulario/LinhasDeConfiguracao";
import { RouteError } from "@/components/layout/RouteError";

export const Route = createFileRoute("/barbeiro/marca/layout-tema")({
  // Voltando do "Ver Exemplo" a escolha em andamento continua (no Figaro o estado da tela se mantém).
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
  const navigate = useNavigate();
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
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setMensagem("");
    setErro(false);
    try {
      await saveDraft({ data: { marca: e.form, pagina: e.config } });
      await reload();
      setMensagem("Alterações salvas como rascunho.");
      onVoltar();
    } catch (error) {
      setErro(true);
      setMensagem(
        error instanceof Error ? error.message : "Não foi possível salvar as alterações.",
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Screen
      wide
      voltarPara="/barbeiro/marca"
      title="Layout & Tema"
      subtitle="Escolha o visual da página pública do seu negócio."
    >
      <div className="space-y-4 pb-28">
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
        {mensagem ? (
          <p role={erro ? "alert" : "status"} className="text-sm text-mute">
            {mensagem}
          </p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:bottom-0 md:rounded-xl md:border md:bg-ink">
        <div className="mx-auto flex max-w-[1180px] gap-2">
          <Button
            variant="outline"
            className="min-h-12 flex-1 rounded-full"
            onClick={() =>
              void navigate({
                to: "/barbeiro/marca/layout-tema/preview",
                search: { layout: e.config.layout, tema: e.config.tema },
              })
            }
          >
            <Eye size={17} aria-hidden />
            Ver Exemplo
          </Button>
          <Button
            className="min-h-12 flex-1 rounded-full"
            disabled={e.busy || salvando}
            loading={salvando}
            onClick={() => void salvar()}
          >
            Salvar Alterações
          </Button>
        </div>
      </div>
    </Screen>
  );
}
