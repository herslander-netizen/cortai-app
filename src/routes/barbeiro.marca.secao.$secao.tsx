import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { SecaoConteudo } from "@/components/marca/editor/SecaoConteudo";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { componenteIds } from "@/lib/pagina-config";

const NOMES_SECOES = {
  apresentacao: "Apresentação",
  servicos: "Serviços",
  profissionais: "Equipe",
  galeria: "Galeria",
  avaliacoes: "Avaliações",
  produtos: "Produtos",
  instagram: "Instagram",
  localizacao: "Localização",
  horarios: "Horários",
  whatsapp: "WhatsApp",
  cta_final: "Chamada final",
} as const;

export const Route = createFileRoute("/barbeiro/marca/secao/$secao")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [
      { title: "Editar seção — Cortaí" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditorSecaoPage,
});

function EditorSecaoPage() {
  const { secao } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });

  if (!componenteIds.includes(secao as (typeof componenteIds)[number])) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Editar seção">
        <p className="text-sm text-mute">Esta seção não está disponível.</p>
      </Screen>
    );
  }

  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Editar seção">
        <EsqueletoFormulario campos={2} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }

  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Editar seção">
        <div className="surface space-y-3 p-4">
          <p className="text-sm text-paper">Não foi possível carregar esta seção.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>
        </div>
      </Screen>
    );
  }

  const secaoValida = secao as (typeof componenteIds)[number];
  return (
    <EditorSecao
      secao={secaoValida}
      initial={query.data.marca}
      salvarEVoltar={async () => {
        await queryClient.invalidateQueries({ queryKey: ["marca"] });
        await navigate({ to: "/barbeiro/marca" });
      }}
    />
  );
}

function EditorSecao({
  secao,
  initial,
  salvarEVoltar,
}: {
  secao: (typeof componenteIds)[number];
  initial: NonNullable<Awaited<ReturnType<typeof getMarca>>>["marca"];
  salvarEVoltar: () => Promise<void>;
}) {
  const saveDraft = useServerFn(salvarRascunhoPagina);
  const e = useEditorDaPagina(initial, () => undefined);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  const salvar = async () => {
    setSalvando(true);
    setMensagem("");
    setErro(false);
    try {
      await saveDraft({ data: { marca: e.form, pagina: e.config } });
      await salvarEVoltar();
    } catch (error) {
      setErro(true);
      setMensagem(error instanceof Error ? error.message : "Não foi possível salvar esta seção.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Screen
      voltarPara="/barbeiro/marca"
      title={`Editar ${NOMES_SECOES[secao]}`}
      subtitle="Ative ou oculte este bloco da página pública. Os dados cadastrados do negócio não são apagados."
    >
      <div className="space-y-5 pb-24">
        <SecaoConteudo config={e.config} setPagina={e.setPagina} somente={secao} mostrarEdicao={false} />
        {mensagem ? <p role={erro ? "alert" : "status"} className="text-sm text-mute">{mensagem}</p> : null}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:bottom-0 md:rounded-xl md:border md:bg-ink">
        <Button className="min-h-12 w-full" disabled={salvando || e.busy} onClick={() => void salvar()}>
          <Save size={17} aria-hidden />
          {salvando ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </Screen>
  );
}
