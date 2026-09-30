import { CalendarDays, Check, Clock3, Image as ImageIcon, Pencil, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { ChatHeader, ChatShell, TypingIndicator } from "@/components/chat/ChatShell";
import { brl } from "@/lib/format";
import { mascaraTelefone } from "@/lib/previa";
import type { AgendaPublica } from "@/lib/agendamento-publico.functions";
import { agendamentoStyle } from "@/lib/pagina-config";

type ServicoSelecionavel = {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
  profissional_ids?: string[] | null;
  foto_url?: string | null;
};

type Selecao = {
  servicoId: string | null;
  setServicoId: (id: string | null) => void;
  servico: ServicoSelecionavel | null;
  profissionalId: string;
  setProfissionalId: (id: string) => void;
  aptos: { id: string; nome: string; avatar_url?: string | null }[];
  dias: string[];
  dia: string | null;
  setDia: (dia: string | null) => void;
  porDia: Map<
    string,
    { fechado: boolean; opcoes: { iso: string; label: string; profId: string }[] }
  >;
  agenda:
    { fechado: boolean; opcoes: { iso: string; label: string; profId: string }[] } | undefined;
  inicio: string | null;
  setInicio: (inicio: string | null) => void;
  escolhido: { iso: string; label: string; profId: string } | null;
};

function Typing() {
  return <TypingIndicator />;
}

function Fala({ children, cliente = false }: { children: React.ReactNode; cliente?: boolean }) {
  return (
    <Message from={cliente ? "user" : "assistant"} className="chat-enter">
      <MessageContent
        className={
          cliente
            ? "!rounded-[24px_24px_8px_24px] !bg-primary px-4 py-3 font-semibold !text-primary-foreground"
            : "chat-bolha-ia px-4 py-3 text-[15px] leading-relaxed"
        }
      >
        {children}
      </MessageContent>
    </Message>
  );
}

export function AgendamentoChat({
  data,
  selecao,
  nome,
  telefone,
  setNome,
  setTelefone,
  confirmar,
  conflito,
  alterarConflito,
  enviando,
  erro,
}: {
  data: AgendaPublica;
  selecao: Selecao;
  nome: string;
  telefone: string;
  setNome: (value: string) => void;
  setTelefone: (value: string) => void;
  confirmar: () => void;
  conflito: { agendamentoId: string; hora: string } | null;
  alterarConflito: () => void;
  enviando: boolean;
  erro: string | null;
}) {
  const [identificado, setIdentificado] = useState(false);
  const [profissionalEscolhido, setProfissionalEscolhido] = useState(false);
  const [diaEscolhido, setDiaEscolhido] = useState(false);
  const [digitando, setDigitando] = useState(true);
  const nomeRef = useRef<HTMLInputElement>(null);
  const chat = data.pagina.chat;
  const {
    servicoId,
    setServicoId,
    servico,
    profissionalId,
    setProfissionalId,
    aptos,
    dias,
    dia,
    setDia,
    porDia,
    agenda,
    inicio,
    setInicio,
    escolhido,
  } = selecao;
  const etapa = !identificado
    ? "identidade"
    : !servico
      ? "servico"
      : !profissionalEscolhido
        ? "profissional"
        : !diaEscolhido || !dia
          ? "dia"
          : !escolhido
            ? "horario"
            : "confirmacao";

  useEffect(() => {
    setDigitando(true);
    const id = window.setTimeout(() => setDigitando(false), 500);
    return () => window.clearTimeout(id);
  }, [etapa]);
  useEffect(() => {
    if (!identificado) nomeRef.current?.focus();
  }, [identificado]);

  const local = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      timeZone: data.tenant.fuso,
    });
  const proNome = escolhido
    ? data.profissionais.find((p) => p.id === escolhido.profId)?.nome
    : null;
  const validarIdentidade = () =>
    identificado || (nome.trim().length >= 2 && telefone.replace(/\D/g, "").length >= 10);

  return (
    <ChatShell
      capaUrl={data.tenant.capaUrl}
      style={agendamentoStyle(data.pagina)}
      header={
        <ChatHeader
          nome={data.tenant.nome}
          avatarUrl={chat.avatarUrl || data.tenant.logoUrl}
          detalhe={`${chat.nomeRecepcao} · recepção digital`}
        />
      }
    >
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-[620px] gap-5 px-4 py-6 sm:px-6">
          <Fala>{chat.mensagemInicial}</Fala>
          {identificado ? <Fala cliente>Sou {nome.trim()}.</Fala> : null}
          {identificado ? (
            <Fala>Prazer, {nome.trim().split(" ")[0]}. Vamos escolher seu atendimento.</Fala>
          ) : null}
          {servico ? <Fala cliente>{servico.nome}</Fala> : null}
          {servico ? <Fala>Ótima escolha. Você prefere alguém específico?</Fala> : null}
          {servico && profissionalEscolhido ? (
            <Fala cliente>
              {profissionalId === "qualquer"
                ? "Não tenho preferência"
                : aptos.find((p) => p.id === profissionalId)?.nome}
            </Fala>
          ) : null}
          {dia ? <Fala cliente>Dia {local(`${dia}T12:00:00Z`)}</Fala> : null}
          {escolhido ? <Fala cliente>{escolhido.label}</Fala> : null}
          {digitando ? (
            <Fala>
              <Typing />
            </Fala>
          ) : null}

          {!digitando && etapa === "identidade" ? (
            <Fala>
              <p className="mb-3">Antes de começar, como posso chamar você?</p>
              <div className="grid gap-3">
                <input
                  ref={nomeRef}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoComplete="name"
                  placeholder="Seu nome"
                  className="h-12 rounded-lg border border-line2 bg-ink2 px-4 text-paper outline-none"
                />
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="WhatsApp com DDD"
                  className="h-12 rounded-lg border border-line2 bg-ink2 px-4 text-paper outline-none"
                />
                <Button
                  className="h-12"
                  disabled={!validarIdentidade()}
                  onClick={() => setIdentificado(true)}
                >
                  Continuar
                </Button>
              </div>
            </Fala>
          ) : null}

          {!digitando && etapa === "servico" ? (
            <Fala>
              <p className="mb-3">Qual serviço você quer agendar?</p>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {data.servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="chat-card-servico w-40 shrink-0 snap-start text-left"
                    onClick={() => setServicoId(s.id)}
                  >
                    <span className="grid aspect-[4/5] w-full place-items-center overflow-hidden bg-ink3">
                      {s.foto_url ? (
                        <img
                          src={s.foto_url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="text-mute2" />
                      )}
                    </span>
                    <span className="block p-3">
                      <strong className="block truncate text-sm font-extrabold text-paper">
                        {s.nome}
                      </strong>
                      <span className="mt-1 flex items-center justify-between text-xs text-mute">
                        <span className="flex items-center gap-1">
                          <Clock3 size={12} />
                          {s.duracao_min} min
                        </span>
                        <span className="font-extrabold text-paper">{brl(s.preco_centavos)}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </Fala>
          ) : null}

          {!digitando && etapa === "profissional" ? (
            <Fala>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-14 justify-start"
                  onClick={() => {
                    setProfissionalId("qualquer");
                    setProfissionalEscolhido(true);
                    setDia(null);
                    setDiaEscolhido(false);
                  }}
                >
                  <UserRound />
                  Não tenho preferência
                </Button>
                {aptos.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="h-14 justify-start"
                    onClick={() => {
                      setProfissionalId(p.id);
                      setProfissionalEscolhido(true);
                      setDia(null);
                      setDiaEscolhido(false);
                    }}
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-ink3">
                        {p.nome[0]}
                      </span>
                    )}
                    {p.nome}
                  </Button>
                ))}
              </div>
            </Fala>
          ) : null}

          {!digitando && etapa === "dia" ? (
            <Fala>
              <p className="mb-3">Qual dia fica melhor?</p>
              <div className="flex max-w-full snap-x gap-2 overflow-x-auto pb-2">
                {dias.map((d) => {
                  const livre = (porDia.get(d)?.opcoes.length ?? 0) > 0;
                  return (
                    <Button
                      key={d}
                      variant="outline"
                      className="h-16 min-w-20 shrink-0 snap-start flex-col"
                      disabled={!livre}
                      onClick={() => {
                        setDia(d);
                        setDiaEscolhido(true);
                      }}
                    >
                      <CalendarDays size={15} />
                      {local(`${d}T12:00:00Z`)}
                      {!livre ? <small>Lotado</small> : null}
                    </Button>
                  );
                })}
              </div>
            </Fala>
          ) : null}

          {!digitando && etapa === "horario" ? (
            <Fala>
              {agenda?.opcoes.length ? (
                <>
                  <p className="mb-3">Encontrei estes horários:</p>
                  {(
                    [
                      ["Manhã", 0, 12],
                      ["Tarde", 12, 18],
                      ["Noite", 18, 24],
                    ] as const
                  ).map(([rotulo, de, ate]) => {
                    const grupo = agenda.opcoes.filter((o) => {
                      const h = Number(o.label.slice(0, 2));
                      return h >= de && h < ate;
                    });
                    if (!grupo.length) return null;
                    return (
                      <div key={rotulo} className="mb-3 last:mb-0">
                        <p className="mb-2 text-xs font-bold uppercase tracking-[.12em] text-mute">
                          {rotulo}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {grupo.map((o, i) => (
                            <Button
                              key={o.iso}
                              variant="outline"
                              className="chat-slot h-12 font-bold"
                              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                              onClick={() => setInicio(o.iso)}
                            >
                              {o.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div>
                  <p>Este dia ficou lotado. Posso procurar o próximo dia com vaga.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dias
                      .filter((d) => d !== dia && (porDia.get(d)?.opcoes.length ?? 0) > 0)
                      .slice(0, 3)
                      .map((d) => (
                        <Button
                          key={d}
                          variant="outline"
                          className="h-12"
                          onClick={() => {
                            setDia(d);
                            setDiaEscolhido(true);
                          }}
                        >
                          {local(`${d}T12:00:00Z`)}
                        </Button>
                      ))}
                  </div>
                  {data.tenant.usaListaDeEspera && chat.listaEspera ? (
                    <Button asChild variant="ghost" className="mt-2 h-12 w-full">
                      <a href={`/f/${data.tenant.slug}`}>Entrar na lista de espera</a>
                    </Button>
                  ) : null}
                </div>
              )}
            </Fala>
          ) : null}

          {!digitando && etapa === "confirmacao" && servico && escolhido ? (
            <Fala>
              <p className="text-base font-extrabold">Posso confirmar?</p>
              <div className="chat-ingresso mt-3">
                <div className="px-4 pb-3 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[.14em] text-primary">
                    {data.tenant.nome}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{servico.nome}</p>
                  <p className="text-sm text-mute">{proNome ?? "Profissional disponível"}</p>
                </div>
                <div className="chat-ingresso-corte" aria-hidden />
                <dl className="grid grid-cols-2 gap-3 px-4 pb-4 pt-3">
                  {[
                    ["Data", local(escolhido.iso)],
                    ["Horário", escolhido.label],
                    ["Duração", `${servico.duracao_min} min`],
                    ["Valor", brl(servico.preco_centavos)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-mute">{k}</dt>
                      <dd className="font-extrabold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setInicio(null);
                  }}
                >
                  <Pencil />
                  Horário
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setInicio(null);
                    setDia(null);
                    setDiaEscolhido(false);
                  }}
                >
                  Dia
                </Button>
                <Button className="col-span-2 h-12" disabled={enviando} onClick={confirmar}>
                  <Check />
                  {enviando ? "Confirmando…" : "Confirmar"}
                </Button>
              </div>
              <Button
                variant="ghost"
                className="mt-2 h-12 w-full"
                onClick={() => {
                  setInicio(null);
                  setDia(null);
                  setDiaEscolhido(false);
                  setProfissionalEscolhido(false);
                }}
              >
                Trocar profissional
              </Button>
            </Fala>
          ) : null}
          {erro ? (
            <Fala>
              <p className="text-brick" role="alert">
                Não consegui concluir: {erro}
              </p>
              <Button variant="outline" className="mt-3 h-12" onClick={confirmar}>
                Tentar novamente
              </Button>
            </Fala>
          ) : null}
          {conflito ? (
            <Fala>
              <p role="alert">Você já tem um horário às {conflito.hora} nesse dia.</p>
              <Button
                variant="outline"
                className="mt-3 h-12 w-full"
                disabled={enviando}
                onClick={alterarConflito}
              >
                Alterar esse horário
              </Button>
            </Fala>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton aria-label="Ir para a mensagem mais recente" />
      </Conversation>
    </ChatShell>
  );
}
