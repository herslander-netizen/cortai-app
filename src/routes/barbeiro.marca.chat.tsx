import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { ChatPreview } from "@/components/agendamento/ChatPreview";
import { EsqueletoFormulario } from "@/components/layout/Esqueleto";
import { Screen } from "@/components/layout/Screen";
import { MiniaturaDoChat } from "@/components/marca/editor/chat/MiniaturaDoChat";
import { GrupoDeCampos, OpcoesConectadas } from "@/components/marca/editor/secoes/pecas";
import { SecaoRecepcao } from "@/components/marca/editor/SecaoRecepcao";
import { useEditorDaPagina } from "@/components/marca/editor/useEditorDaPagina";
import { Button } from "@/components/ui/button";
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
          <div className="grid grid-cols-5 gap-1.5">
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
                    className="h-16 w-full"
                  />
                  <span className="block py-1.5 text-[11px] font-semibold text-paper">
                    {NOMES_DOS_BALOES[id]}
                  </span>
                </button>
              );
            })}
          </div>
        </GrupoDeCampos>

        <GrupoDeCampos titulo="Aparência">
          <p className="text-sm font-medium text-mute">Fundo</p>
          <OpcoesConectadas
            rotulo="Fundo"
            valor={chat.fundo}
            opcoes={[
              { valor: "capa", texto: "Foto do negócio" },
              { valor: "padrao", texto: "Flow" },
              { valor: "liso", texto: "Liso" },
            ]}
            onChange={(v) => alterar({ fundo: v })}
          />
          <p className="text-sm font-medium text-mute">Cores da conversa</p>
          <OpcoesConectadas
            rotulo="Cores da conversa"
            valor={chat.superficie}
            opcoes={[
              { valor: "padrao", texto: "Flow" },
              { valor: "tema", texto: "Tema" },
              { valor: "clara", texto: "Clara" },
              { valor: "escura", texto: "Escura" },
              { valor: "grafite", texto: "Grafite" },
              { valor: "rustico", texto: "Rústica" },
            ]}
            onChange={(v) => alterar({ superficie: v })}
          />
          <p className="text-sm font-medium text-mute">Cabeçalho</p>
          <OpcoesConectadas
            rotulo="Cabeçalho"
            valor={chat.cabecalho}
            opcoes={[
              { valor: "barra", texto: "Barra" },
              { valor: "cartao", texto: "Cartão flutuante" },
            ]}
            onChange={(v) => alterar({ cabecalho: v })}
          />
          <p className="text-sm font-medium text-mute">Foto da recepção</p>
          <OpcoesConectadas
            rotulo="Formato da foto"
            valor={chat.avatar}
            opcoes={[
              { valor: "redondo", texto: "Redonda" },
              { valor: "quadrado", texto: "Quadrada" },
            ]}
            onChange={(v) => alterar({ avatar: v })}
          />
          <p className="text-sm font-medium text-mute">Tamanho do texto</p>
          <OpcoesConectadas
            rotulo="Tamanho do texto"
            valor={chat.texto}
            opcoes={[
              { valor: "pequeno", texto: "Pequeno" },
              { valor: "normal", texto: "Normal" },
              { valor: "grande", texto: "Grande" },
            ]}
            onChange={(v) => alterar({ texto: v })}
          />
          <p className="text-sm font-medium text-mute">Botões rápidos</p>
          <OpcoesConectadas
            rotulo="Botões rápidos"
            valor={chat.chips}
            opcoes={[
              { valor: "pilula", texto: "Pílula" },
              { valor: "cartao", texto: "Cartão" },
            ]}
            onChange={(v) => alterar({ chips: v })}
          />
        </GrupoDeCampos>

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
