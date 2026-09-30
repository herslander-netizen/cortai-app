import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Focus,
  MessageCircle,
  Plus,
  ReceiptText,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { ChatHeader } from "@/components/chat/ChatShell";
import { useWhatsappAlvo } from "@/components/layout/Signature";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { TabelaDePlanos } from "@/components/planos/TabelaDePlanos";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { SEGMENTOS_CONFIG, type Segmento } from "@/lib/segmentos";
import { APRESENTACAO_PADRAO, type ConteudoApresentacao } from "@/lib/apresentacao-conteudo";

export type EtapaShowroom = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OPCOES: Array<{ id: Segmento; rotulo: string }> = [
  { id: "barbearia", rotulo: "Barbearias" },
  { id: "salao", rotulo: "Salões" },
  { id: "esmalteria", rotulo: "Nail designers" },
  { id: "estetica", rotulo: "Estética" },
  { id: "outro", rotulo: "Outros profissionais" },
];

const DIA = "2026-09-30";
const AGORA = new Date("2026-09-30T13:18:00.000Z").getTime();

function itens(segmento: Segmento): AgendaItem[] {
  const servicos = SEGMENTOS_CONFIG[segmento].servicosSugeridos;
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
    servico: servicos[indice]?.nome ?? "Atendimento",
    duracaoMin: 45,
    valor_centavos: servicos[indice]?.precoCentavos ?? 4500,
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
  const [atual, proximo] = itens(segmento);
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
  const servico = SEGMENTOS_CONFIG[segmento].servicosSugeridos[0];
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
          <dd>{servico?.nome ?? "Atendimento"}</dd>
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
            <strong>{servico?.nome ?? "Atendimento"}</strong>
            <small>Concluído · Alex</small>
          </span>
          <b>{brl(servico?.precoCentavos ?? 4500)}</b>
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
  const servico = SEGMENTOS_CONFIG[segmento].servicosSugeridos[0];
  const valor = servico?.precoCentavos ?? 4500;
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
          <strong>{servico?.nome ?? "Atendimento"}</strong>
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

const RECURSOS = [
  {
    icone: CalendarDays,
    titulo: "Agenda",
    texto: "Horários, equipe e andamento do dia em uma leitura rápida.",
  },
  {
    icone: UsersRound,
    titulo: "Clientes",
    texto: "Histórico, preferências e retornos no contexto certo.",
  },
  {
    icone: Focus,
    titulo: "Modo Foco",
    texto: "O atendimento atual e a próxima ação sem distrações.",
  },
  {
    icone: ReceiptText,
    titulo: "Comanda e Caixa",
    texto: "Do serviço ao pagamento em um fluxo só.",
  },
  {
    icone: MessageCircle,
    titulo: "Secretária",
    texto: "Agendamento e confirmações nos planos compatíveis.",
  },
];

function Cabecalho({ b, centro, id }: { b: { etiqueta: string; titulo: string; texto: string }; centro?: boolean; id?: string }) {
  return (
    <div className={centro ? "showroom-secao-cabecalho showroom-centralizado" : "showroom-secao-cabecalho"}>
      {b.etiqueta ? <p className="showroom-eyebrow">{b.etiqueta}</p> : null}
      <h2 id={id}>{b.titulo}</h2>
      {b.texto ? <p>{b.texto}</p> : null}
    </div>
  );
}

export function ShowroomCortai({
  segmento: inicial,
  conteudo = APRESENTACAO_PADRAO,
}: {
  etapa?: EtapaShowroom;
  segmento: Segmento;
  conteudo?: ConteudoApresentacao;
}) {
  const c = conteudo;
  const linhasTitulo = c.hero.titulo.split("\n");
  const [segmento, setSegmento] = useState(inicial);
  const contato = useWhatsappAlvo();
  return (
    <main className="showroom-page light">
      <header className="showroom-header">
        <div className="showroom-header-inner">
          <a href="#inicio" aria-label="Cortaí — início">
            <MarcaCortai variante="escura" className="h-auto w-24" prioridade />
          </a>
          <nav aria-label="Navegação da apresentação">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <div className="showroom-header-actions">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login" search={{ proximo: "/comecar" }}>
                Começar agora
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section id="inicio" className="showroom-hero">
        <div className="showroom-hero-copy">
          {c.hero.etiqueta ? <p className="showroom-eyebrow">{c.hero.etiqueta}</p> : null}
          <h1>
            {linhasTitulo.map((linha, i) => (
              <span key={i}>
                {i > 0 ? <br /> : null}
                {linha}
              </span>
            ))}
          </h1>
          <p className="showroom-lead">{c.hero.texto}</p>
          <div className="showroom-hero-actions">
            <Button asChild size="lg">
              <Link to="/login" search={{ proximo: "/comecar" }}>
                {c.hero.cta} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </div>
          <p className="showroom-assinatura">Simplifica. Conecta. Cresce.</p>
        </div>
        <div
          className="showroom-hero-produto"
          aria-label="Visão da Agenda e dos Clientes do Cortaí"
        >
          <Agenda segmento={segmento} />
          <div className="showroom-hero-cliente">
            <Cliente segmento={segmento} />
          </div>
        </div>
      </section>

      <section id="como-funciona" className="showroom-secao showroom-prova">
        <Cabecalho b={c.agenda} />
        <div className="showroom-prova-layout">
          <Agenda segmento={segmento} />
          <div className="showroom-prova-pontos">
            {RECURSOS.slice(0, 4).map(({ icone: Icon, titulo, texto }) => (
              <div key={titulo}>
                <Icon />
                <span>
                  <strong>{titulo}</strong>
                  <small>{texto}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="showroom-faixa showroom-foco-secao">
        <div className="showroom-dividida">
          <Cabecalho b={c.foco} />
          <Foco segmento={segmento} />
        </div>
      </section>

      <section className="showroom-secao showroom-clientes-secao">
        <div className="showroom-dividida showroom-dividida-inversa">
          <Cliente segmento={segmento} />
          <Cabecalho b={c.clientes} />
        </div>
      </section>

      <section className="showroom-faixa showroom-secretaria-secao">
        <div className="showroom-dividida">
          <div className="showroom-chat-wrap">
            <Secretaria segmento={segmento} />
          </div>
          <div className="showroom-secao-cabecalho">
            {c.secretaria.etiqueta ? <p className="showroom-eyebrow">{c.secretaria.etiqueta}</p> : null}
            <h2>{c.secretaria.titulo}</h2>
            {c.secretaria.texto ? <p>{c.secretaria.texto}</p> : null}
            <div className="showroom-plano-nota">
              <Sparkles />
              <span>
                <strong>Disponível no Conecta e no Equipe.</strong>
                <small>
                  Inclui Secretária, agendamento pelo cliente, WhatsApp e confirmações automáticas.
                </small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="showroom-secao">
        <Cabecalho b={c.recursos} centro />
        <div className="showroom-recursos">
          {RECURSOS.map(({ icone: Icon, titulo, texto }) => (
            <article key={titulo}>
              <Icon />
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </article>
          ))}
        </div>
        <div className="showroom-caixa-destaque">
          <Cabecalho b={c.caixa} />
          <Caixa segmento={segmento} />
        </div>
      </section>

      <section className="showroom-faixa showroom-segmentos">
        <Cabecalho b={c.segmentos} centro />
        <div className="showroom-segmentos-opcoes" aria-label="Tipo de negócio">
          {OPCOES.map((opcao) => (
            <Button
              key={opcao.id}
              variant={segmento === opcao.id ? "default" : "outline"}
              onClick={() => setSegmento(opcao.id)}
            >
              {opcao.rotulo}
            </Button>
          ))}
        </div>
      </section>

      <section
        id="planos"
        className="showroom-secao showroom-planos"
        aria-labelledby="showroom-planos-titulo"
      >
        <Cabecalho b={c.planos} centro id="showroom-planos-titulo" />
        <TabelaDePlanos
          acao={() => (
            <Button asChild className="w-full" variant="outline">
              <Link to="/login" search={{ proximo: "/comecar" }}>
                Começar agora
              </Link>
            </Button>
          )}
        />
      </section>

      <section id="duvidas" className="showroom-faixa showroom-faq">
        <Cabecalho b={c.duvidas} />
        <div className="showroom-faq-lista">
          {c.perguntas.map((q) => (
            <details key={q.pergunta}>
              <summary>{q.pergunta}</summary>
              <p>{q.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="showroom-cta-final">
        <MarcaCortai variante="escura" className="h-auto w-32" />
        <h2>{c.final.titulo}</h2>
        {c.final.texto ? <p>{c.final.texto}</p> : null}
        <div>
          <Button asChild size="lg">
            <Link to="/login" search={{ proximo: "/comecar" }}>
              Começar agora <ArrowRight />
            </Link>
          </Button>
          {contato ? (
            <Button asChild size="lg" variant="outline">
              <a href={contato} target="_blank" rel="noopener noreferrer">
                Quero falar com alguém
              </a>
            </Button>
          ) : null}
        </div>
      </section>

      <footer className="showroom-footer">
        <MarcaCortai variante="escura" className="h-auto w-24" />
        <span>By Alvo Digital</span>
        <nav aria-label="Links do rodapé">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/login">Entrar</Link>
        </nav>
      </footer>
    </main>
  );
}
