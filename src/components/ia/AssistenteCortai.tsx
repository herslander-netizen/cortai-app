import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Send, X } from "lucide-react";

import { AgendarNoChat } from "./AgendarNoChat";
import { BigodeCortai } from "./BigodeCortai";
import { Digitando } from "./Digitando";
import { FolhaCortai } from "./FolhaCortai";
import { useProgressoCortai } from "./useProgressoCortai";

import { brl } from "@/lib/format";
import { DIAS_DA_SEMANA, type RespostaDoAssistente } from "@/lib/ia/assistente";
import {
  confirmarAcaoDaIa,
  getConversaDoAssistente,
  perguntarAoCortai,
  type TurnoDaConversa,
} from "@/lib/assistente.functions";

const ATALHOS = [
  "Tenho corte 35, barba 25 e combo 50",
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
    <div className="flex items-center gap-2.5 border-b border-line px-5 pb-2.5">
      <span className="shrink-0 text-[11px] text-mute2">
        Configuração · {progresso.feitos}/{progresso.total}
      </span>
      <span className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-full bg-ink3">
        <span
          className="block h-full rounded-full bg-gold transition-[width] duration-500"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </span>
      {progresso.feitos > 0 ? (
        <Check size={12} className="shrink-0 text-sage" aria-hidden />
      ) : null}
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
    <div className="mt-3 rounded-xl border border-line2 bg-ink px-4 py-4">
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
              <span className="text-xs text-mute">{h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`}</span>
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
          <button
            type="button"
            className="btn-primary mt-3 w-full py-2.5 text-sm"
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
          </button>
          {erro ? <p className="mt-2 text-xs text-brick">{erro}</p> : null}
        </>
      )}
    </div>
  );
}

export function AssistenteCortai({ onFechar }: { onFechar: () => void }) {
  const perguntar = useServerFn(perguntarAoCortai);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<TurnoDaConversa[]>([]);
  const fim = useRef<HTMLDivElement | null>(null);
  const campo = useRef<HTMLTextAreaElement | null>(null);
  const lista = useRef<HTMLDivElement | null>(null);
  const noFim = useRef(true);
  const [novaMensagem, setNovaMensagem] = useState(false);

  const { data } = useQuery({ queryKey: ["assistente-conversa"], queryFn: () => getConversaDoAssistente() });

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
    campo.current?.focus();
  }, []);

  async function enviar(mensagem: string) {
    const limpo = mensagem.trim();
    if (!limpo || enviando) return;
    setTexto("");
    setErro(null);
    setEnviando(true);
    setMensagens((atual) => [
      ...atual,
      { id: `local-${Date.now()}`, autor: "barbeiro", conteudo: limpo, acao: null },
    ]);
    try {
      const r = await perguntar({ data: { mensagem: limpo, conversaId } });
      setConversaId(r.conversaId);
      setMensagens((atual) => [
        ...atual,
        { id: `ia-${Date.now()}`, autor: "assistente", conteudo: r.resposta.resposta, acao: r.resposta },
      ]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "O assistente não respondeu agora.");
    } finally {
      setEnviando(false);
      campo.current?.focus();
    }
  }

  return (
    <FolhaCortai
      aoFechar={onFechar}
      rotulo="CortAI"
      cabecalho={
        <>
          <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-line bg-ink2 px-5 pb-2.5 pt-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-ink"
              aria-hidden
            >
              <BigodeCortai size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold tracking-wide text-paper">CortAI</span>
              <span className="block truncate text-[10px] uppercase tracking-[.12em] text-mute2">
                Alimentada pela Alvo IA
              </span>
            </span>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar CortAI"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line2 text-mute transition-colors hover:border-gold/40 hover:text-paper"
            >
              <X size={16} />
            </button>
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
              <div className="mt-3 space-y-2">
                {ATALHOS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line2 bg-ink px-4 py-3 text-left text-xs text-paper transition-colors hover:border-gold/40"
                    onClick={() => void enviar(a)}
                  >
                    <span className="min-w-0">{a}</span>
                    <ArrowRight size={13} className="shrink-0 text-gold/70" aria-hidden />
                  </button>
                ))}
              </div>
              {data && !data.disponivel ? (
                <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-3 text-xs text-mute2">
                  O assistente ainda não está ligado neste ambiente. As respostas vão indicar isso com clareza.
                </p>
              ) : null}
            </div>
          ) : null}

          <ul className="space-y-3.5">
            {mensagens.map((m) => (
              <li key={m.id} className={m.autor === "barbeiro" ? "flex justify-end" : "flex gap-2.5"}>
                {m.autor === "barbeiro" ? (
                  <p className="max-w-[85%] min-w-0 break-words rounded-2xl rounded-br-md border border-gold/25 bg-gold/10 px-4 py-2.5 text-sm leading-relaxed text-paper">
                    {m.conteudo}
                  </p>
                ) : (
                  <>
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold-soft text-gold"
                      aria-hidden
                    >
                      <BigodeCortai size={15} />
                    </span>
                    <div className="min-w-0 max-w-[88%]">
                      <div className="rounded-2xl rounded-bl-md border border-line bg-ink px-4 py-3">
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-paper">
                          {m.conteudo}
                        </p>
                        {m.acao ? <PreviaDaAcao acao={m.acao} onConfirmado={() => undefined} /> : null}
                      </div>
                      {m.acao?.destino ? (
                        <Link
                          to={m.acao.destino as "/barbeiro"}
                          onClick={onFechar}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-ink transition-opacity hover:opacity-90"
                        >
                          {m.acao.rotuloDoDestino ?? "Abrir"}
                          <ArrowRight size={13} aria-hidden />
                        </Link>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>

          {enviando ? (
            <div className="mt-3.5 flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold-soft text-gold"
                aria-hidden
              >
                <BigodeCortai size={15} />
              </span>
              <span className="rounded-2xl rounded-bl-md border border-line bg-ink px-3.5 py-2.5">
                <Digitando />
              </span>
            </div>
          ) : null}
          {erro ? <p className="mt-4 text-sm text-brick">{erro}</p> : null}
          <div ref={fim} />
        </div>

        {novaMensagem ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => irAoFim()}
              className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full border border-gold/30 bg-ink px-3 py-1.5 text-[11px] text-paper shadow-lg"
            >
              Nova mensagem ↓
            </button>
          </div>
        ) : null}

        <div className="cortai-conversa-barra shrink-0 border-t border-line bg-ink2 px-4 pt-2.5">
          {mensagens.length > 0 ? (
            <div className="-mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={enviando}
                  onClick={() => void enviar(s)}
                  className="shrink-0 rounded-full border border-line2 bg-ink px-3.5 py-1.5 text-[11px] text-mute transition-colors hover:border-gold/40 hover:text-paper disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar(texto);
            }}
          >
            <textarea
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto);
                }
              }}
              rows={1}
              placeholder="Escreva aqui…"
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-line2 bg-ink px-4 py-3 text-sm text-paper outline-none transition-colors placeholder:text-mute2 focus:border-gold/45"
            />
            <button
              type="submit"
              aria-label="Enviar"
              disabled={enviando || !texto.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition-opacity disabled:opacity-40"
            >
              <Send size={17} aria-hidden />
            </button>
          </form>
        </div>
    </FolhaCortai>
  );
}
