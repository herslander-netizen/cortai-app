import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Loader2, MessageCircle, Send, ShieldCheck, Smartphone } from "lucide-react";

import { Screen, EmptyState } from "@/components/layout/Screen";
import { Carregando } from "@/components/layout/Carregando";
import { QrCodeReal } from "@/components/ia/QrCodeReal";
import { AUTOMACOES, TONS, type ChaveDeAutomacao, type ConfiguracaoDoAtendimento } from "@/lib/whatsapp/contrato";
import {
  atualizarQrCode,
  listarInformacoes,
  removerInformacao,
  salvarInformacao,
  conectarWhatsapp,
  definirAtendimentoDaConversa,
  desconectarWhatsapp,
  getPainelDoCortai,
  lerConversa,
  listarConversas,
  reconectarWhatsapp,
  responderComoHumano,
  salvarAutomacao,
  salvarConfiguracaoDoCortai,
  sincronizarConexao,
  type PainelDoCortai,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/barbeiro/cortai")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "CortAI no WhatsApp — Cortaí Gestão" },
      {
        name: "description",
        content: "Conecte o WhatsApp da barbearia, acompanhe as conversas e configure o atendimento do CortAI.",
      },
      { property: "og:title", content: "CortAI no WhatsApp — Cortaí Gestão" },
      { property: "og:description", content: "Atendimento pelo WhatsApp com os dados reais da sua barbearia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CortaiPage,
});

type Aba = "whatsapp" | "conversas" | "ajustes";

function Ponto({ ligado }: { ligado: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2 w-2 rounded-full ${ligado ? "bg-sage" : "bg-brick"}`}
    />
  );
}

function CortaiPage() {
  const [aba, setAba] = useState<Aba>("whatsapp");
  const painel = useQuery({ queryKey: ["cortai-painel"], queryFn: () => getPainelDoCortai() as Promise<PainelDoCortai> });

  return (
    <Screen
      voltarPara="/barbeiro/mais"
      title="CortAI no WhatsApp"
      subtitle="O atendimento da sua barbearia pelo WhatsApp, com os seus dados reais."
    >
      {painel.isLoading ? <Carregando /> : null}
      {painel.isError ? (
        <p className="border-y border-line py-8 text-center text-sm text-brick">
          Não conseguimos carregar o CortAI agora. Tente de novo em instantes.
        </p>
      ) : null}

      {painel.data ? (
        <>
          <section className="grid grid-cols-3 gap-2" aria-label="Situação do atendimento">
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">WhatsApp</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.conexao?.status === "conectado"} />
                {painel.data.conexao?.status === "conectado" ? "Ligado" : "Desligado"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">CortAI</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.iaDisponivel} />
                {painel.data.iaDisponivel ? "Pronto" : "Indisponível"}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-ink2 px-3 py-3">
              <p className="text-[10px] text-mute2">Automático</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-paper">
                <Ponto ligado={painel.data.configuracao.atendimentoAutomatico} />
                {painel.data.configuracao.atendimentoAutomatico ? "Ligado" : "Desligado"}
              </p>
            </div>
          </section>

          <nav className="mt-5 flex gap-2" aria-label="Seções do CortAI">
            {(
              [
                ["whatsapp", "WhatsApp"],
                ["conversas", "Conversas"],
                ["ajustes", "Ajustes"],
              ] as [Aba, string][]
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                className={`rounded-full border px-4 py-1.5 text-xs ${
                  aba === id ? "border-gold text-gold" : "border-line2 text-mute"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </nav>

          <div className="mt-5">
            {aba === "whatsapp" ? <BlocoConexao painel={painel.data} /> : null}
            {aba === "conversas" ? <BlocoConversas /> : null}
            {aba === "ajustes" ? <BlocoAjustes painel={painel.data} /> : null}
          </div>
        </>
      ) : null}
    </Screen>
  );
}

/* ------------------------------- WhatsApp -------------------------------- */

function BlocoConexao({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const conectar = useServerFn(conectarWhatsapp);
  const novoQr = useServerFn(atualizarQrCode);
  const reconectar = useServerFn(reconectarWhatsapp);
  const desconectar = useServerFn(desconectarWhatsapp);
  const sincronizar = useServerFn(sincronizarConexao);
  const [aviso, setAviso] = useState<string | null>(null);
  const [restante, setRestante] = useState<number | null>(null);
  const [desde] = useState(() => Date.now());
  const [agora, setAgora] = useState(() => Date.now());

  const acao = useMutation({
    mutationFn: async (qual: "conectar" | "qr" | "reconectar" | "desconectar") => {
      if (qual === "conectar") return conectar({ data: undefined });
      if (qual === "qr") return novoQr({ data: undefined });
      if (qual === "reconectar") return reconectar({ data: undefined });
      return desconectar({ data: undefined });
    },
    onSuccess: (r: unknown) => {
      setAviso((r as { aviso?: string | null })?.aviso ?? null);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
      void cliente.invalidateQueries({ queryKey: ["cortai-conexao"] });
    },
    onError: (e: unknown) => setAviso(e instanceof Error ? e.message : "Não foi possível concluir agora."),
  });

  const statusBase = painel.conexao?.status ?? "desconectado";
  // Enquanto não estiver conectado, perguntamos o estado real ao serviço.
  const acompanhar =
    painel.gatewayConfigurado && statusBase !== "conectado" && agora - desde < 10 * 60 * 1000;

  const estado = useQuery({
    queryKey: ["cortai-conexao"],
    queryFn: () => sincronizar({ data: undefined }),
    enabled: acompanhar,
    refetchInterval: acompanhar ? 5000 : false,
    refetchIntervalInBackground: false,
  });

  const conexao = estado.data?.conexao ?? painel.conexao;
  const status = conexao?.status ?? "desconectado";
  const expira = conexao?.qrExpiraEm ?? null;

  useEffect(() => {
    const id = window.setInterval(() => setAgora(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);

  // Assim que o serviço confirma a conexão, o painel inteiro se atualiza.
  useEffect(() => {
    if (status === "conectado") void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
  }, [status, cliente]);

  useEffect(() => {
    if (!expira) {
      setRestante(null);
      return;
    }
    const calcular = () => setRestante(Math.max(0, Math.round((new Date(expira).getTime() - Date.now()) / 1000)));
    calcular();
    const id = window.setInterval(calcular, 1000);
    return () => window.clearInterval(id);
  }, [expira]);

  if (!painel.gatewayConfigurado) {
    return (
      <section className="rounded-xl border border-line bg-ink2 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
            <Smartphone size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-paper">Serviço de WhatsApp ainda não configurado</h2>
            <p className="mt-1 text-xs text-mute">
              A conexão por QR Code depende de um serviço de WhatsApp publicado pela equipe do Cortaí. Enquanto ele
              não estiver no ar, nenhum QR Code é gerado — preferimos avisar a mostrar algo que não funciona.
            </p>
            <p className="mt-3 text-[11px] text-mute2">
              Para a equipe técnica: configure WHATSAPP_GATEWAY_URL, WHATSAPP_GATEWAY_API_KEY e
              WHATSAPP_WEBHOOK_SECRET, e aponte o serviço para /api/public/whatsapp/eventos.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const qrExpirado = status === "qr_pronto" && restante !== null && restante <= 0;
  const conectando = acao.isPending || status === "pendente" || status === "conectando";

  const titulo =
    status === "conectado"
      ? "WhatsApp conectado"
      : qrExpirado
        ? "Este QR Code expirou"
        : status === "qr_pronto"
          ? "Escaneie o QR Code usando o WhatsApp Business"
          : status === "conectando"
            ? "Conectando seu WhatsApp…"
            : status === "pendente"
              ? "Preparando sua conexão…"
              : status === "erro"
                ? "Não foi possível conectar seu WhatsApp"
                : conexao?.conectadoEm
                  ? "Seu WhatsApp foi desconectado"
                  : "Seu WhatsApp ainda não está conectado";

  const descricao =
    status === "conectado"
      ? "Seu WhatsApp está conectado e pronto para o CortAI atender seus clientes."
      : "Conecte o WhatsApp da sua barbearia para que o CortAI possa atender seus clientes automaticamente.";

  const rotuloPrincipal = conectando
    ? "Conectando…"
    : status === "erro"
      ? "Tentar novamente"
      : conexao?.conectadoEm
        ? "Reconectar WhatsApp"
        : "Conectar WhatsApp";

  return (
    <section className="rounded-xl border border-line bg-ink2 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-gold">
          <MessageCircle size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-paper">
            <Ponto ligado={status === "conectado"} />
            {titulo}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-mute">{descricao}</p>
        </div>
      </div>

      {status === "conectado" ? (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Número</dt>
            <dd className="text-paper">{conexao?.numero ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Nome da conta</dt>
            <dd className="truncate text-paper">{conexao?.nomeExibicao ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mute">Conectado em</dt>
            <dd className="text-paper">
              {conexao?.conectadoEm ? new Date(conexao.conectadoEm).toLocaleString("pt-BR") : "—"}
            </dd>
          </div>
        </dl>
      ) : null}

      {conectando && status !== "qr_pronto" ? (
        <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
          <Loader2 size={16} className="animate-spin text-gold" aria-hidden />
          <p className="text-xs text-mute">
            {status === "conectando" ? "Conectando seu WhatsApp…" : "Preparando sua conexão…"}
          </p>
        </div>
      ) : null}

      {status === "qr_pronto" && conexao?.qrCode && !qrExpirado ? (
        <div className="mt-5 border-t border-line pt-4 text-center">
          <div className="mt-1">
            <QrCodeReal valor={conexao.qrCode} alt="QR Code para conectar o WhatsApp da barbearia" />
          </div>
          <p className="mt-4 text-xs text-paper">Abra o WhatsApp Business no seu celular.</p>
          <p className="mt-1 text-xs text-mute">
            Vá em Aparelhos conectados &gt; Conectar um aparelho e escaneie este código.
          </p>
          {restante !== null ? (
            <p className="mt-2 text-[11px] text-mute2">Este código expira em {restante} segundos.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {status === "conectado" ? (
          <>
            <button
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => acao.mutate("reconectar")}
            >
              Reconectar
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
              disabled={acao.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Desconectar o WhatsApp da barbearia? Clientes, histórico e agendamentos continuam salvos.",
                  )
                ) {
                  acao.mutate("desconectar");
                }
              }}
            >
              Desconectar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={acao.isPending}
              onClick={() => acao.mutate("conectar")}
            >
              {rotuloPrincipal}
            </button>
            {status === "qr_pronto" || qrExpirado ? (
              <button
                type="button"
                className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
                disabled={acao.isPending}
                onClick={() => acao.mutate("qr")}
              >
                Gerar novo QR Code
              </button>
            ) : null}
          </>
        )}
        {aviso ? <p className="text-center text-sm text-brick">{aviso}</p> : null}
        {conexao?.ultimoErro ? <p className="text-center text-xs text-brick">{conexao.ultimoErro}</p> : null}
      </div>

      <p className="mt-6 flex items-start gap-2 border-t border-line pt-4 text-xs text-mute2">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        O CortAI responde apenas com informações cadastradas na sua barbearia e nunca acessa dados de outra.
      </p>
    </section>
  );
}

/* ------------------------------- Conversas ------------------------------- */

const FILTROS = [
  ["todas", "Todas"],
  ["cortai", "CortAI"],
  ["humano", "Humano"],
  ["nao_lidas", "Não lidas"],
] as const;

function BlocoConversas() {
  const cliente = useQueryClient();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("todas");
  const [aberta, setAberta] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["cortai-conversas", filtro],
    queryFn: () => listarConversas({ data: { filtro } }),
    refetchInterval: 20000,
  });

  const fechar = () => {
    setAberta(null);
    void cliente.invalidateQueries({ queryKey: ["cortai-conversas"] });
  };

  const painelLista = (
    <section className="min-w-0">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
              filtro === id ? "border-gold text-gold" : "border-line2 text-mute hover:text-paper"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {lista.isLoading ? <Carregando /> : null}
      {lista.data && lista.data.length === 0 ? <EmptyState text="Nenhuma conversa por aqui ainda." /> : null}

      <ul className="mt-3 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
        {(lista.data ?? []).map((c) => (
          <li key={c.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => setAberta(c.id)}
              className={`block w-full px-1 py-4 text-left ${aberta === c.id ? "bg-ink2" : ""}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{c.nomeContato ?? c.telefone}</p>
                  <p className="mt-0.5 truncate text-xs text-mute">
                    {c.status === "humano"
                      ? "Atendimento humano"
                      : c.status === "encerrada"
                        ? "Encerrada"
                        : "Atendimento pelo CortAI"}
                    {c.ultimaMensagemEm ? ` · ${new Date(c.ultimaMensagemEm).toLocaleString("pt-BR")}` : ""}
                  </p>
                </div>
                {c.naoLidas > 0 ? (
                  <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-ink">
                    {c.naoLidas}
                  </span>
                ) : null}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <>
      {/* Celular: uma coisa de cada vez. */}
      <div className="lg:hidden">
        {aberta ? <Conversa id={aberta} aoVoltar={fechar} /> : painelLista}
      </div>

      {/* Computador: lista à esquerda, conversa aberta à direita. */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
        {painelLista}
        <div className="min-w-0">
          {aberta ? (
            <Conversa id={aberta} aoVoltar={fechar} />
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-line text-sm text-mute2">
              Escolha uma conversa para acompanhar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

type PendenteFalha = { id: string; texto: string };

function Conversa({ id, aoVoltar }: { id: string; aoVoltar: () => void }) {
  const cliente = useQueryClient();
  const definir = useServerFn(definirAtendimentoDaConversa);
  const responder = useServerFn(responderComoHumano);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [falhas, setFalhas] = useState<PendenteFalha[]>([]);
  const [novaMensagem, setNovaMensagem] = useState(false);
  const lista = useRef<HTMLDivElement | null>(null);
  const noFim = useRef(true);
  const ultimaContagem = useRef(0);

  const dados = useQuery({
    queryKey: ["cortai-conversa", id],
    queryFn: () => lerConversa({ data: { conversaId: id } }),
    refetchInterval: 10000,
  });

  const mensagens = dados.data?.mensagens ?? [];

  const irAoFim = (suave = true) => {
    const el = lista.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    setNovaMensagem(false);
    noFim.current = true;
  };

  // Rolagem inteligente: só acompanha quem já estava no fim da conversa.
  useEffect(() => {
    if (mensagens.length === ultimaContagem.current) return;
    const primeiraCarga = ultimaContagem.current === 0;
    ultimaContagem.current = mensagens.length;
    if (primeiraCarga || noFim.current) irAoFim(!primeiraCarga);
    else setNovaMensagem(true);
  }, [mensagens.length]);

  const mudar = useMutation({
    mutationFn: (modo: "humano" | "cortai" | "encerrar") => definir({ data: { conversaId: id, modo } }),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: ["cortai-conversa", id] });
      void cliente.invalidateQueries({ queryKey: ["cortai-conversas"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível mudar o atendimento."),
  });

  const enviar = useMutation({
    mutationFn: (conteudo: string) => responder({ data: { conversaId: id, texto: conteudo } }),
    onSuccess: (_r, conteudo) => {
      setFalhas((f) => f.filter((x) => x.texto !== conteudo));
      setErro(null);
      noFim.current = true;
      void cliente.invalidateQueries({ queryKey: ["cortai-conversa", id] });
    },
    onError: (e: unknown, conteudo) => {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
      setFalhas((f) =>
        f.some((x) => x.texto === conteudo) ? f : [...f, { id: `falha-${Date.now()}`, texto: conteudo }],
      );
    },
  });

  function enviarNovo() {
    const limpo = texto.trim();
    if (!limpo || enviar.isPending) return;
    setTexto("");
    enviar.mutate(limpo);
  }

  const conversa = dados.data?.conversa;
  const humano = conversa?.status === "humano";

  return (
    <section className="cortai-conversa h-[calc(100dvh-230px)] min-h-[380px] rounded-xl border border-line bg-ink2 lg:h-[560px]">
      <header className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={aoVoltar}
            aria-label="Voltar às conversas"
            className="mt-0.5 shrink-0 text-mute hover:text-paper"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-paper">
              {conversa?.nomeContato ?? dados.data?.cliente?.nome ?? conversa?.telefone ?? "Conversa"}
            </p>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-mute">
              <Ponto ligado={!humano} />
              {conversa?.status === "encerrada"
                ? "Conversa encerrada"
                : humano
                  ? "Atendimento humano"
                  : "Atendimento pelo CortAI"}
              {conversa?.telefone ? ` · ${conversa.telefone}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-md border border-line2 py-2 text-xs text-paper disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("humano")}
          >
            Assumir conversa
          </button>
          <button
            type="button"
            className="flex-1 rounded-md border border-line2 py-2 text-xs text-paper disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("cortai")}
          >
            CortAI atende
          </button>
          <button
            type="button"
            className="rounded-md border border-line2 px-3 py-2 text-xs text-mute disabled:opacity-50"
            disabled={mudar.isPending}
            onClick={() => mudar.mutate("encerrar")}
          >
            Encerrar
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={lista}
          className="cortai-conversa-lista h-full px-4 py-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            noFim.current = perto;
            if (perto) setNovaMensagem(false);
          }}
        >
          {dados.isLoading ? <Carregando /> : null}

          <ul className="space-y-3">
            {mensagens.map((m) => {
              const sistema = m.tipo === "sistema";
              if (sistema) {
                return (
                  <li key={m.id} className="flex justify-center">
                    <span className="rounded-full border border-line2 px-3 py-1 text-[11px] text-mute2">
                      {m.conteudo}
                    </span>
                  </li>
                );
              }
              const entrada = m.direcao === "entrada";
              return (
                <li key={m.id} className={entrada ? "flex" : "flex justify-end"}>
                  <div
                    className={`max-w-[85%] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm ${
                      entrada ? "rounded-bl-sm bg-ink text-paper" : "rounded-br-sm bg-gold/15 text-paper"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{m.conteudo}</p>
                    <p className="mt-1 text-[10px] text-mute2">
                      {entrada ? "Cliente" : m.geradaPorIa ? "CortAI" : "Equipe"} ·{" "}
                      {new Date(m.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.status === "falhou" ? " · não enviada" : ""}
                    </p>
                  </div>
                </li>
              );
            })}

            {falhas.map((f) => (
              <li key={f.id} className="flex justify-end">
                <div className="max-w-[85%] min-w-0 rounded-2xl rounded-br-sm border border-brick/50 px-3.5 py-2.5 text-sm">
                  <p className="whitespace-pre-wrap break-words text-paper">{f.texto}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-brick">Não foi possível enviar.</span>
                    <button
                      type="button"
                      className="text-[10px] text-gold underline"
                      onClick={() => enviar.mutate(f.texto)}
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              </li>
            ))}

            {enviar.isPending ? (
              <li className="flex justify-end">
                <span className="text-[11px] text-mute2">Enviando…</span>
              </li>
            ) : null}
          </ul>
        </div>

        {novaMensagem ? (
          <button
            type="button"
            onClick={() => irAoFim()}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line2 bg-ink px-3 py-1.5 text-[11px] text-paper shadow-lg"
          >
            Nova mensagem ↓
          </button>
        ) : null}
      </div>

      <div className="cortai-conversa-barra shrink-0 border-t border-line px-3 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarNovo();
              }
            }}
            rows={1}
            placeholder="Escreva aqui…"
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-line2 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none"
          />
          <button
            type="button"
            aria-label="Enviar mensagem"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-50"
            disabled={enviar.isPending || texto.trim().length === 0}
            onClick={enviarNovo}
          >
            <Send size={17} aria-hidden />
          </button>
        </div>
        {erro ? <p className="mt-2 text-center text-xs text-brick">{erro}</p> : null}
      </div>
    </section>
  );
}

/* -------------------------------- Ajustes -------------------------------- */

function BlocoAjustes({ painel }: { painel: PainelDoCortai }) {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarConfiguracaoDoCortai);
  const salvarAuto = useServerFn(salvarAutomacao);
  const [config, setConfig] = useState<ConfiguracaoDoAtendimento>(painel.configuracao);
  const [ok, setOk] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => setConfig(painel.configuracao), [painel.configuracao]);

  const gravar = useMutation({
    mutationFn: () => salvar({ data: config }),
    onSuccess: () => {
      setOk(true);
      setErro(null);
      void cliente.invalidateQueries({ queryKey: ["cortai-painel"] });
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const alternarAutomacao = useMutation({
    mutationFn: (a: { chave: ChaveDeAutomacao; ativa: boolean; mensagem: string }) => salvarAuto({ data: a }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ["cortai-painel"] }),
  });

  const chaves: [keyof ConfiguracaoDoAtendimento, string][] = [
    ["atendimentoAutomatico", "Atendimento automático"],
    ["saudacaoAtiva", "Saudação ao iniciar conversa"],
    ["permiteConfirmar", "Confirmar agendamento"],
    ["permiteCancelar", "Cancelar agendamento"],
    ["permiteRemarcar", "Remarcar agendamento"],
    ["encaminhamentoHumano", "Encaminhar para atendente"],
    ["lembretes", "Lembretes de horário"],
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-line bg-ink2 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-paper">
          <Bot size={16} className="text-gold" /> Como o CortAI atende
        </h2>

        <ul className="mt-4 space-y-3">
          {chaves.map(([chave, rotulo]) => (
            <li key={chave} className="flex items-center justify-between gap-4">
              <span className="text-xs text-paper">{rotulo}</span>
              <input
                type="checkbox"
                checked={Boolean(config[chave])}
                onChange={(e) => {
                  setOk(false);
                  setConfig({ ...config, [chave]: e.target.checked });
                }}
                className="h-4 w-4 accent-[var(--gold,#D4AF6A)]"
                aria-label={rotulo}
              />
            </li>
          ))}
        </ul>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Tom do atendimento</span>
          <select
            value={config.tom}
            onChange={(e) => {
              setOk(false);
              setConfig({ ...config, tom: e.target.value as ConfiguracaoDoAtendimento["tom"] });
            }}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          >
            {Object.entries(TONS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Mensagem de boas-vindas</span>
          <textarea
            value={config.mensagemBoasVindas}
            onChange={(e) => {
              setOk(false);
              setConfig({ ...config, mensagemBoasVindas: e.target.value });
            }}
            rows={2}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs text-mute">Mensagem fora do horário</span>
          <textarea
            value={config.mensagemForaDoHorario}
            onChange={(e) => {
              setOk(false);
              setConfig({ ...config, mensagemForaDoHorario: e.target.value });
            }}
            rows={2}
            className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
          />
        </label>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-paper">Sugerir clientes sumidos</p>
              <p className="mt-0.5 text-[11px] text-mute2">
                Só identifica quem passou do intervalo habitual. Nada é enviado automaticamente.
              </p>
            </div>
            <input
              type="checkbox"
              checked={config.recuperacaoAtiva}
              onChange={(e) => {
                setOk(false);
                setConfig({ ...config, recuperacaoAtiva: e.target.checked });
              }}
              className="h-4 w-4 accent-[var(--gold,#D4AF6A)]"
              aria-label="Sugerir clientes sumidos"
            />
          </div>
          {config.recuperacaoAtiva ? (
            <label className="mt-3 block">
              <span className="text-xs text-mute">Dias sem voltar</span>
              <input
                type="number"
                min={7}
                max={180}
                value={config.recuperacaoDias}
                onChange={(e) => {
                  setOk(false);
                  setConfig({ ...config, recuperacaoDias: Number(e.target.value) || 30 });
                }}
                className="mt-1 w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
              />
            </label>
          ) : null}
        </div>

        <button type="button" className="btn-primary mt-5 w-full" disabled={gravar.isPending} onClick={() => gravar.mutate()}>
          {gravar.isPending ? "Salvando…" : "Salvar ajustes"}
        </button>
        {ok ? <p className="mt-2 text-center text-sm text-sage">Ajustes salvos.</p> : null}
        {erro ? <p className="mt-2 text-center text-sm text-brick">{erro}</p> : null}
      </div>

      <BlocoInformacoes />

      <div className="rounded-lg border border-line bg-ink2 p-5">
        <h2 className="text-sm font-semibold text-paper">Mensagens automáticas</h2>
        <p className="mt-1 text-xs text-mute">Ligue só o que fizer sentido para a sua barbearia.</p>
        <ul className="mt-4 space-y-3">
          {painel.automacoes.map((a) => (
            <li key={a.chave} className="flex items-center justify-between gap-4">
              <span className="text-xs text-paper">{AUTOMACOES[a.chave]}</span>
              <input
                type="checkbox"
                checked={a.ativa}
                onChange={(e) => alternarAutomacao.mutate({ chave: a.chave, ativa: e.target.checked, mensagem: a.mensagem })}
                className="h-4 w-4 accent-[var(--gold,#D4AF6A)]"
                aria-label={AUTOMACOES[a.chave]}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------------- Informações oficiais da barbearia ----------------- */

function BlocoInformacoes() {
  const cliente = useQueryClient();
  const salvar = useServerFn(salvarInformacao);
  const remover = useServerFn(removerInformacao);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const lista = useQuery({ queryKey: ["cortai-informacoes"], queryFn: () => listarInformacoes() });
  const recarregar = () => void cliente.invalidateQueries({ queryKey: ["cortai-informacoes"] });

  const gravar = useMutation({
    mutationFn: () => salvar({ data: { pergunta: pergunta.trim(), resposta: resposta.trim(), ativo: true } }),
    onSuccess: () => {
      setPergunta("");
      setResposta("");
      setErro(null);
      recarregar();
    },
    onError: (e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível salvar."),
  });

  const apagar = useMutation({
    mutationFn: (id: string) => remover({ data: { id } }),
    onSuccess: recarregar,
  });

  return (
    <div className="rounded-lg border border-line bg-ink2 p-5">
      <h2 className="text-sm font-semibold text-paper">Informações da barbearia</h2>
      <p className="mt-1 text-xs text-mute">
        Endereço, estacionamento, formas de pagamento, políticas. O CortAI só responde essas dúvidas com o que estiver
        escrito aqui.
      </p>

      {lista.data && lista.data.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {lista.data.map((i) => (
            <li key={i.id} className="rounded-md border border-line2 p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-paper">{i.pergunta}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-mute">{i.resposta}</p>
                </div>
                <button type="button" className="text-[11px] text-brick" onClick={() => apagar.mutate(i.id)}>
                  Apagar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-mute2">Nenhuma informação cadastrada ainda.</p>
      )}

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Pergunta (ex.: Tem estacionamento?)"
          className="w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
        />
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={2}
          placeholder="Resposta oficial da barbearia"
          className="w-full rounded-md border border-line2 bg-ink px-3 py-2.5 text-sm text-paper"
        />
        <button
          type="button"
          className="w-full rounded-md border border-line2 py-2.5 text-sm text-paper disabled:opacity-50"
          disabled={gravar.isPending || pergunta.trim().length < 3 || resposta.trim().length < 2}
          onClick={() => gravar.mutate()}
        >
          {gravar.isPending ? "Salvando…" : "Adicionar informação"}
        </button>
        {erro ? <p className="text-center text-sm text-brick">{erro}</p> : null}
      </div>
    </div>
  );
}
