import { useCallback, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import { z } from "zod";

import mockupAsset from "@/assets/cortai-mockup-home.png.asset.json";
import corteAsset from "@/assets/cortai-barbeiro-corte.png.asset.json";
import { MarcaCortai } from "@/components/marca/MarcaCortai";
import { IconeDaIA } from "@/components/ia/IconeDaIA";
import { Button } from "@/components/ui/button";

const buscaSchema = z.object({ cena: z.coerce.number().int().min(1).max(8).catch(1) });

export const Route = createFileRoute("/admin/apresentacao")({
  validateSearch: buscaSchema,
  head: () => ({
    meta: [
      { title: "Apresentação interna — Cortaí" },
      { name: "description", content: "Apresentação interna da experiência Cortaí." },
      { property: "og:title", content: "Apresentação interna — Cortaí" },
      { property: "og:description", content: "Apresentação interna da experiência Cortaí." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ApresentacaoInterna,
});

const cenas = [
  {
    titulo: "Cortaí",
    rotulo: "A plataforma",
    descricao: "A operação do negócio em um fluxo simples, conectado e pronto para o dia a dia.",
  },
  {
    titulo: "Agenda que organiza o dia",
    rotulo: "Agenda",
    descricao: "Horários, clientes e andamento do atendimento em uma leitura rápida.",
  },
  {
    titulo: "O atendimento no centro",
    rotulo: "Modo Foco",
    descricao: "Um cockpit direto para saber quem chegou, o que fazer e qual é o próximo passo.",
  },
  {
    titulo: "Cada cliente com contexto",
    rotulo: "Clientes",
    descricao: "Histórico, frequência e retorno reunidos para uma experiência mais cuidadosa.",
  },
  {
    titulo: "Fechamento sem interromper o fluxo",
    rotulo: "Caixa e comanda",
    descricao: "Serviços, produtos e pagamento acompanhando o atendimento até o fim.",
  },
  {
    titulo: "Secretária Cortaí",
    rotulo: "Secretária",
    descricao: "Agendamento público e avisos operacionais que mantêm o cliente informado.",
  },
  {
    titulo: "Inteligência onde ajuda",
    rotulo: "CortAI",
    descricao: "Automações e apoio à gestão, sem tirar o controle de quem opera o negócio.",
  },
  {
    titulo: "Simplifica. Conecta. Cresce.",
    rotulo: "Pronto para testar",
    descricao: "Uma plataforma completa para negócios e profissionais de Beleza.",
  },
] as const;

function AgendaVisual() {
  return (
    <div className="presentation-product">
      <div className="flex items-center justify-between border-b border-line p-4">
        <div>
          <p className="text-xs font-bold text-gold">HOJE</p>
          <p className="mt-1 text-sm font-bold text-paper">Quarta, 30 de setembro</p>
        </div>
        <span className="flex items-center gap-2 text-xs text-mute">
          <i className="h-2 w-2 rounded-full bg-sage" />
          Ao vivo
        </span>
      </div>
      <div className="space-y-1 p-4">
        {[
          ["09:00", "Corte", "Confirmado"],
          ["10:20", "Coloração", "Em atendimento"],
          ["12:00", "Intervalo", ""],
          ["14:30", "Tratamento", "Próximo"],
        ].map(([hora, servico, status]) => (
          <div
            key={hora}
            className="grid grid-cols-[52px_1fr] gap-3 border-b border-line py-3 last:border-0"
          >
            <span className="text-xs font-bold text-mute">{hora}</span>
            <span>
              <b className="block text-sm text-paper">{servico}</b>
              {status ? <small className="mt-1 block text-mute">{status}</small> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function FocoVisual() {
  return (
    <div className="presentation-product p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-rosa">EM ATENDIMENTO</span>
        <span className="font-mono text-sm text-mute">00:18:42</span>
      </div>
      <p className="mt-8 text-xs text-mute">Cliente atual</p>
      <h3 className="mt-1 text-2xl font-bold text-paper">Marina Costa</h3>
      <p className="mt-2 text-sm text-mute">Corte + tratamento · 55 min</p>
      <div className="mt-8 border-y border-line py-4">
        <p className="text-xs text-mute">Observação</p>
        <p className="mt-1 text-sm text-paper">Finalização leve, como no último atendimento.</p>
      </div>
      <div className="mt-6 flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        Finalizar atendimento
      </div>
    </div>
  );
}
function ClientesVisual() {
  return (
    <div className="presentation-product">
      <div className="border-b border-line p-4">
        <p className="text-xs font-bold text-gold">CLIENTES</p>
        <p className="mt-1 text-sm text-mute">Histórico que acompanha cada retorno.</p>
      </div>
      <div className="p-4">
        {[
          ["MC", "Marina Costa", "Retorno sugerido esta semana"],
          ["RL", "Rafael Lima", "3 atendimentos concluídos"],
          ["AS", "Ana Souza", "Cliente recorrente"],
        ].map(([iniciais, nome, detalhe]) => (
          <div
            key={nome}
            className="flex items-center gap-3 border-b border-line py-3 last:border-0"
          >
            <span className="grid size-10 place-items-center rounded-full bg-gold-soft text-xs font-bold text-gold">
              {iniciais}
            </span>
            <span>
              <b className="block text-sm text-paper">{nome}</b>
              <small className="text-mute">{detalhe}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function CaixaVisual() {
  return (
    <div className="presentation-product p-5">
      <p className="text-xs font-bold text-gold">COMANDA ABERTA</p>
      <h3 className="mt-2 text-xl font-bold text-paper">Atendimento atual</h3>
      <div className="mt-6 space-y-3">
        {[
          ["Serviço", "R$ 70,00"],
          ["Produto", "R$ 24,00"],
        ].map(([nome, valor]) => (
          <div key={nome} className="flex justify-between border-b border-line pb-3 text-sm">
            <span className="text-mute">{nome}</span>
            <b className="text-paper">{valor}</b>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-end justify-between">
        <span className="text-sm text-mute">Total</span>
        <strong className="text-3xl text-paper">R$ 94,00</strong>
      </div>
      <div className="mt-6 flex h-12 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
        <CreditCard className="mr-2 size-4" />
        Registrar pagamento
      </div>
    </div>
  );
}
function SecretariaVisual() {
  return (
    <div className="presentation-phone">
      <div className="flex items-center gap-3 border-b border-line p-4">
        <span className="grid size-10 place-items-center rounded-full bg-gold-soft">
          <MessageCircle className="size-5 text-gold" />
        </span>
        <span>
          <b className="block text-sm text-paper">Secretária de Agendamento</b>
          <small className="text-sage">Online</small>
        </span>
      </div>
      <div className="space-y-4 p-4">
        <p className="ml-auto max-w-[82%] rounded-xl rounded-br-sm bg-primary p-3 text-sm text-primary-foreground">
          Quero marcar um horário
        </p>
        <p className="max-w-[86%] rounded-xl rounded-bl-sm bg-ink3 p-3 text-sm text-paper">
          Claro. Escolha o serviço para eu mostrar os horários disponíveis.
        </p>
        <div className="grid gap-2">
          {["Corte", "Coloração", "Tratamento"].map((item) => (
            <span
              key={item}
              className="rounded-xl border border-line px-3 py-3 text-sm font-semibold text-paper"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-auto border-t border-line py-3 text-center text-xs text-mute">
        By Alvo Digital • Cortaí
      </p>
    </div>
  );
}
function IaVisual() {
  const recursos = [
    { Icon: Sparkles, label: "Resumo do dia" },
    { Icon: Target, label: "Próximas ações" },
    { Icon: MessageCircle, label: "Comunicações consistentes" },
  ];
  return (
    <div className="presentation-product p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-rosa-soft text-rosa">
          <IconeDaIA segmento="outro" size={24} />
        </span>
        <span>
          <p className="text-xs font-bold text-rosa">CortAI</p>
          <h3 className="text-lg font-bold text-paper">Apoio à operação</h3>
        </span>
      </div>
      <div className="mt-7 space-y-4">
        {recursos.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-3 border-b border-line pb-4">
            <Icon className="size-5 text-gold" />
            <span className="text-sm font-semibold text-paper">{label}</span>
            <Check className="ml-auto size-4 text-sage" />
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm leading-6 text-mute">
        Dados reais e regras oficiais continuam sendo a fonte de verdade.
      </p>
    </div>
  );
}
function CenaVisual({ cena }: { cena: number }) {
  if (cena === 1)
    return (
      <div className="presentation-hero-media">
        <img src={mockupAsset.url} alt="Cortaí em diferentes telas" />
      </div>
    );
  if (cena === 2) return <AgendaVisual />;
  if (cena === 3) return <FocoVisual />;
  if (cena === 4) return <ClientesVisual />;
  if (cena === 5) return <CaixaVisual />;
  if (cena === 6) return <SecretariaVisual />;
  if (cena === 7) return <IaVisual />;
  return (
    <div className="presentation-final-media">
      <img src={corteAsset.url} alt="Profissional durante um atendimento" />
    </div>
  );
}

function ApresentacaoInterna() {
  const { cena } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/apresentacao" });
  const inicioToque = useRef<number | null>(null);
  const atual = cenas[cena - 1] ?? cenas[0];
  const ir = useCallback((proxima: number) => {
    if (proxima >= 1 && proxima <= cenas.length)
      void navigate({ search: { cena: proxima }, replace: true });
  }, [navigate]);
  const sair = useCallback(() => {
    if (window.history.length > 1) window.history.back();
    else void navigate({ to: "/admin", search: {} });
  }, [navigate]);
  useEffect(() => {
    const teclado = (evento: KeyboardEvent) => {
      if (evento.key === "ArrowRight" || evento.key === " ") ir(cena + 1);
      if (evento.key === "ArrowLeft") ir(cena - 1);
      if (evento.key === "Escape") sair();
    };
    window.addEventListener("keydown", teclado);
    return () => window.removeEventListener("keydown", teclado);
  }, [cena, ir, sair]);
  return (
    <main
      className="presentation-stage"
      onTouchStart={(evento) => {
        inicioToque.current = evento.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(evento) => {
        const fim = evento.changedTouches[0]?.clientX;
        if (inicioToque.current === null || fim === undefined) return;
        const delta = fim - inicioToque.current;
        if (Math.abs(delta) > 60) ir(cena + (delta < 0 ? 1 : -1));
        inicioToque.current = null;
      }}
    >
      <header className="presentation-header">
        <MarcaCortai variante="clara" className="h-auto w-24" prioridade />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-paper hover:bg-ink3"
          onClick={sair}
        >
          <ArrowLeft />
          Sair da apresentação
        </Button>
      </header>
      <div className="presentation-progress" aria-label={`Cena ${cena} de ${cenas.length}`}>
        {cenas.map((item, index) => (
          <button
            key={item.rotulo}
            type="button"
            aria-label={`Ir para ${item.rotulo}`}
            aria-current={index + 1 === cena ? "step" : undefined}
            onClick={() => ir(index + 1)}
            className={index + 1 === cena ? "presentation-progress-active" : ""}
          />
        ))}
      </div>
      <section className="presentation-scene" aria-live="polite">
        <div className="presentation-copy">
          <p className="text-xs font-bold uppercase text-gold">{atual.rotulo}</p>
          <h1>{atual.titulo}</h1>
          <p>{atual.descricao}</p>
          {cena === 1 ? (
            <p className="presentation-signature">Simplifica. Conecta. Cresce.</p>
          ) : null}
          {cena === 8 ? (
            <Button type="button" size="lg" className="mt-8" onClick={sair}>
              Entrar no Cortaí <ArrowRight />
            </Button>
          ) : null}
        </div>
        <div className="presentation-visual">
          <CenaVisual cena={cena} />
        </div>
      </section>
      <footer className="presentation-controls">
        <span className="text-xs text-mute">
          {String(cena).padStart(2, "0")} / {String(cenas.length).padStart(2, "0")}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Cena anterior"
            disabled={cena === 1}
            onClick={() => ir(cena - 1)}
          >
            <ArrowLeft />
          </Button>
          <Button
            type="button"
            size="icon"
            aria-label="Próxima cena"
            disabled={cena === cenas.length}
            onClick={() => ir(cena + 1)}
          >
            <ArrowRight />
          </Button>
        </div>
      </footer>
    </main>
  );
}
