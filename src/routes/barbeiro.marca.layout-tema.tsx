import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { SecaoLayoutsETemas } from "@/components/marca/editor/SecaoLayoutsETemas";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { aplicarTema, TEMAS_DO_FIGARO, type LayoutId } from "@/lib/pagina-config";

export const Route = createFileRoute("/barbeiro/marca/layout-tema")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Layout & Tema — Cortaí" },
      { name: "description", content: "Escolha o layout e o tema da página pública." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LayoutTemaPage,
});

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
            e.setConfig((old) => {
              const comLayout = { ...old, layout };
              // Tema antigo do Cortaí não existe no catálogo do Figaro: leva o primeiro tema.
              return (TEMAS_DO_FIGARO as readonly string[]).includes(old.tema)
                ? comLayout
                : aplicarTema(comLayout, TEMAS_DO_FIGARO[0]);
            })
          }
          escolherTema={(tema) => e.setConfig((old) => aplicarTema(old, tema))}
        />
        {e.config.experiencia !== "vitrine" ? (
          <p className="px-2 text-sm leading-relaxed text-mute">
            Sua página abre direto no agendamento. O layout vale quando a experiência do link é
            Vitrine; o tema vale sempre.
          </p>
        ) : null}
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
            disabled={e.busy}
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
