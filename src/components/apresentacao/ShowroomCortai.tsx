import { TabelaDePlanos } from "@/components/planos/TabelaDePlanos";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  MessageCircle,
  Plus,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { ChatHeader } from "@/components/chat/ChatShell";
import { useWhatsappAlvo } from "@/components/layout/Signature";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { SEGMENTOS_CONFIG, type Segmento } from "@/lib/segmentos";

export type EtapaShowroom = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const OPCOES: Array<{ id: Segmento; rotulo: string }> = [
  { id: "barbearia", rotulo: "Barbearia" },
  { id: "salao", rotulo: "Salão" },
  { id: "esmalteria", rotulo: "Nail designer" },
  { id: "estetica", rotulo: "Estética" },
  { id: "outro", rotulo: "Outro" },
];
const DIA = "2026-09-30";
const AGORA = new Date("2026-09-30T13:18:00.000Z").getTime();

function itens(segmento: Segmento): AgendaItem[] {
  const s = SEGMENTOS_CONFIG[segmento].servicosSugeridos;
  const base = (
    id: string,
    inicio: string,
    fim: string,
    cliente: string,
    indice: number,
  ): AgendaItem => ({
    id,
    inicio,
    fim,
    cliente,
    clienteId: null,
    telefone: null,
    profissional: "Alex",
    servico: s[indice]?.nome ?? "Atendimento",
    duracaoMin: 45,
    valor_centavos: s[indice]?.precoCentavos ?? 4500,
    forma_pagamento: null,
    ficha: null,
    arrivedAt: null,
    startedAt: null,
    finishedAt: null,
    status: "agendado",
  });
  return [
    {
      ...base("agora", "2026-09-30T13:00:00.000Z", "2026-09-30T13:45:00.000Z", "Marina Costa", 0),
      status: "na_cadeira",
      arrivedAt: "2026-09-30T12:56:00.000Z",
      startedAt: "2026-09-30T13:00:00.000Z",
      ficha: "Prefere acabamento leve, como no último atendimento.",
    },
    {
      ...base("proximo", "2026-09-30T14:00:00.000Z", "2026-09-30T14:45:00.000Z", "Rafa Lima", 1),
      status: "confirmado",
    },
    base("depois", "2026-09-30T15:15:00.000Z", "2026-09-30T16:00:00.000Z", "Ana Souza", 2),
  ];
}

function Topo({ etapa, voltar }: { etapa: EtapaShowroom; voltar: () => void }) {
  const n = Math.min(6, Math.max(1, etapa - 1));
  return (
    <header className="showroom-header">
      <div className="showroom-header-inner">
        {etapa ? (
          <Button variant="ghost" size="sm" onClick={voltar}>
            <ArrowLeft /> Voltar
          </Button>
        ) : (
          <MarcaCortai variante="escura" className="h-auto w-24" prioridade />
        )}
        <span className="showroom-header-title">
          Cortaí <i /> Conheça conversando
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sair</Link>
        </Button>
      </div>
      {etapa >= 2 && (
        <div className="showroom-progress" aria-label={`Etapa ${n} de 6`}>
          <span style={{ width: `${(n / 6) * 100}%` }} />
          <small>{String(n).padStart(2, "0")} / 06</small>
        </div>
      )}
    </header>
  );
}

function Agenda({ segmento }: { segmento: Segmento }) {
  const agenda = useMemo(() => itens(segmento), [segmento]);
  return (
    <div className="showroom-produto showroom-agenda" aria-label="Demonstração da Agenda Cortaí">
      <div className="showroom-produto-topo">
        <span>
          <small>Agenda</small>
          <strong>Hoje · qua., 30 de set.</strong>
        </span>
        <em>Ao vivo</em>
      </div>
      <AgendaTimeline
        dia={DIA}
        fuso="America/Sao_Paulo"
        agora={AGORA}
        itens={agenda}
        horarios={[{ diaSemana: 3, fechado: false, abre: "09:00", fecha: "18:00" }]}
        selecionado={null}
        onSelecionar={() => undefined}
        renderStatus={(status) => <StatusBadge status={status} segmento={segmento} />}
        alinhado
      />
    </div>
  );
}

function Foco({ segmento }: { segmento: Segmento }) {
  const agenda = itens(segmento);
  const [atual, proximo] = agenda;
  if (!atual || !proximo) return null;
  return (
    <div className="showroom-produto showroom-foco-demo" aria-label="Demonstração do Modo Foco">
      <div className="showroom-produto-topo">
        <span>
          <small>Modo Foco · Hoje</small>
          <strong>2 restantes · 1 concluído</strong>
        </span>
        <em>Ao vivo</em>
      </div>
      <div className="showroom-foco-estado">
        <span>EM ATENDIMENTO</span>
        <small>
          <Clock3 /> 18 min
        </small>
      </div>
      <div className="showroom-foco-cliente">
        <time>13:00</time>
        <UserRound />
        <span>
          <strong>{atual.cliente}</strong>
          <small>
            {atual.servico} · {atual.duracaoMin} min
          </small>
        </span>
      </div>
      <p className="showroom-foco-nota">{atual.ficha}</p>
      <Button size="lg">
        Finalizar atendimento <Check />
      </Button>
      <div className="showroom-proximo">
        <small>Próximo · 14:00</small>
        <strong>{proximo.cliente}</strong>
        <span>{proximo.servico}</span>
      </div>
    </div>
  );
}

function Cliente({ segmento }: { segmento: Segmento }) {
  const s = SEGMENTOS_CONFIG[segmento].servicosSugeridos[0];
  return (
    <div
      className="showroom-produto showroom-cliente"
      aria-label="Demonstração do histórico de cliente"
    >
      <div className="showroom-cliente-identidade">
        <span>MC</span>
        <div>
          <small>Cliente recorrente</small>
          <strong>Marina Costa</strong>
          <em>8 atendimentos</em>
        </div>
      </div>
      <dl>
        <div>
          <dt>Última visita</dt>
          <dd>18 de set.</dd>
        </div>
        <div>
          <dt>Profissional</dt>
          <dd>Alex</dd>
        </div>
        <div>
          <dt>Serviço</dt>
          <dd>{s?.nome ?? "Atendimento"}</dd>
        </div>
      </dl>
      <div className="showroom-anotacao">
        <small>Preferência registrada</small>
        <p>Acabamento leve, como no último atendimento.</p>
      </div>
      {["18 set.", "22 ago."].map((data) => (
        <div className="showroom-historico" key={data}>
          <time>{data}</time>
          <span>
            <strong>{s?.nome ?? "Atendimento"}</strong>
            <small>Concluído · Alex</small>
          </span>
          <b>{brl(s?.precoCentavos ?? 4500)}</b>
        </div>
      ))}
    </div>
  );
}

function Balao({ cliente, children }: { cliente?: boolean; children: ReactNode }) {
  return (
    <Message from={cliente ? "user" : "assistant"}>
      <MessageContent className={cliente ? "showroom-chat-cliente" : "showroom-chat-cortai"}>
        {children}
      </MessageContent>
    </Message>
  );
}
function Secretaria({ segmento }: { segmento: Segmento }) {
  const servico = SEGMENTOS_CONFIG[segmento].servicosSugeridos[0]?.nome ?? "Atendimento";
  return (
    <div className="showroom-chat" aria-label="Demonstração da Secretária Cortaí">
      <ChatHeader nome="Cortaí" detalhe="Seu negócio" status="Online" />
      <Conversation>
        <ConversationContent className="gap-4 p-4">
          <Balao>Oi! Eu organizo seu agendamento por aqui. O que você procura?</Balao>
          <Balao cliente>Quero marcar um horário.</Balao>
          <Balao>Claro. Vamos começar pelo atendimento.</Balao>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">{servico}</Button>
            <Button variant="outline">Ver outros</Button>
          </div>
          <p className="showroom-chat-nota">
            <Check /> Demonstração: nenhuma reserva será criada.
          </p>
        </ConversationContent>
      </Conversation>
      <div className="chat-assinatura">By Alvo Digital • Cortaí</div>
    </div>
  );
}

function Caixa({ segmento }: { segmento: Segmento }) {
  const s = SEGMENTOS_CONFIG[segmento].servicosSugeridos[0];
  const valor = s?.precoCentavos ?? 4500;
  return (
    <div className="showroom-produto showroom-caixa" aria-label="Demonstração da comanda">
      <div className="showroom-produto-topo">
        <span>
          <small>Comanda #128</small>
          <strong>Marina Costa</strong>
        </span>
        <StatusBadge status="aguardando_pagamento" />
      </div>
      <div className="showroom-fluxo">
        <span>
          <Check /> Atendimento
        </span>
        <i />
        <span>
          <ReceiptText /> Comanda
        </span>
        <i />
        <span>
          <CreditCard /> Pagamento
        </span>
      </div>
      <div className="showroom-caixa-item">
        <span>
          <strong>{s?.nome ?? "Atendimento"}</strong>
          <small>1 serviço</small>
        </span>
        <b>{brl(valor)}</b>
      </div>
      <Button variant="outline">
        <Plus /> Adicionar serviço ou produto
      </Button>
      <div className="showroom-total">
        <span>Total</span>
        <strong>{brl(valor)}</strong>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary">Pix</Button>
        <Button variant="secondary">Cartão</Button>
        <Button variant="secondary">Dinheiro</Button>
      </div>
    </div>
  );
}

export function ShowroomCortai({ etapa, segmento }: { etapa: EtapaShowroom; segmento: Segmento }) {
  const navigate = useNavigate({ from: "/apresentacao" });
  const contato = useWhatsappAlvo();
  const [chat, setChat] = useState(false);
  const ir = (e: EtapaShowroom, s = segmento) =>
    void navigate({ search: { etapa: e, segmento: s } });
  const voltar = () => etapa && ir((etapa - 1) as EtapaShowroom);
  const avancar = () => ir(Math.min(7, etapa + 1) as EtapaShowroom);
  const config = SEGMENTOS_CONFIG[segmento];
  return (
    <main className="showroom-page light">
      <Topo etapa={etapa} voltar={voltar} />
      {etapa === 0 && (
        <section className="showroom-entrada">
          <MarcaCortai variante="escura" className="h-auto w-40" prioridade />
          <div>
            <p>Conheça o Cortaí</p>
            <h1>Quer descobrir como deixar seu negócio mais organizado?</h1>
            <strong>Eu posso te mostrar.</strong>
          </div>
          <Button size="lg" onClick={() => ir(1)}>
            Começar <ArrowRight />
          </Button>
          <p className="showroom-pistas">
            Agenda <i /> Clientes <i /> Secretária <i /> Caixa
          </p>
        </section>
      )}
      {etapa === 1 && (
        <section className="showroom-escolha">
          <div className="showroom-avatar">
            <MessageCircle />
          </div>
          <small>Cortaí</small>
          <h1>Qual é o seu negócio?</h1>
          <p>Vou adaptar os exemplos desta conversa. Nada será salvo.</p>
          <div>
            {OPCOES.map((o) => (
              <Button key={o.id} variant="outline" onClick={() => ir(2, o.id)}>
                {o.rotulo}
                <ArrowRight />
              </Button>
            ))}
          </div>
        </section>
      )}
      {etapa >= 2 && etapa <= 6 && (
        <section className="showroom-cena">
          <div className="showroom-cena-copy">
            <small>{config.rotulo} · Demonstração</small>
            {etapa === 2 && (
              <>
                <h1>Sua agenda fica organizada em um só lugar.</h1>
                <p>Horários, clientes e andamento do dia aparecem em uma leitura rápida.</p>
                <Button
                  variant="outline"
                  onClick={() =>
                    document
                      .querySelector(".showroom-agenda")
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                >
                  <CalendarDays /> Ver agenda
                </Button>
              </>
            )}
            {etapa === 3 && (
              <>
                <em>Agora imagine que você está atendendo.</em>
                <h1>Você olha e sabe exatamente o que precisa fazer agora.</h1>
                <p>O atendimento atual domina a tela. O próximo passo continua claro.</p>
              </>
            )}
            {etapa === 4 && (
              <>
                <h1>Cada atendimento também constrói o histórico do seu cliente.</h1>
                <p>Preferências, serviços e retornos ficam no contexto certo.</p>
              </>
            )}
            {etapa === 5 && (
              <>
                <em>Enquanto você atende, sua Secretária pode cuidar dos agendamentos.</em>
                <h1>Você conhece o Cortaí conversando com o Cortaí.</h1>
                <Button variant="outline" onClick={() => setChat(!chat)}>
                  <MessageCircle /> {chat ? "Ocultar conversa" : "Abrir conversa"}
                </Button>
              </>
            )}
            {etapa === 6 && (
              <>
                <em>Terminou o atendimento?</em>
                <h1>Atendimento, comanda e pagamento seguem o mesmo fluxo.</h1>
                <p>Sem perder o contexto do cliente.</p>
              </>
            )}
          </div>
          <div className="showroom-cena-produto">
            {etapa === 2 && <Agenda segmento={segmento} />}
            {etapa === 3 && <Foco segmento={segmento} />}
            {etapa === 4 && <Cliente segmento={segmento} />}
            {etapa === 5 &&
              (chat ? (
                <Secretaria segmento={segmento} />
              ) : (
                <button className="showroom-chat-fechado" onClick={() => setChat(true)}>
                  <span>
                    <MessageCircle />
                  </span>
                  <strong>Secretária Cortaí</strong>
                  <small>Toque para conversar</small>
                </button>
              ))}
            {etapa === 6 && <Caixa segmento={segmento} />}
          </div>
          <div className="showroom-avancar">
            <Button size="lg" onClick={avancar}>
              Continuar <ArrowRight />
            </Button>
          </div>
        </section>
      )}
      {etapa === 7 && (
        <section className="showroom-final">
          <div className="showroom-avatar">
            <Check />
          </div>
          <p>Você acabou de conhecer o Cortaí por dentro.</p>
          <h1>Quer colocar isso para funcionar no seu negócio?</h1>
          <div>
            <Button asChild size="lg">
              <Link to="/login" search={{ proximo: "/comecar" }}>
                Quero experimentar <ArrowRight />
              </Link>
            </Button>
            {contato ? (
              <Button asChild variant="outline" size="lg">
                <a href={contato} target="_blank" rel="noopener noreferrer">
                  Quero falar com alguém
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link to="/privacidade">Quero falar com alguém</Link>
              </Button>
            )}
            {contato ? (
              <Button asChild variant="ghost" size="lg">
                <a href={contato} target="_blank" rel="noopener noreferrer">
                  Tenho uma dúvida
                </a>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="lg">
                <Link to="/privacidade">Tenho uma dúvida</Link>
              </Button>
            )}
          </div>
          <section className="showroom-planos" aria-labelledby="showroom-planos-titulo">
            <h2 id="showroom-planos-titulo">Escolha como começar</h2>
            <TabelaDePlanos />
          </section>
          <Button variant="text" onClick={() => ir(0)}>
            Ver de novo
          </Button>
        </section>
      )}
      <footer className="showroom-footer">
        By Alvo Digital <i /> Cortaí
      </footer>
    </main>
  );
}
