import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Mic, Send, Square, TriangleAlert, X } from "lucide-react";

import { AgendarNoChat } from "./AgendarNoChat";
import { IconeDaIA } from "./IconeDaIA";
import { Digitando } from "./Digitando";
import { FolhaCortai } from "./FolhaCortai";
import { blobParaBase64, useGravadorDeVoz } from "./useGravadorDeVoz";
import { SeloDaCortai } from "./SeloDaCortai";
import { CHAVE_DO_ESTADO_DA_CORTAI, useEstadoDaCortai } from "./useEstadoDaCortai";
import { useProgressoCortai } from "./useProgressoCortai";

import { Aviso } from "@/components/ui/aviso";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IndicadorDeCarregamento } from "@/components/ui/IndicadorDeCarregamento";
import type { Conferencia } from "@/lib/brain/conferencia";
import { brl } from "@/lib/format";
import { DIAS_DA_SEMANA, type RespostaDoAssistente } from "@/lib/ia/assistente";
import {
  confirmarAcaoDaIa,
  getConversaDoAssistente,
  perguntarAoCortai,
  type TurnoDaConversa,
} from "@/lib/assistente.functions";
import { transcreverComandoDeVozDoPainel } from "@/lib/voz.functions";
import { SEGMENTOS_CONFIG, segmentoParaApresentacao, type Segmento } from "@/lib/segmentos";
import { SELO_DA_CORTAI } from "@/lib/brain/estado-cortai";


function atalhosDo(segmento: Segmento | undefined) {
  const s = segmentoParaApresentacao(segmento);
  return [SEGMENTOS_CONFIG[s].exemploIA, ...ATALHOS_FIXOS];
}

/** Por que a voz não virou comando — texto claro, sem culpar a pessoa. */
const MOTIVOS_DA_VOZ: Record<string, string> = {
  invalido: "Não consegui usar esse áudio. Tente gravar de novo.",
  grande_demais: "O áudio ficou longo demais. Fale só o comando, em até 1 minuto.",
  tipo_nao_aceito: "Este navegador gravou um formato que não consigo ler. Escreva o comando.",
  indisponivel: "A voz ainda não está ligada neste ambiente. Escreva o comando.",
  nao_entendi: "Não entendi o áudio. Fale mais perto do microfone ou escreva o comando.",
  limite: "Você usou muitos comandos de voz nesta hora. Escreva por enquanto.",
  sem_credito: "A transcrição de voz do servidor está sem créditos. Escreva o comando.",
  sobrecarregado: "O serviço de voz está sobrecarregado agora. Tente de novo em instantes.",
};

function tempo(segundos: number) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

const ATALHOS_FIXOS = [
  "Trabalho de segunda a sábado das 8 às 18",
  "Como coloco um cliente na fila?",
  "Quais serviços estão cadastrados?",
];

/** Sugestões rápidas sempre à mão, logo acima do campo de escrita. */
const SUGESTOES = [
  "Quanto entrou hoje?",
  "Como coloco um cliente na fila?",
  "Cadastrar um serviço novo",
];

/** Progresso real da configuração inicial — linha fina, sem roubar espaço. */
function ProgressoDaConfiguracao() {
  const progresso = useProgressoCortai();
  if (!progresso || progresso.concluido) return null;
  const pct = Math.round((progresso.feitos / progresso.total) * 100);

  return (
    <div className="flex items-center gap-2.5 px-5 pb-2.5">
      <span className="shrink-0 text-xs text-mute2">
        Configuração · {progresso.feitos}/{progresso.total}
      </span>
      <span className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--figaro-surface-container-high,var(--ink3))]">
        <span
          className="block h-full rounded-full bg-[var(--figaro-primary,var(--primary))] transition-[width] duration-[280ms]"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </span>
      {progresso.feitos > 0 ? <Check size={12} className="shrink-0 text-sage" aria-hidden /> : null}
    </div>
  );
}

/**
 * O que a CortAI conferiu antes de gravar, item por item, e o veredito. É regra calculada no
 * servidor (entidades do negócio + regras oficiais da agenda), não opinião do modelo.
 */
function ListaDeConferencia({ conferencia }: { conferencia: Conferencia }) {
  const corDoVeredito =
    conferencia.veredito === "pronto"
      ? "text-sage"
      : conferencia.veredito === "atencao"
        ? "text-gold"
        : "text-brick";
  return (
    <div role="group" aria-label="Conferência do pedido" className="mt-2.5">
      <p className={`mb-1.5 text-xs font-semibold ${corDoVeredito}`}>{conferencia.resumo}</p>
      <ul className="space-y-1">
        {conferencia.itens.map((i) => (
          <li key={i.id} className="flex items-start gap-2 text-xs leading-snug">
            <span
              className={`mt-px shrink-0 ${
                i.estado === "ok"
                  ? "text-sage"
                  : i.estado === "atencao"
                    ? "text-gold"
                    : "text-brick"
              }`}
              aria-label={
                i.estado === "ok" ? "conferido" : i.estado === "atencao" ? "atenção" : "problema"
              }
            >
              {i.estado === "ok" ? (
                <Check size={13} aria-hidden />
              ) : i.estado === "atencao" ? (
                <TriangleAlert size={13} aria-hidden />
              ) : (
                <X size={13} aria-hidden />
              )}
            </span>
            <span className="min-w-0 break-words">
              <span className="text-mute2">{i.rotulo}: </span>
              <span className="text-paper">{i.valor}</span>
              {i.detalhe && i.estado !== "ok" ? (
                <span className="block text-mute">{i.detalhe}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviaDaAcao({
  acao,
  onConfirmado,
}: {
  acao: RespostaDoAssistente;
  onConfirmado: (texto: string) => void;
}) {
  const confirmar = useServerFn(confirmarAcaoDaIa);
  const [estado, setEstado] = useState<"pronto" | "enviando" | "feito" | "erro">("pronto");
  const [erro, setErro] = useState<string | null>(null);

  const temServicos = Boolean(acao.servicos?.length);
  const temHorarios = Boolean(acao.horarios?.length);
  if (!acao.precisaConfirmar || (!temServicos && !temHorarios)) return null;

  return (
    <div className="mt-3 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-4">
      {temServicos ? (
        <ul className="space-y-2">
          {acao.servicos!.map((s, i) => (
            <li key={`${s.nome}-${i}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-paper">{s.nome}</span>
              <span className="shrink-0 text-xs text-mute">
                {s.duracaoMin} min · {brl(s.precoCentavos)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {temHorarios ? (
        <ul className="space-y-1.5">
          {acao.horarios!.map((h) => (
            <li key={h.diaSemana} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-paper">{DIAS_DA_SEMANA[h.diaSemana]}</span>
              <span className="text-xs text-mute">
                {h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {estado === "feito" ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-sage">
          <Check size={14} aria-hidden /> Tudo salvo.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-mute">
            {acao.perguntaDeConfirmacao ?? "Posso salvar essas informações?"}
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-3 w-full"
            disabled={estado === "enviando"}
            onClick={async () => {
              setEstado("enviando");
              setErro(null);
              try {
                await confirmar({
                  data: {
                    tipo: temServicos ? "cadastrar_servicos" : "definir_horarios",
                    ...(temServicos ? { servicos: acao.servicos! } : {}),
                    ...(temHorarios && !temServicos ? { horarios: acao.horarios! } : {}),
                  },
                });
                setEstado("feito");
                onConfirmado(temServicos ? "Serviços cadastrados." : "Horários salvos.");
              } catch (e) {
                setEstado("erro");
                setErro(e instanceof Error ? e.message : "Não consegui salvar agora.");
              }
            }}
          >
            {estado === "enviando" ? "Salvando…" : "Confirmar"}
          </Button>
          {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}
        </>
      )}
    </div>
  );
}

export function AssistenteCortai({
  onFechar,
  segmento,
  iniciarPorVoz = false,
}: {
  onFechar: () => void;
  segmento?: Segmento | undefined;
  /** Abre já ouvindo (atalho "Agendar por voz" da Agenda). */
  iniciarPorVoz?: boolean;
}) {
  const queryClient = useQueryClient();
  const perguntar = useServerFn(perguntarAoCortai);
  const transcrever = useServerFn(transcreverComandoDeVozDoPainel);
  const [texto, setTexto] = useState("");
  // Mantém a origem do rascunho para que uma transcrição revisada continue passando pelas
  // proteções específicas de comandos de voz no servidor.
  const [origemRascunho, setOrigemRascunho] = useState<"texto" | "voz">("texto");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<TurnoDaConversa[]>([]);
  const fim = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLTextAreaElement | null>(null);
  const lista = useRef<HTMLDivElement | null>(null);
  const noFim = useRef(true);
  const [novaMensagem, setNovaMensagem] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const estado = useEstadoDaCortai();

  const { data } = useQuery({
    queryKey: ["assistente-conversa"],
    queryFn: () => getConversaDoAssistente(),
  });

  function irAoFim(suave = true) {
    const el = lista.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    noFim.current = true;
    setNovaMensagem(false);
  }

  useEffect(() => {
    if (!data) return;
    setConversaId(data.conversaId);
    setMensagens((atual) => (atual.length ? atual : data.mensagens));
  }, [data]);

  // Só acompanha automaticamente quem já estava no fim da conversa.
  useEffect(() => {
    if (noFim.current) irAoFim();
    else setNovaMensagem(true);
  }, [mensagens.length, enviando]);

  useEffect(() => {
    // Aberto por voz, o teclado não deve pular na frente do microfone.
    if (!iniciarPorVoz) campo.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

  // Pop-up de homônimos: some quando a pessoa escolhe, fecha ou manda outra mensagem.
  const [opcoesDispensadas, setOpcoesDispensadas] = useState<Set<string>>(new Set());

  const ultimaMensagem = mensagens.at(-1);
  const ultimaId = ultimaMensagem?.id ?? "";
  const opcoesAtuais =
    ultimaMensagem?.autor === "assistente" && !enviando && !opcoesDispensadas.has(ultimaId)
      ? (ultimaMensagem.acao?.opcoes ?? [])
      : [];

  // Escrita preparada (ex.: agendamento por voz): conferir e tocar, sem digitar "sim".
  const confirmacaoAtual =
    ultimaMensagem?.autor === "assistente" && !enviando && !opcoesDispensadas.has(`c-${ultimaId}`)
      ? (ultimaMensagem.acao?.aguardandoConfirmacao ?? null)
      : null;

  const conferenciaDoCartao = confirmacaoAtual ? (ultimaMensagem?.acao?.conferencia ?? null) : null;

  const voz = useGravadorDeVoz({
    // A fala vira rascunho editável; só o toque explícito em Enviar chama a CortAI.
    aoReconhecer: async (transcricao) => {
      setTexto(transcricao);
      setOrigemRascunho("voz");
      setErro(null);
      campo.current?.focus();
    },
    aoGravar: async ({ blob, mimeType, duracaoS }) => {
      const r = await transcrever({
        data: { audioBase64: await blobParaBase64(blob), mimeType, duracaoS },
      });
      if ("motivo" in r)
        throw new Error(MOTIVOS_DA_VOZ[r.motivo] ?? "Não consegui entender o áudio.");
      setTexto(r.texto);
      setOrigemRascunho("voz");
      setErro(null);
      requestAnimationFrame(() => campo.current?.focus());
    },
  });

  // Atalho "Agendar por voz": começa a ouvir assim que a folha abre. O atraso curto evita
  // dupla partida quando o React remonta o componente em desenvolvimento.
  const iniciarVoz = useRef(voz.iniciar);
  iniciarVoz.current = voz.iniciar;
  useEffect(() => {
    if (!iniciarPorVoz || !voz.suportado) return;
    const id = window.setTimeout(() => void iniciarVoz.current(), 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir
  }, []);

  // Mesmo texto reenviado depois de falha/timeout reaproveita o id: o servidor não duplica.
  const tentativa = useRef<{ texto: string; id: string; escolha?: string | undefined } | null>(
    null,
  );

  async function enviar(
    mensagem: string,
    origem: "texto" | "voz" = "texto",
    clienteEscolhidoId?: string,
    /** Toque em botão (escolha/confirmação): se falhar, some a fala provisória e o botão volta. */
    descartarSeFalhar = false,
  ): Promise<boolean> {
    const limpo = mensagem.trim();
    if (!limpo || enviando) return false;
    const id =
      tentativa.current?.texto === limpo && tentativa.current.escolha === clienteEscolhidoId
        ? tentativa.current.id
        : crypto.randomUUID();
    tentativa.current = { texto: limpo, id, escolha: clienteEscolhidoId };
    setTexto("");
    setOrigemRascunho("texto");
    setErro(null);
    setEnviando(true);
    const idLocal = `local-${Date.now()}`;
    setMensagens((atual) => [
      ...atual,
      { id: idLocal, autor: "barbeiro", conteudo: limpo, acao: null },
    ]);
    try {
      const r = await perguntar({
        data: {
          mensagem: limpo,
          conversaId,
          idDaMensagem: id,
          origem,
          ...(clienteEscolhidoId ? { clienteEscolhidoId } : {}),
        },
      });
      tentativa.current = null;
      // O sistema só escreve "Pronto ✅" depois de gravar: a agenda aberta se atualiza já.
      if (r.resposta.resposta.startsWith("Pronto ✅"))
        for (const chave of ["agenda-dia", "agenda-agora-proximo", "agenda-meu-dia", "agenda-fila"])
          void queryClient.invalidateQueries({ queryKey: [chave] });
      setConversaId(r.conversaId);
      queryClient.setQueryData(CHAVE_DO_ESTADO_DA_CORTAI, { estado: r.estado });
      setMensagens((atual) => [
        ...atual,
        {
          id: `ia-${Date.now()}`,
          autor: "assistente",
          conteudo: r.resposta.resposta,
          acao: r.resposta,
        },
      ]);
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "O Cortaí não respondeu agora.");
      // Escolha que não chegou: tira a fala provisória para o pop-up voltar e a pessoa tocar de novo.
      if (clienteEscolhidoId || descartarSeFalhar)
        setMensagens((atual) => atual.filter((m) => m.id !== idLocal));
      return false;
    } finally {
      setEnviando(false);
      campo.current?.focus();
    }
  }

  return (
    <FolhaCortai
      aoFechar={onFechar}
      rotulo="Cortaí"
      cabecalho={
        <>
          <header className="shrink-0 flex items-center gap-2.5 bg-[var(--figaro-surface-container,var(--ink2))] px-5 pb-2.5 pt-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-on-primary-container,var(--paper))]"
              aria-hidden
            >
              <IconeDaIA segmento={segmento} size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold tracking-wide text-paper">
                  Cortaí
                </span>
                <SeloDaCortai estado={estado} />
              </span>
              <span className="block truncate text-xs uppercase tracking-[.12em] text-mute2">
                Agenda, clientes e atendimento
              </span>
            </span>
            <Button
              type="button"
              onClick={onFechar}
              aria-label="Fechar Cortaí"
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 rounded-full border-line2 text-mute"
            >
              <X size={16} />
            </Button>
          </header>
          <ProgressoDaConfiguracao />
        </>
      }
    >
      <div
        ref={lista}
        className="cortai-conversa-lista px-5 py-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          const perto = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          noFim.current = perto;
          if (perto) setNovaMensagem(false);
        }}
      >
        {mensagens.length === 0 ? (
          <div>
            <p className="text-sm leading-relaxed text-mute">
              Escreva como você falaria com um colega. Por exemplo:
            </p>
            <Button
              type="button"
              onClick={() => setAgendando(true)}
              variant="primary"
              size="bloco"
              className="mt-3 flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-[12px] px-4 py-3 text-left text-xs"
            >
              <span>Marcar um horário agora</span>
              <ArrowRight size={13} aria-hidden />
            </Button>
            <div className="mt-3 space-y-2">
              {atalhosDo(segmento).map((a) => (
                <Button
                  key={a}
                  type="button"
                  variant="ghost"
                  size="bloco"
                  className="flex h-auto w-full items-center justify-between gap-3 whitespace-normal rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-4 py-3 text-left text-xs text-paper"
                  onClick={() => void enviar(a)}
                >
                  <span className="min-w-0">{a}</span>
                  <ArrowRight size={13} className="shrink-0 text-[var(--figaro-primary,var(--primary))]" aria-hidden />
                </Button>
              ))}
            </div>
            {estado && estado !== "ativa" ? (
              <Aviso tom="info" className="mt-4">
                {SELO_DA_CORTAI[estado].texto}
              </Aviso>
            ) : data && !data.disponivel ? (
              <Aviso tom="info" className="mt-4">
                O Cortaí ainda não está ligado neste ambiente. As respostas vão indicar isso com clareza.
              </Aviso>
            ) : null}
          </div>
        ) : null}

        <ul className="space-y-3.5">
          {mensagens.map((m) => (
            <li key={m.id} className={m.autor === "barbeiro" ? "flex justify-end" : "flex gap-2.5"}>
              {m.autor === "barbeiro" ? (
                <p className="max-w-[85%] min-w-0 break-words rounded-2xl rounded-br-md border-0 bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-on-primary-container,var(--paper))] px-4 py-2.5 text-sm leading-relaxed text-paper">
                  {m.conteudo}
                </p>
              ) : (
                <>
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]"
                    aria-hidden
                  >
                    <IconeDaIA segmento={segmento} size={15} />
                  </span>
                  <div className="min-w-0 max-w-[88%]">
                    <div className="rounded-2xl rounded-bl-md border-0 bg-[var(--figaro-surface-container-low,var(--ink))] px-4 py-3">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-paper">
                        {m.conteudo}
                      </p>
                      {m.acao ? (
                        <PreviaDaAcao acao={m.acao} onConfirmado={() => undefined} />
                      ) : null}
                      {m.acao?.conferencia && !(confirmacaoAtual && m.id === ultimaId) ? (
                        <ListaDeConferencia conferencia={m.acao.conferencia} />
                      ) : null}
                    </div>
                    {m.acao?.destino ? (
                      <Button asChild variant="primary" className="mt-2 inline-flex gap-1.5">
                        <Link to={m.acao.destino as "/barbeiro"} onClick={onFechar}>
                          {m.acao.rotuloDoDestino ?? "Abrir"}
                          <ArrowRight size={13} aria-hidden />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {agendando ? (
          <div className="mt-3.5 flex gap-2.5">
            <span
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold-soft text-gold"
              aria-hidden
            >
              <IconeDaIA segmento={segmento} size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-bl-md border-0 bg-[var(--figaro-surface-container-low,var(--ink))] px-4 py-3">
                <p className="text-sm leading-relaxed text-paper">
                  Escolha o serviço, o dia e um horário livre. Eu marco e aviso o cliente no
                  WhatsApp.
                </p>
                <AgendarNoChat />
              </div>
              <Chip className="mt-2" onClick={() => setAgendando(false)}>
                Fechar agenda
              </Chip>
            </div>
          </div>
        ) : null}

        {enviando ? (
          <div className="mt-3.5 flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-0 bg-[var(--figaro-primary-container,var(--ink2))] text-[var(--figaro-primary,var(--primary))]"
              aria-hidden
            >
              <IconeDaIA segmento={segmento} size={15} />
            </span>
            <span className="rounded-2xl rounded-bl-md border-0 bg-[var(--figaro-surface-container-low,var(--ink))] px-3.5 py-2.5">
              <Digitando />
            </span>
          </div>
        ) : null}
        {erro ? (
          <Aviso tom="acao" className="mt-4">{erro}</Aviso>
        ) : null}
        <div ref={fim} />
      </div>

      {novaMensagem ? (
        <div className="relative">
          <Button
            type="button"
            onClick={() => irAoFim()}
            variant="outline"
            size="sm"
            className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full bg-[var(--figaro-surface-container-high,var(--ink2))] text-xs text-paper shadow-[var(--elevacao-3)]"
          >
            Nova mensagem ↓
          </Button>
        </div>
      ) : null}

      <div className="cortai-conversa-barra shrink-0 bg-[var(--figaro-surface-container,var(--ink2))] px-4 pt-2.5">
        {mensagens.length > 0 || agendando ? (
          <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              onClick={() => {
                setAgendando(true);
                irAoFim();
              }}
              variant="primary"
              size="sm"
              className="shrink-0 rounded-full text-xs font-semibold"
            >
              Marcar horário
            </Button>
            {SUGESTOES.map((s) => (
              <Chip key={s} disabled={enviando} onClick={() => void enviar(s)}>
                {s}
              </Chip>
            ))}
          </div>
        ) : null}
        {confirmacaoAtual ? (
          <div
            role="group"
            aria-label="Confirmar o que a Cortaí entendeu"
            className="mb-2.5 rounded-[28px] bg-[var(--figaro-surface-container-high,var(--ink2))] px-3.5 py-3"
          >
            <p className="mb-0.5 text-xs font-semibold text-paper">Confere?</p>
            <p className="break-words text-sm leading-snug text-mute">{confirmacaoAtual.resumo}</p>
            {conferenciaDoCartao ? (
              <div className="mb-3">
                <ListaDeConferencia conferencia={conferenciaDoCartao} />
              </div>
            ) : (
              <div className="mb-3" />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={async () => {
                  const enviou = await enviar("sim", "texto", undefined, true);
                  if (enviou) setOpcoesDispensadas((a) => new Set(a).add(`c-${ultimaId}`));
                }}
                variant="primary"
                className="min-w-0 flex-1 whitespace-normal px-3"
              >
                {conferenciaDoCartao?.veredito === "atencao"
                  ? "Confirmar mesmo assim"
                  : "Confirmar"}
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const enviou = await enviar("não", "texto", undefined, true);
                  if (enviou) setOpcoesDispensadas((a) => new Set(a).add(`c-${ultimaId}`));
                }}
                variant="outline"
                className="min-w-12 px-4 text-sm text-mute"
              >
                Não
              </Button>
            </div>
          </div>
        ) : null}
        {opcoesAtuais.length ? (
          <div
            role="group"
            aria-label="Escolha o cliente"
            className="mb-2.5 rounded-[28px] bg-[var(--figaro-surface-container-high,var(--ink2))] px-3.5 py-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-paper">Qual cliente?</span>
              <span className="text-xs text-mute2">Toque no certo</span>
              <Button
                type="button"
                onClick={() => setOpcoesDispensadas((a) => new Set(a).add(ultimaId))}
                aria-label="Fechar as opções"
                variant="ghost"
                  size="icon"
                  className="ml-auto rounded-full text-mute"
              >
                <X size={14} aria-hidden />
              </Button>
            </div>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
              {opcoesAtuais.map((o) => (
                <li key={o.id}>
                  <Button
                    type="button"
                    disabled={enviando}
                    onClick={async () => {
                      const enviou = await enviar(
                        `${o.rotulo}${o.detalhe ? ` (${o.detalhe})` : ""}`,
                        "texto",
                        o.id,
                      );
                      if (enviou) setOpcoesDispensadas((a) => new Set(a).add(ultimaId));
                    }}
                    variant="ghost"
                    size="bloco"
                    className="flex h-auto min-h-12 w-full items-center justify-between gap-3 whitespace-normal rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3.5 py-3 text-left text-sm text-paper disabled:opacity-50"
                  >
                    <span className="min-w-0 truncate">{o.rotulo}</span>
                    {o.detalhe ? (
                      <span className="shrink-0 text-xs text-mute">{o.detalhe}</span>
                    ) : null}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {voz.estado !== "ocioso" || voz.erro ? (
          <div className="mb-2 flex items-center gap-2 text-xs" role="status" aria-live="polite">
            {voz.estado === "gravando" ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-brick" aria-hidden />
                <span className="text-paper">Ouvindo… {tempo(voz.segundos)}</span>
                {voz.parcial ? (
                  <span className="min-w-0 flex-1 truncate italic text-mute">“{voz.parcial}”</span>
                ) : (
                  <span className="text-mute2">toque no quadrado para enviar</span>
                )}
                <Button
                  type="button"
                  onClick={voz.cancelar}
                  variant="outline"
                  size="sm"
                  className="ml-auto rounded-full text-mute"
                >
                  Cancelar
                </Button>
              </>
            ) : voz.estado === "processando" ? (
              <span className="text-mute">Entendendo o que você falou…</span>
            ) : (
              <>
                <span className="text-brick">{voz.erro}</span>
                <Button
                  type="button"
                  onClick={voz.limparErro}
                  variant="ghost"
                  size="sm"
                  className="ml-auto rounded-full text-mute"
                >
                  Ok
                </Button>
              </>
            )}
          </div>
        ) : null}
        {origemRascunho === "voz" && texto.trim() ? (
          <div className="mb-2 flex min-h-10 items-center gap-2 rounded-[12px] bg-[var(--figaro-surface-container,var(--ink2))] px-3 py-1.5 text-xs">
            <Mic size={13} className="shrink-0 text-gold" aria-hidden />
            <span className="min-w-0 flex-1 text-mute">Transcrição pronta. Revise antes de enviar.</span>
            <Button
              type="button"
              onClick={() => {
                setTexto("");
                setOrigemRascunho("texto");
                setErro(null);
                campo.current?.focus();
              }}
              variant="ghost"
              size="sm"
              className="shrink-0 rounded-full font-medium text-paper"
            >
              Descartar
            </Button>
          </div>
        ) : null}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(texto, origemRascunho);
          }}
        >
          <textarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void enviar(texto, origemRascunho);
              }
            }}
            rows={1}
            placeholder="Escreva aqui…"
            className="field-control max-h-28 min-h-[48px] w-auto flex-1 resize-none rounded-[12px] py-3 text-sm"
          />
          {voz.suportado ? (
            <Button
              type="button"
              onClick={() => (voz.estado === "gravando" ? voz.parar() : void voz.iniciar())}
              disabled={enviando || voz.estado === "processando"}
              aria-label={
                voz.estado === "gravando"
                  ? "Parar e enviar o comando de voz"
                  : voz.estado === "processando"
                    ? "Entendendo o comando de voz"
                    : "Falar um comando"
              }
              aria-pressed={voz.estado === "gravando"}
              variant="outline"
              size="icon"
              className={`h-12 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${
                voz.estado === "gravando"
                  ? "border-brick bg-brick/15 text-brick"
                  : "border-line2 bg-[var(--figaro-surface-container-low,var(--ink))] text-mute hover:border-gold/40 hover:text-paper"
              }`}
            >
              {voz.estado === "processando" ? (
                <IndicadorDeCarregamento tamanho={20} decorativo className="text-current" />
              ) : voz.estado === "gravando" ? (
                <Square size={15} fill="currentColor" aria-hidden />
              ) : (
                <Mic size={17} aria-hidden />
              )}
            </Button>
          ) : null}
          <Button
            type="submit"
            aria-label="Enviar"
            disabled={enviando || !texto.trim()}
            variant="primary"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-full disabled:opacity-40"
          >
            <Send size={17} aria-hidden />
          </Button>
        </form>
      </div>
    </FolhaCortai>
  );
}
