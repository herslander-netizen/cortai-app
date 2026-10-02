import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Monitor, Save, Send, Smartphone } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario, EsqueletoPaginaPublica } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { PaginaPublicaConteudo } from "@/components/marca/PaginaPublica";
import { Button } from "@/components/ui/button";
import {
  getMarca,
  publicarPagina,
  salvarRascunhoPagina,
  type MarcaData,
} from "@/lib/marca.functions";
import {
  FONTES,
  LAYOUTS,
  TEMAS,
  type FonteId,
  type LayoutId,
  type PaginaConfig,
  type TemaId,
} from "@/lib/pagina-config";
import { getPaginaPublica } from "@/lib/publico.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";

export const Route = createFileRoute("/barbeiro/temas")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "personalizacao_cliente"),
  head: () => ({
    meta: [
      { title: "Temas e layouts — Cortaí" },
      {
        name: "description",
        content: "Troque o tema e o layout da página do negócio e veja o resultado na hora.",
      },
      { property: "og:title", content: "Temas e layouts — Cortaí" },
      { property: "og:description", content: "Escolha cores, layout e fontes com prévia ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TemasPage,
});

function TemasPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  if (query.isLoading)
    return (
      <Screen voltarPara="/barbeiro/mais" title="Temas e layouts">
        <EsqueletoFormulario campos={4} />
      </Screen>
    );
  if (!query.data)
    return (
      <Screen title="Temas e layouts">
        <p className="text-sm text-brick">
          Entre como responsável pelo negócio para trocar o visual da página.
        </p>
      </Screen>
    );
  return <EditorDeTemas marca={query.data.marca} recarregar={() => query.refetch()} />;
}

function Selecao({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-mute">
      {label}
      <select
        className="mt-2 w-full rounded-lg border border-line2 bg-ink2 px-3 py-3 text-sm text-paper outline-none focus:border-gold"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {Object.entries(options).map(([id, nome]) => (
          <option key={id} value={id}>
            {nome}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditorDeTemas({ marca, recarregar }: { marca: MarcaData; recarregar: () => void }) {
  const queryClient = useQueryClient();
  const salvar = useServerFn(salvarRascunhoPagina);
  const publicar = useServerFn(publicarPagina);
  const publicQuery = useQuery({
    queryKey: ["pagina-publica", marca.slug],
    queryFn: () => getPaginaPublica({ data: { slug: marca.slug } }),
  });
  const [config, setConfig] = useState<PaginaConfig>(marca.pagina);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const alterar = <K extends keyof PaginaConfig>(key: K, value: PaginaConfig[K]) =>
    setConfig((old) => ({ ...old, [key]: value }));

  const executar = async (modo: "draft" | "publish") => {
    setBusy(true);
    setStatus(null);
    try {
      const dados = { data: { marca, pagina: config } };
      if (modo === "draft") {
        await salvar(dados);
        setStatus("Rascunho salvo. A página pública não mudou ainda.");
      } else {
        await publicar(dados);
        await queryClient.invalidateQueries({ queryKey: ["pagina-publica", marca.slug] });
        setStatus("Novo visual publicado na sua página.");
      }
      recarregar();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  };

  const preview = publicQuery.data;

  return (
    <Screen
      wide
      voltarPara="/barbeiro/mais"
      title="Temas e layouts"
      subtitle="Troque o visual e veja a mudança na hora, sem recarregar a página."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,460px)_minmax(380px,1fr)]">
        <div className="space-y-7">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-paper">Tema</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(TEMAS).map(([id, tema]) => (
                <Button
                  variant="ghost"
                  size="bloco"
                  type="button"
                  key={id}
                  onClick={() =>
                    setConfig((old) => ({ ...old, tema: id as TemaId, cores: tema.cores }))
                  }
                  className={`rounded-lg border p-3 text-left ${config.tema === id ? "border-gold" : "border-line"}`}
                >
                  <span className="mb-3 flex gap-1">
                    {Object.values(tema.cores)
                      .slice(0, 4)
                      .map((cor, indice) => (
                        <i
                          key={`${id}-${indice}`}
                          className="h-5 flex-1 rounded-sm"
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                  </span>
                  <span className="flex items-center justify-between text-xs font-semibold text-paper">
                    {tema.nome}
                    {config.tema === id ? <Check size={14} className="text-gold" /> : null}
                  </span>
                  <small className="mt-1 block text-xs text-mute">{tema.descricao}</small>
                </Button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-paper">Layout</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(LAYOUTS).map(([id, nome]) => (
                <Button
                  variant="ghost"
                  type="button"
                  key={id}
                  onClick={() => alterar("layout", id as LayoutId)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-3 text-xs font-medium text-paper ${config.layout === id ? "border-gold" : "border-line"}`}
                >
                  {nome}
                  {config.layout === id ? <Check size={14} className="text-gold" /> : null}
                </Button>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Selecao
              label="Fonte dos títulos"
              value={config.fonteTitulo}
              options={FONTES}
              onChange={(value) => alterar("fonteTitulo", value as FonteId)}
            />
            <Selecao
              label="Fonte dos textos"
              value={config.fonteTexto}
              options={FONTES}
              onChange={(value) => alterar("fonteTexto", value as FonteId)}
            />
            <Selecao
              label="Cantos"
              value={config.bordas}
              options={{
                quadrado: "Quadrado",
                suave: "Suave",
                moderno: "Moderno",
                arredondado: "Arredondado",
              }}
              onChange={(value) => alterar("bordas", value as PaginaConfig["bordas"])}
            />
            <Selecao
              label="Espaçamento"
              value={config.densidade}
              options={{ compacta: "Compacto", equilibrada: "Equilibrado", espacosa: "Espaçoso" }}
              onChange={(value) => alterar("densidade", value as PaginaConfig["densidade"])}
            />
            <Selecao
              label="Botões"
              value={config.botoes}
              options={{ solido: "Sólido", contorno: "Contorno", minimalista: "Minimalista" }}
              onChange={(value) => alterar("botoes", value as PaginaConfig["botoes"])}
            />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => executar("draft")}>
              <Save />
              Salvar rascunho
            </Button>
            <Button size="sm" disabled={busy} onClick={() => executar("publish")}>
              <Send />
              Publicar visual
            </Button>
          </div>
          {status ? <p className="text-xs text-mute">{status}</p> : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={device === "mobile" ? "default" : "outline"}
              size="icon"
              aria-label="Prévia no celular"
              onClick={() => setDevice("mobile")}
            >
              <Smartphone />
            </Button>
            <Button
              variant={device === "desktop" ? "default" : "outline"}
              size="icon"
              aria-label="Prévia no computador"
              onClick={() => setDevice("desktop")}
            >
              <Monitor />
            </Button>
            <span className="text-xs text-mute">Prévia ao vivo</span>
          </div>
          <div
            className={`overflow-hidden surface ${device === "mobile" ? "mx-auto w-full max-w-[390px]" : "w-full"}`}
          >
            <div className="max-h-[70vh] overflow-y-auto">
              {preview ? (
                <PaginaPublicaConteudo data={preview} config={config} />
              ) : (
                <div className="p-6">
                  <EsqueletoPaginaPublica />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}
