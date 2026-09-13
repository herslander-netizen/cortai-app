import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Send, X } from "lucide-react";

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

  const { data } = useQuery({ queryKey: ["assistente-conversa"], queryFn: () => getConversaDoAssistente() });

  useEffect(() => {
    if (!data) return;
    setConversaId(data.conversaId);
    setMensagens((atual) => (atual.length ? atual : data.mensagens));
  }, [data]);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [mensagens, enviando]);

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
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/60 backdrop-blur-sm md:items-stretch">
      <button type="button" aria-label="Fechar" className="absolute inset-0" onClick={onFechar} />
      <section
        role="dialog"
        aria-label="Assistente do Cortaí"
        className="relative flex h-[86vh] w-full flex-col rounded-t-2xl border border-line2 bg-ink2 md:h-full md:max-w-[420px] md:rounded-none md:rounded-l-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-paper">✨ Perguntar ao Cortaí</p>
            <p className="mt-0.5 text-xs text-mute">Cadastre serviços, ajuste horários e tire dúvidas.</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar assistente" className="text-mute">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
                    className="w-full rounded-xl border border-line2 px-4 py-3 text-left text-xs text-paper"
                    onClick={() => void enviar(a)}
                  >
                    {a}
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

          <ul className="space-y-4">
            {mensagens.map((m) => (
              <li key={m.id} className={m.autor === "barbeiro" ? "flex justify-end" : ""}>
                {m.autor === "barbeiro" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-gold px-4 py-2.5 text-sm text-ink">
                    {m.conteudo}
                  </p>
                ) : (
                  <div className="max-w-full">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-paper">{m.conteudo}</p>
                    {m.acao ? <PreviaDaAcao acao={m.acao} onConfirmado={() => undefined} /> : null}
                    {m.acao?.destino ? (
                      <Link
                        to={m.acao.destino as "/barbeiro"}
                        onClick={onFechar}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line2 px-3.5 py-1.5 text-xs text-gold"
                      >
                        {m.acao.rotuloDoDestino ?? "Abrir"}
                        <ArrowRight size={13} aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {enviando ? <p className="mt-4 animate-pulse text-sm text-mute">Pensando…</p> : null}
          {erro ? <p className="mt-4 text-sm text-brick">{erro}</p> : null}
          <div ref={fim} />
        </div>

        <form
          className="flex items-end gap-2 border-t border-line px-4 py-3"
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
            rows={2}
            placeholder="Escreva aqui…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-line2 bg-ink px-3.5 py-2.5 text-sm text-paper outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={enviando || !texto.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink disabled:opacity-50"
          >
            <Send size={17} aria-hidden />
          </button>
        </form>
      </section>
    </div>
  );
}
