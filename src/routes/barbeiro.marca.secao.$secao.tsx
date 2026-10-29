import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, EyeOff } from "lucide-react";
import { useCallback, useState } from "react";

import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { CATALOGO_DE_SECOES } from "@/components/marca/editor/secoes/catalogo";
import { EditorDaSecaoPublica } from "@/components/marca/editor/EditorDaSecaoPublica";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { BotaoFlutuante } from "@/components/ui/botao-flutuante";
import { Button } from "@/components/ui/button";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { componenteIds, SECOES_OBRIGATORIAS } from "@/lib/pagina-config";

const NOMES_SECOES = Object.fromEntries(
  componenteIds.map((id) => [id, CATALOGO_DE_SECOES[id].nome]),
) as Record<(typeof componenteIds)[number], string>;

export const Route = createFileRoute("/barbeiro/marca/secao/$secao")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [{ title: "Editar seção — Flow" }, { name: "robots", content: "noindex, nofollow" }],
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
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
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
  const queryClient = useQueryClient();
  const e = useEditorDaPagina(initial, () => undefined);
  const [salvando, setSalvando] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [erroDaSecao, setErroDaSecao] = useState<string | null>(null);
  const reportarErro = useCallback((valor: string | null) => setErroDaSecao(valor), []);

  const nome = NOMES_SECOES[secao];
  const ativa = e.config.componentes[secao];
  const obrigatoria = SECOES_OBRIGATORIAS[e.config.layout].includes(secao);

  const gravar = async (config: typeof e.config) => {
    await saveDraft({ data: { marca: e.form, pagina: config } });
    await queryClient.invalidateQueries({ queryKey: ["marca"] });
  };

  const salvar = async () => {
    setSalvando(true);
    setMensagem("");
    setErro(false);
    try {
      await gravar(e.config);
      await salvarEVoltar();
    } catch (error) {
      setErro(true);
      setMensagem(error instanceof Error ? error.message : "Não foi possível salvar esta seção.");
    } finally {
      setSalvando(false);
    }
  };

  // Figaro: ativar ou ocultar grava na hora e continua no editor.
  const alternar = async (ligar: boolean) => {
    setTrocando(true);
    setMensagem("");
    setErro(false);
    const config = { ...e.config, componentes: { ...e.config.componentes, [secao]: ligar } };
    try {
      e.setPagina("componentes", config.componentes);
      await gravar(config);
      setMensagem(ligar ? `${nome} ativada.` : `${nome} oculta.`);
    } catch (error) {
      e.setPagina("componentes", e.config.componentes);
      setErro(true);
      setMensagem(error instanceof Error ? error.message : "Não foi possível alterar a seção.");
    } finally {
      setTrocando(false);
    }
  };

  return (
    <Screen
      voltarPara="/barbeiro/marca"
      title={nome}
      subtitle={CATALOGO_DE_SECOES[secao].descricao}
    >
      <div className="space-y-5 pb-28">
        {!ativa ? (
          <section className="space-y-3 rounded-[28px] bg-ink2 p-5" aria-label={`${nome} oculta`}>
            <h3 className="text-base font-semibold text-paper">{nome} oculta</h3>
            <p className="text-sm leading-relaxed text-mute">
              Esta seção não aparece na página pública. Ative para mostrá-la de novo; nada do que
              você cadastrou é apagado.
            </p>
            <Button
              className="min-h-12 w-full"
              loading={trocando}
              onClick={() => void alternar(true)}
            >
              Ativar {nome}
            </Button>
          </section>
        ) : null}
        <EditorDaSecaoPublica secao={secao} e={e} reportarErro={reportarErro} />
        {obrigatoria ? (
          <p className="px-2 text-sm leading-relaxed text-mute">
            Esta seção é obrigatória neste layout e não pode ser ocultada.
          </p>
        ) : null}
        {erroDaSecao ? (
          <p role="alert" className="px-2 text-sm text-brick">
            {erroDaSecao}
          </p>
        ) : null}
        {ativa && !obrigatoria ? (
          <Button
            className="rounded-full"
            disabled={salvando}
            loading={trocando}
            onClick={() => void alternar(false)}
          >
            <EyeOff aria-hidden />
            Esconder {nome}
          </Button>
        ) : null}
        {mensagem ? (
          <p
            role={erro ? "alert" : "status"}
            className={`px-2 text-sm ${erro ? "text-brick" : "text-mute"}`}
          >
            {mensagem}
          </p>
        ) : null}
      </div>
      <BotaoFlutuante
        disabled={e.busy || trocando || Boolean(erroDaSecao)}
        loading={salvando}
        onClick={() => void salvar()}
      >
        <Check aria-hidden />
        Salvar alterações
      </BotaoFlutuante>
    </Screen>
  );
}
