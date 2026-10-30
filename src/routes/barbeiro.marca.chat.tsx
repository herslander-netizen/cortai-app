import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CircleUserRound,
  Image as ImageIcon,
  Palette,
  PanelTop,
  RectangleHorizontal,
  Type,
} from "lucide-react";
import { useState } from "react";

import { ChatPreview } from "@/components/agendamento/ChatPreview";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { MiniaturaDoChat } from "@/components/marca/editor/chat/MiniaturaDoChat";
import { GrupoDeCampos } from "@/components/marca/editor/secoes/pecas";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
import { LinhaDeOpcoes } from "@/components/ui/formulario/LinhaDeOpcoes";
import { GrupoDeLinhas } from "@/components/ui/formulario/LinhasDeConfiguracao";
import {
  aplicarEstiloDoChat,
  ESTILOS_DO_CHAT,
  estiloAtualDoChat,
  type ValoresDeEstilo,
} from "@/lib/estilos-chat";
import { exigirCapacidade } from "@/lib/guarda-capacidade";
import { getMarca, salvarRascunhoPagina } from "@/lib/marca.functions";
import { CHAT_ESTILOS, type PaginaConfig } from "@/lib/pagina-config";

export const Route = createFileRoute("/barbeiro/marca/chat")({
  beforeLoad: ({ context }) => exigirCapacidade(context.queryClient, "branding_avancado"),
  head: () => ({
    meta: [{ title: "Personalizar Chat — Flow" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PersonalizarChatPage,
});

function PersonalizarChatPage() {
  const query = useQuery({ queryKey: ["marca"], queryFn: () => getMarca(), retry: false });
  if (query.isLoading) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Personalizar Chat">
        <EsqueletoFormulario campos={5} onTentarDeNovo={() => void query.refetch()} />
      </Screen>
    );
  }
  if (query.isError || !query.data?.marca) {
    return (
      <Screen voltarPara="/barbeiro/marca" title="Personalizar Chat">
        <div className="surface space-y-3 p-4">
          <p className="text-sm text-paper">Não foi possível carregar o chat.</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </Screen>
    );
  }
  return <EditorDoChat initial={query.data.marca} />;
}

const NOMES_DOS_BALOES: Record<(typeof CHAT_ESTILOS)[number], string> = {
  vidro: "Vidro",
  classico: "Sólido",
  suave: "Suave",
  minimo: "Mínimo",
  elegante: "Elegante",
  rustico: "Rústico",
};

function EditorDoChat({
  initial,
}: {
  initial: NonNullable<Awaited<ReturnType<typeof getMarca>>>["marca"];
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const saveDraft = useServerFn(salvarRascunhoPagina);
  const e = useEditorDaPagina(initial, () => undefined);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const chat = e.config.chat;
  const alterar = (parte: Partial<PaginaConfig["chat"]>) =>
    e.setPagina("chat", { ...chat, ...parte });
  const atual = estiloAtualDoChat(chat);

  const salvar = async () => {
    setSalvando(true);
    setMensagem("");
    setErro(false);
    try {
      await saveDraft({ data: { marca: e.form, pagina: e.config } });
      await queryClient.invalidateQueries({ queryKey: ["marca"] });
      await navigate({ to: "/barbeiro/marca" });
    } catch (error) {
      setErro(true);
      setMensagem(error instanceof Error ? error.message : "Não foi possível salvar o chat.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Screen
      voltarPara="/barbeiro/marca"
      title="Personalizar Chat"
      subtitle="Defina como o atendimento em conversa aparece para o cliente."
    >
      <div className="space-y-5 pb-32">
        <div className="mx-auto max-w-[390px]">
          <ChatPreview
            ativo
            config={e.config}
            logoUrl={e.avatarPreview || e.logoPreview}
            capaUrl={e.coverPreview}
          />
        </div>

        <GrupoDeCampos titulo="Estilos prontos">
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {ESTILOS_DO_CHAT.map((estilo) => (
              <button
                key={estilo.id}
                type="button"
                aria-pressed={atual === estilo.id}
                onClick={() => e.setConfig((old) => aplicarEstiloDoChat(old, estilo.id))}
                className={`w-32 shrink-0 snap-start overflow-hidden rounded-2xl text-left ${atual === estilo.id ? "ring-2 ring-gold" : "ring-1 ring-line"}`}
              >
                <MiniaturaDoChat
                  valores={estilo.valores}
                  cores={e.config.cores}
                  destaque={e.config.cores.botao}
                  className="h-24 w-full"
                />
                <span className="block px-3 py-2 text-sm font-semibold text-paper">
                  {estilo.nome}
                </span>
              </button>
            ))}
          </div>
          {atual === null ? (
            <p className="text-sm text-mute">
              Estilo personalizado: você ajustou os detalhes abaixo.
            </p>
          ) : null}
        </GrupoDeCampos>

        <GrupoDeCampos titulo="Balões">
          <div className="grid grid-cols-3 gap-2">
            {CHAT_ESTILOS.map((id) => {
              const valores: ValoresDeEstilo = { ...chat, estilo: id };
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={chat.estilo === id}
                  aria-label={`Balões ${NOMES_DOS_BALOES[id]}`}
                  onClick={() => alterar({ estilo: id })}
                  className={`overflow-hidden rounded-xl text-center ${chat.estilo === id ? "ring-2 ring-gold" : "ring-1 ring-line"}`}
                >
                  <MiniaturaDoChat
                    valores={valores}
                    cores={e.config.cores}
                    destaque={e.config.cores.botao}
                    className="h-20 w-full"
                  />
                  <span className="block py-2 text-xs font-semibold text-paper">
                    {NOMES_DOS_BALOES[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </GrupoDeCampos>

        {/* Figaro: cada ajuste é uma linha com o valor atual e uma folha de baixo com as opções (antes eram botões
            colados que cortavam os nomes no celular). */}
        <section aria-labelledby="aparencia-do-chat" className="space-y-2">
          <h2 id="aparencia-do-chat" className="px-1 text-sm font-semibold text-mute">
            Aparência
          </h2>
          <GrupoDeLinhas>
            <LinhaDeOpcoes
              icone={ImageIcon}
              titulo="Fundo"
              valor={chat.fundo}
              opcoes={[
                {
                  valor: "capa",
                  rotulo: "Foto do negócio",
                  detalhe: "A capa da página atrás da conversa.",
                },
                { valor: "padrao", rotulo: "Flow", detalhe: "O fundo padrão do Flow." },
                { valor: "liso", rotulo: "Liso", detalhe: "Só a cor da conversa, sem imagem." },
              ]}
              aoEscolher={(v) => alterar({ fundo: v })}
            />
            <LinhaDeOpcoes
              icone={Palette}
              titulo="Cores da conversa"
              valor={chat.superficie}
              opcoes={[
                { valor: "padrao", rotulo: "Flow" },
                { valor: "tema", rotulo: "Tema", detalhe: "As cores do tema da página." },
                { valor: "clara", rotulo: "Clara" },
                { valor: "escura", rotulo: "Escura" },
                { valor: "grafite", rotulo: "Grafite" },
                { valor: "rustico", rotulo: "Rústica", detalhe: "Grafite quente e areia." },
              ]}
              aoEscolher={(v) => alterar({ superficie: v })}
            />
            <LinhaDeOpcoes
              icone={PanelTop}
              titulo="Cabeçalho"
              valor={chat.cabecalho}
              opcoes={[
                { valor: "barra", rotulo: "Barra", detalhe: "Presa no topo, de ponta a ponta." },
                {
                  valor: "cartao",
                  rotulo: "Cartão flutuante",
                  detalhe: "Solto do topo, com cantos arredondados.",
                },
              ]}
              aoEscolher={(v) => alterar({ cabecalho: v })}
            />
            <LinhaDeOpcoes
              icone={CircleUserRound}
              titulo="Foto da recepção"
              valor={chat.avatar}
              opcoes={[
                { valor: "redondo", rotulo: "Redonda" },
                { valor: "quadrado", rotulo: "Quadrada" },
              ]}
              aoEscolher={(v) => alterar({ avatar: v })}
            />
            <LinhaDeOpcoes
              icone={Type}
              titulo="Tamanho do texto"
              valor={chat.texto}
              opcoes={[
                { valor: "pequeno", rotulo: "Pequeno" },
                { valor: "normal", rotulo: "Normal" },
                { valor: "grande", rotulo: "Grande" },
              ]}
              aoEscolher={(v) => alterar({ texto: v })}
            />
            <LinhaDeOpcoes
              icone={RectangleHorizontal}
              titulo="Botões rápidos"
              valor={chat.chips}
              opcoes={[
                { valor: "pilula", rotulo: "Pílula", detalhe: "Botões arredondados em linha." },
                { valor: "cartao", rotulo: "Cartão", detalhe: "Cartões com ícone, lado a lado." },
              ]}
              aoEscolher={(v) => alterar({ chips: v })}
            />
          </GrupoDeLinhas>
        </section>

        <GrupoDeCampos titulo="Recepção e mensagens">
          <SecaoRecepcao
            config={e.config}
            setPagina={e.setPagina}
            avatarRef={e.avatarRef}
            avatarPreview={e.avatarPreview}
            setAvatarPreview={e.setAvatarPreview}
            upload={e.upload}
          />
        </GrupoDeCampos>

        {mensagem ? (
          <p
            role={erro ? "alert" : "status"}
            className={`px-2 text-sm ${erro ? "text-brick" : "text-mute"}`}
          >
            {mensagem}
          </p>
        ) : null}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:sticky md:bottom-0 md:rounded-xl md:border md:bg-ink">
        <Button
          className="min-h-14 w-full rounded-full"
          disabled={e.busy}
          loading={salvando}
          onClick={() => void salvar()}
        >
          Salvar alterações
        </Button>
      </div>
    </Screen>
  );
}
