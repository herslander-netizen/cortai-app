import { CalendarDays, Check, Clock3, Image as ImageIcon, Pencil, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { mascaraTelefone } from "@/lib/previa";
import type { AgendaPublica } from "@/lib/agendamento-publico.functions";

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
  return (
    <span className="inline-flex h-8 items-center gap-1" aria-label="Recepção digitando">
      <i className="chat-dot" />
      <i className="chat-dot" />
      <i className="chat-dot" />
    </span>
  );
}

function Fala({ children, cliente = false }: { children: React.ReactNode; cliente?: boolean }) {
  return (
    <Message from={cliente ? "user" : "assistant"} className="chat-enter">
      <MessageContent className={cliente ? "bg-primary text-primary-foreground" : undefined}>
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
  enviando: boolean;
  erro: string | null;
}) {
  const [identificado, setIdentificado] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [profissionalEscolhido, setProfissionalEscolhido] = useState(false);
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
        : !dia
          ? "dia"
          : !escolhido
            ? "horario"
            : "confirmacao";

  useEffect(() => {
    setDigitando(true);
    const id = window.setTimeout(() => setDigitando(false), 360);
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
    <main className="mx-auto flex h-[100dvh] w-full max-w-[760px] flex-col overflow-hidden bg-ink">
      <header className="flex min-h-16 items-center gap-3 border-b border-line px-4 sm:px-6">
        {chat.avatarUrl || data.tenant.logoUrl ? (
          <img
            src={chat.avatarUrl || data.tenant.logoUrl || ""}
            alt=""
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-gold-soft font-bold text-gold">
            {chat.nomeRecepcao.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-paper">{data.tenant.nome}</h1>
          <p className="text-xs text-mute">{chat.nomeRecepcao} · recepção digital</p>
        </div>
      </header>
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
              <div className="grid gap-3 sm:grid-cols-2">
                {data.servicos.map((s) => (
                  <Button
                    key={s.id}
                    variant="ghost"
                    className="h-auto min-h-28 justify-start overflow-hidden border border-line bg-ink2 p-0 text-left"
                    onClick={() => setServicoId(s.id)}
                  >
                    <span className="grid h-full w-24 shrink-0 place-items-center bg-ink3">
                      {s.foto_url ? (
                        <img src={s.foto_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="text-mute2" />
                      )}
                    </span>
                    <span className="min-w-0 p-3">
                      <strong className="block truncate text-paper">{s.nome}</strong>
                      <small className="mt-1 flex items-center gap-1 text-mute">
                        <Clock3 size={12} />
                        {s.duracao_min} min
                      </small>
                      <span className="mt-2 block font-semibold text-paper">
                        {brl(s.preco_centavos)}
                      </span>
                    </span>
                  </Button>
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
                      onClick={() => setDia(d)}
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
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {agenda.opcoes.map((o, i) => (
                      <Button
                        key={o.iso}
                        variant="outline"
                        className="chat-slot h-12"
                        style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                        onClick={() => setInicio(o.iso)}
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
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
                          onClick={() => setDia(d)}
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
              <p className="text-base font-semibold">Posso confirmar?</p>
              <dl className="mt-3 divide-y divide-line rounded-lg border border-line px-3">
                {[
                  ["Serviço", servico.nome],
                  ["Profissional", proNome ?? "Profissional disponível"],
                  ["Data", local(escolhido.iso)],
                  ["Horário", escolhido.label],
                  ["Valor", brl(servico.preco_centavos)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-mute">{k}</dt>
                    <dd className="text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setInicio(null);
                    setEditando("horário");
                  }}
                >
                  <Pencil />
                  Editar
                </Button>
                <Button className="h-12" disabled={enviando} onClick={confirmar}>
                  <Check />
                  {enviando ? "Confirmando…" : "Confirmar"}
                </Button>
              </div>
              {editando ? (
                <p className="mt-2 text-xs text-mute">Escolha outro {editando} acima.</p>
              ) : null}
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
        </ConversationContent>
        <ConversationScrollButton aria-label="Ir para a mensagem mais recente" />
      </Conversation>
    </main>
  );
}
