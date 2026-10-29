import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Focus,
  MessageCircle,
  Plus,
  ReceiptText,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { DemoAgendamento } from "@/components/apresentacao/DemoAgendamento";
import { NarrativaApresentacao } from "@/components/apresentacao/NarrativaApresentacao";

import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { AgendaTimeline } from "@/components/barbeiro/AgendaTimeline";
import { CockpitFoco } from "@/components/barbeiro/agenda/CockpitFoco";
import { dadosDoCockpit } from "@/components/barbeiro/agenda/cockpit-foco";
import { FichaFocoVisual } from "@/components/barbeiro/agenda/FichaFoco";
import { ChatHeader } from "@/components/chat/ChatShell";
import { useWhatsappAlvo } from "@/components/layout/Signature";
import { MarcaFlow } from "@/components/marca/MarcaFlow";
import { MenuDaApresentacao } from "@/components/apresentacao/MenuDaApresentacao";
import { TabelaDePlanos } from "@/components/planos/TabelaDePlanos";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgendaItem } from "@/lib/barbeiro.functions";
import { brl } from "@/lib/format";
import { SEGMENTOS_CONFIG, type Segmento } from "@/lib/segmentos";
import type { ServicoSugerido } from "@/lib/ia/assistente";
import { APRESENTACAO_PADRAO, type ConteudoApresentacao } from "@/lib/apresentacao-conteudo";

export type EtapaShowroom = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OPCOES: Array<{ id: Segmento; rotulo: string }> = [
  { id: "barbearia", rotulo: "Barbearia" },
  { id: "salao", rotulo: "Salão" },
  { id: "cabeleireiro", rotulo: "Cabeleireiro" },
  { id: "esmalteria", rotulo: "Esmalteria" },
  { id: "sobrancelha_cilios", rotulo: "Sobrancelha e cílios" },
  { id: "estetica", rotulo: "Estética" },
  { id: "outro", rotulo: "Outro tipo de serviço" },
];

const SERVICOS_DEMONSTRACAO_GENERICOS: ServicoSugerido[] = [
  { nome: "Atendimento inicial", categoria: "Serviço", duracaoMin: 30, precoCentavos: 3500 },
  { nome: "Sessão completa", categoria: "Serviço", duracaoMin: 45, precoCentavos: 5000 },
  { nome: "Acompanhamento", categoria: "Serviço", duracaoMin: 30, precoCentavos: 2500 },
];

function servicosDaDemonstracao(segmento: Segmento): ServicoSugerido[] {
  const configurados = SEGMENTOS_CONFIG[segmento].servicosSugeridos;
  return configurados.length ? configurados : SERVICOS_DEMONSTRACAO_GENERICOS;
}

const FUSO = "America/Sao_Paulo";
/** Data de hoje no fuso da demonstração (AAAA-MM-DD). */
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
const DIA_SEMANA = new Date(`${DIA}T12:00:00-03:00`).getUTCDay();
const ROTULO_DIA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "short",
  day: "numeric",
  month: "short",
}).format(new Date(`${DIA}T12:00:00-03:00`));
/** Horário local de hoje em ISO. Marina é sempre às 10:00 em todas as telas. */
const h = (hhmm: string) => new Date(`${DIA}T${hhmm}:00-03:00`).toISOString();
const AGORA = new Date(h("10:18")).getTime();

function itens(segmento: Segmento): AgendaItem[] {
  const servicos = servicosDaDemonstracao(segmento);
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
      ...base("concluido", h("09:00"), h("09:45"), "Bia Alves", 2),
      status: "finalizado",
      arrivedAt: h("08:56"),
      startedAt: h("09:00"),
      finishedAt: h("09:43"),
    },
    {
      ...base("agora", h("10:00"), h("10:45"), "Marina Costa", 0),
      status: "na_cadeira",
      arrivedAt: h("09:56"),
      startedAt: h("10:00"),
      ficha: "Prefere confirmar os detalhes do atendimento antes de finalizar.",
    },
    {
      ...base("proximo", h("11:00"), h("11:45"), "Rafa Lima", 1),
      confirmadoEm: h("08:30"),
    },
    base("depois", h("12:15"), h("13:00"), "Ana Souza", 2),
    base("fim", h("13:30"), h("14:15"), "João Silva", 0),
  ];
}

function Agenda({ segmento }: { segmento: Segmento }) {
  const agenda = useMemo(() => itens(segmento), [segmento]);
  return (
    <div className="showroom-produto showroom-agenda" aria-label="Demonstração da Agenda Flow">
      <div className="showroom-produto-topo">
        <span>
          <small>Agenda</small>
          <strong>Hoje · {ROTULO_DIA}</strong>
        </span>
        <em>Exemplo de agenda</em>
      </div>
      <AgendaTimeline
        dia={DIA}
        fuso={FUSO}
        agora={AGORA}
        itens={agenda}
        horarios={[{ diaSemana: DIA_SEMANA, fechado: false, abre: "09:00", fecha: "18:00" }]}
        selecionado={null}
        onSelecionar={() => undefined}
        renderStatus={(status) => <StatusBadge status={status} segmento={segmento} />}
        alinhado
      />
    </div>
  );
}

function Foco({ segmento }: { segmento: Segmento }) {
  const dados = dadosDoCockpit(itens(segmento), AGORA, FUSO);
  const atual = dados.principal;
  return (
    <div
      className="modo-foco showroom-produto flex min-h-[620px] flex-col p-3"
      aria-label="Demonstração do Modo Foco"
      data-showroom-cockpit
    >
      <header className="border-b border-line pb-3 text-center">
        <strong className="text-2xl tabular-nums text-paper">10:18</strong>
        <p className="mt-1 text-[15px] text-mute">
          Alex · {dados.concluidos} concluído · {dados.pelaFrente} pela frente
        </p>
      </header>
      <CockpitFoco
        dados={dados}
        agora={AGORA}
        fuso={FUSO}
        discreto={false}
        somenteLeitura
        ficha={
          atual ? (
            <FichaFocoVisual
              preferencias={atual.preferencias ?? {}}
              observacao={atual.ficha}
              discreto={false}
            />
          ) : null
        }
      />
    </div>
  );
}

function Cliente({ segmento }: { segmento: Segmento }) {
  const servico = servicosDaDemonstracao(segmento)[0];
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
          <dt>Último atendimento</dt>
          <dd>Há 4 semanas</dd>
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
      {["Há 4 semanas", "Há 8 semanas"].map((data) => (
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
  const servicos = servicosDaDemonstracao(segmento);
  const [verOutros, setVerOutros] = useState(false);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const opcoes = verOutros ? servicos.slice(0, 4) : servicos.slice(0, 1);
  return (
    <div className="showroom-chat" aria-label="Demonstração do WhatsApp Flow">
      <ChatHeader nome="Flow" detalhe="Seu negócio" status="Online" />
      <Conversation>
        <ConversationContent className="gap-4 p-4">
          <Balao>Oi! Eu organizo seu agendamento por aqui. O que você procura?</Balao>
          <Balao cliente>Quero marcar um horário.</Balao>
          <Balao>Claro. Vamos começar pelo atendimento.</Balao>
          <div className="grid grid-cols-2 gap-2">
            {opcoes.map((servico) => (
              <Button
                key={servico.nome}
                type="button"
                variant="outline"
                aria-pressed={escolhido === servico.nome}
                onClick={() => setEscolhido(servico.nome)}
                className="h-auto min-h-11 whitespace-normal"
              >
                {servico.nome}
              </Button>
            ))}
            {servicos.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                aria-pressed={verOutros}
                onClick={() => setVerOutros((aberto) => !aberto)}
                className="h-auto min-h-11 whitespace-normal"
              >
                {verOutros ? "Ver menos" : "Ver outros"}
              </Button>
            ) : null}
          </div>
          {escolhido ? (
            <>
              <Balao cliente>{escolhido}</Balao>
              <Balao>Perfeito! Em um atendimento real, eu consultaria os horários disponíveis para você.</Balao>
            </>
          ) : null}
          <p className="showroom-chat-nota">
            <Check /> Demonstração interativa: nenhuma reserva será criada.
          </p>
        </ConversationContent>
      </Conversation>
      <div className="chat-assinatura">By Alvo Digital • Flow</div>
    </div>
  );
}

function Caixa({ segmento }: { segmento: Segmento }) {
  const servicos = servicosDaDemonstracao(segmento);
  const servico = servicos[0];
  const adicional = servicos[1];
  const [adicionalAtivo, setAdicionalAtivo] = useState(false);
  const [pagamento, setPagamento] = useState<string | null>(null);
  const valor = (servico?.precoCentavos ?? 4500) +
    (adicionalAtivo ? (adicional?.precoCentavos ?? 0) : 0);
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
      {servico ? (
        <div className="showroom-caixa-item">
          <span>
            <strong>{servico.nome}</strong>
            <small>Serviço</small>
          </span>
          <b>{brl(servico.precoCentavos)}</b>
        </div>
      ) : null}
      {adicionalAtivo && adicional ? (
        <div className="showroom-caixa-item">
          <span>
            <strong>{adicional.nome}</strong>
            <small>Item adicional (simulação)</small>
          </span>
          <b>{brl(adicional.precoCentavos)}</b>
        </div>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={!adicional}
        onClick={() => setAdicionalAtivo((ativo) => !ativo)}
        className="h-auto min-h-11 whitespace-normal"
      >
        <Plus /> {adicionalAtivo ? "Remover item adicional" : "Adicionar serviço ou produto"}
      </Button>
      <div className="showroom-total">
        <span>Total ilustrativo</span>
        <strong>{brl(valor)}</strong>
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Forma de pagamento demonstrativa">
        {["Pix", "Cartão", "Dinheiro"].map((forma) => (
          <Button
            key={forma}
            type="button"
            variant={pagamento === forma ? "primary" : "secondary"}
            aria-pressed={pagamento === forma}
            onClick={() => setPagamento(forma)}
            className="h-auto min-h-11 whitespace-normal"
          >
            {forma}
          </Button>
        ))}
      </div>
      {pagamento ? (
        <p className="text-xs text-mute" role="status" aria-live="polite">
          {pagamento} selecionado para a demonstração. Nenhum pagamento foi processado.
        </p>
      ) : null}
    </div>
  );
}

function Lembrete({ segmento }: { segmento: Segmento }) {
  const servico = servicosDaDemonstracao(segmento)[1]?.nome ?? "Atendimento";
  const [resposta, setResposta] = useState<"aguardando" | "confirmar" | "remarcar">("aguardando");
  return (
    <div className="showroom-chat" aria-label="Demonstração do lembrete automático por WhatsApp">
      <ChatHeader
        nome="Lembrete automático"
        detalhe="WhatsApp"
        status={resposta === "aguardando" ? "Aguardando resposta" : "Simulação"}
      />
      <Conversation>
        <ConversationContent className="gap-4 p-4">
          <Balao>Oi, Rafa! Lembrete: amanhã às 11:00, {servico} com Alex. Posso confirmar?</Balao>
          {resposta === "aguardando" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResposta("confirmar")}
                className="h-auto min-h-11 whitespace-normal"
              >
                Confirmar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResposta("remarcar")}
                className="h-auto min-h-11 whitespace-normal"
              >
                Remarcar
              </Button>
            </div>
          ) : resposta === "confirmar" ? (
            <>
              <Balao cliente>Confirmar</Balao>
              <Balao>Na demonstração, a confirmação seria registrada após validar o agendamento.</Balao>
            </>
          ) : (
            <>
              <Balao cliente>Quero remarcar</Balao>
              <Balao>Na experiência real, eu consultaria os horários disponíveis antes de alterar o agendamento.</Balao>
            </>
          )}
          {resposta !== "aguardando" ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setResposta("aguardando")}
            >
              Reiniciar demonstração
            </Button>
          ) : null}
          <p className="showroom-chat-nota">
            <Check /> Simulação local: nenhuma mensagem foi enviada e nenhum agendamento foi alterado.
          </p>
        </ConversationContent>
      </Conversation>
    </div>
  );
}

const RECURSOS = [
  {
    icone: MessageCircle,
    titulo: "Lembrete por WhatsApp",
    texto:
      "Veja como lembretes e confirmações podem aparecer quando a integração estiver habilitada e configurada pelo estabelecimento.",
  },
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
    titulo: "WhatsApp",
    texto: "Conheça o fluxo de conversa apresentado como exemplo. A disponibilidade depende da configuração do estabelecimento.",
  },
];

function Cabecalho({
  b,
  centro,
  id,
}: {
  b: { etiqueta: string; titulo: string; texto: string };
  centro?: boolean;
  id?: string;
}) {
  return (
    <div
      className={
        centro ? "showroom-secao-cabecalho showroom-centralizado" : "showroom-secao-cabecalho"
      }
    >
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
    <main className="showroom-page dark">
      <header className="showroom-header">
        <div className="showroom-header-inner">
          <a href="#inicio" aria-label="Flow — início">
            <MarcaFlow variante="clara" className="h-auto w-24" prioridade />
          </a>
          <nav aria-label="Navegação da apresentação">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href="#duvidas">Dúvidas</a>
          </nav>
          <div className="showroom-header-actions">
            <MenuDaApresentacao />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" variant="primary">
              <Link to="/comecar">
                <span className="hidden sm:inline">Cadastrar meu negócio</span>
                <span className="sm:hidden">Começar grátis</span>
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
            <Button asChild size="lg" variant="primary">
              <Link to="/comecar">
                {c.hero.cta} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/barbearias">Encontrar estabelecimento</Link>
            </Button>
            <a href="#como-funciona" className="text-sm font-semibold text-ink underline underline-offset-4">Ver como funciona</a>
          </div>
          <p className="mt-3 max-w-prose text-sm text-mute">Você entrará com sua conta para iniciar o cadastro do seu negócio.</p>
          <p className="showroom-assinatura">Seu negócio no ritmo certo.</p>
        </div>
        <div
          className="showroom-hero-produto"
          aria-label="Visão da Agenda e dos Clientes do Flow"
        >
          <Agenda segmento={segmento} />
        </div>
      </section>

      <DemoAgendamento />
      <NarrativaApresentacao />

      <section
        className="showroom-faixa showroom-segmentos"
        aria-labelledby="showroom-segmento-titulo"
      >
        <Cabecalho b={c.segmentos} centro id="showroom-segmento-titulo" />
        <div className="showroom-segmentos-opcoes" role="group" aria-label="Tipo de negócio">
          {OPCOES.map((opcao) => (
            <Button
              key={opcao.id}
              type="button"
              variant="ghost"
              aria-pressed={segmento === opcao.id}
              onClick={() => setSegmento(opcao.id)}
              className={
                segmento === opcao.id
                  ? "min-h-11 rounded-full border border-rosa bg-rosa/10 text-paper"
                  : "min-h-11 rounded-full border border-line text-mute hover:border-line2 hover:text-paper"
              }
            >
              {opcao.rotulo}
            </Button>
          ))}
        </div>
      </section>

      <section id="lembretes" className="showroom-secao showroom-prova">
        <Cabecalho b={c.agenda} />
        <div className="showroom-prova-layout">
          <Lembrete key={segmento} segmento={segmento} />
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
            <Secretaria key={segmento} segmento={segmento} />
          </div>
          <div className="showroom-secao-cabecalho">
            {c.secretaria.etiqueta ? (
              <p className="showroom-eyebrow">{c.secretaria.etiqueta}</p>
            ) : null}
            <h2>{c.secretaria.titulo}</h2>
            {c.secretaria.texto ? <p>{c.secretaria.texto}</p> : null}
            <div className="showroom-plano-nota">
              <Sparkles />
              <span>
                <strong>Integrações em validação.</strong>
                <small>
                  WhatsApp, Flow e confirmações automáticas dependem da disponibilidade e da configuração de cada estabelecimento.
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
          <Caixa key={segmento} segmento={segmento} />
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
              <Link to="/comecar">Cadastrar meu negócio</Link>
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
        <MarcaFlow variante="clara" className="h-auto w-32" />
        <h2>{c.final.titulo}</h2>
        {c.final.texto ? <p>{c.final.texto}</p> : null}
        <div>
          <Button asChild size="lg" variant="primary">
            <Link to="/comecar">Cadastrar meu negócio <ArrowRight /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/barbearias">Encontrar estabelecimento</Link>
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
        <MarcaFlow variante="clara" className="h-auto w-24" />
        <span>Agendamentos de um jeito mais simples.</span>
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
