import type { CSSProperties, ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Globe,
  HandHelping,
  MapPin,
  Sparkles,
  Star,
  ChartNoAxesCombined,
  Users,
  type LucideIcon,
} from "lucide-react";

const suave: CSSProperties = {
  color: "var(--figaro-on-primary)",
  opacity: 0.72,
  fontSize: 10,
  fontWeight: 600,
};
const cartao: CSSProperties = {
  borderRadius: 12,
  padding: 12,
  background: "color-mix(in oklab, var(--figaro-on-primary) 9%, transparent)",
  border: "1px solid color-mix(in oklab, var(--figaro-on-primary) 16%, transparent)",
};

function Aparelho({ children, nome }: { children: ReactNode; nome: string }) {
  return (
    <div
      className="entrada-demo relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      role="img"
      aria-label={nome}
      style={{
        background: "var(--figaro-primary)",
        color: "var(--figaro-on-primary)",
        borderRadius: 20,
        margin: 10,
        width: "calc(100% - 20px)",
        height: "calc(100% - 20px)",
        boxSizing: "border-box",
        padding: 12,
      }}
    >
      <span
        className="absolute right-3 top-3 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider"
        style={{
          color: "var(--figaro-on-primary)",
          background: "color-mix(in oklab, var(--figaro-on-primary) 14%, transparent)",
        }}
      >
        Exemplo visual
      </span>
      {children}
    </div>
  );
}

function CabecalhoDemo({
  icone: Icone,
  titulo,
  detalhe,
}: {
  icone: LucideIcon;
  titulo: string;
  detalhe: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{
            background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
            color: "var(--figaro-on-primary)",
          }}
        >
          <Icone size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <b className="block truncate text-xs">{titulo}</b>
          <span style={suave}>{detalhe}</span>
        </div>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
        style={{
          background: "color-mix(in oklab, var(--figaro-tertiary) 18%, transparent)",
          color: "var(--figaro-on-primary)",
        }}
      >
        Exemplo
      </span>
    </div>
  );
}

export function DemoSite() {
  return (
    <Aparelho nome="Exemplo visual de página pública, serviços e agendamento do negócio">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Globe} titulo="Studio Flow Concept" detalhe="Página pública do negócio" />
        <div
          className="rounded-xl p-3"
          style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 11%, transparent)" }}
        >
          <div
            className="mb-2 flex items-center gap-1 text-[10px]"
            style={{ color: "var(--figaro-on-primary)", opacity: 0.75 }}
          >
            <MapPin size={11} aria-hidden /> Seus dados e localização
          </div>
          <b className="block text-sm">Seu próximo atendimento começa aqui</b>
          <p className="mt-1 text-[10px] leading-relaxed" style={suave}>
            Conheça os serviços, veja os detalhes e escolha seu melhor horário.
          </p>
        </div>
        <div className="rounded-xl p-3" style={cartao}>
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[10px]">Nossa equipe</b>
            <span style={suave}>Ver todos</span>
          </div>
          <div className="flex gap-3">
            {["LM", "RC", "DA"].map((iniciais, i) => (
              <div key={iniciais} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="grid size-8 place-items-center rounded-full text-[10px] font-bold"
                  style={{
                    background:
                      i === 0
                        ? "var(--figaro-primary-container)"
                        : "color-mix(in oklab, var(--figaro-tertiary) 18%, transparent)",
                    color: "var(--figaro-on-primary)",
                  }}
                >
                  {iniciais}
                </span>
                <span className="text-[9px]" style={suave}>
                  {["Ana", "Rafael", "Camila"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={suave}>
            Serviços em destaque
          </p>
          <div className="flex items-center justify-between gap-2 rounded-xl p-2.5" style={cartao}>
            <div className="flex min-w-0 items-center gap-2">
              <HandHelping size={16} aria-hidden />
              <div className="min-w-0">
                <b className="block truncate text-[11px]">Atendimento completo</b>
                <span style={suave}>45 min · Profissional</span>
              </div>
            </div>
            <b className="shrink-0 text-xs">R$ 85</b>
          </div>
        </div>
        <div
          className="flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold"
          style={{ background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }}
        >
          <Sparkles size={14} aria-hidden /> Agendar horário online
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAgendamento() {
  return (
    <Aparelho nome="Exemplo visual de agendamento em três passos">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Clock3} titulo="Escolha seu horário" detalhe="Agendamento online" />
        <div className="flex items-center gap-1.5">
          {["Serviço", "Horário", "Confirmação"].map((etapa, i) => (
            <div key={etapa} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span
                className="grid size-6 place-items-center rounded-full text-[10px] font-bold"
                style={{
                  background: i === 2 ? "var(--figaro-tertiary)" : "var(--figaro-primary-container)",
                  color: i === 2 ? "var(--figaro-on-tertiary)" : "var(--figaro-on-primary-container)",
                }}
              >
                {i < 2 ? <Check size={12} /> : "3"}
              </span>
              <span className="text-[9px]" style={suave}>
                {etapa}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={cartao}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={suave}>
            Horários demonstrativos
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"].map((hora, i) => (
              <span
                key={hora}
                className="rounded-lg px-1 py-2 text-center text-[10px] font-semibold"
                style={
                  i === 2
                    ? { background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }
                    : {
                        background: "color-mix(in oklab, var(--figaro-on-primary) 8%, transparent)",
                        color: "var(--figaro-on-primary)",
                      }
                }
              >
                {hora}
              </span>
            ))}
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-2 rounded-xl p-2.5"
          style={{ background: "var(--sage-soft)", color: "var(--sage)" }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold">
            <Check size={14} /> Exemplo de confirmação
          </span>
          <span className="text-[10px] font-semibold">14:00</span>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAgenda() {
  return (
    <Aparelho nome="Exemplo visual de agenda com dias e horários">
      <div className="w-full max-w-[280px] space-y-5">
        <CabecalhoDemo icone={CalendarDays} titulo="Agenda do negócio" detalhe="Visão diária" />
        <div className="flex items-center justify-center gap-2">
          {["S", "T", "Q", "Q", "S"].map((dia, i) => (
            <span
              key={dia + i}
              className="grid size-9 place-items-center rounded-full text-xs font-bold"
              style={
                i === 2
                  ? { background: "var(--figaro-primary-container)", color: "var(--figaro-on-primary-container)" }
                  : {
                      background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
                      color: "var(--figaro-on-primary)",
                    }
              }
            >
              {dia}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"].map((hora, i) => (
            <span
              key={hora}
              className="flex h-10 items-center justify-center rounded-xl text-xs font-semibold"
              style={
                i === 3
                  ? { background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }
                  : i === 1
                    ? {
                        background: "color-mix(in oklab, var(--figaro-on-primary) 8%, transparent)",
                        color: "var(--figaro-on-primary)",
                        opacity: 0.45,
                        textDecoration: "line-through",
                      }
                    : {
                        background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
                        color: "var(--figaro-on-primary)",
                      }
              }
            >
              {hora}
            </span>
          ))}
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoWhatsApp() {
  return (
    <Aparelho nome="Exemplo visual de mensagem e confirmação via WhatsApp">
      <div className="w-full max-w-[280px] space-y-4">
        <CabecalhoDemo icone={Clock3} titulo="Mensagem de atendimento" detalhe="Prévia ilustrativa" />
        <div
          className="max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-snug"
          style={{
            background: "color-mix(in oklab, var(--figaro-on-primary) 16%, transparent)",
            color: "var(--figaro-on-primary)",
          }}
        >
          Oi, Ana! Amanhã às 10:30 você tem horário. Confirma?
        </div>
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-br-md px-4 py-3 text-sm font-bold"
            style={{ background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }}
          >
            Confirmo ✓
          </div>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAvaliacoes() {
  return (
    <Aparelho nome="Exemplo visual de avaliações e comentários">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Star} titulo="Avaliações" detalhe="Experiência dos clientes" />
        <div className="rounded-2xl p-3" style={cartao}>
          <div className="flex items-center justify-between">
            <div>
              <b className="text-3xl tabular-nums">4,8</b>
              <p style={suave}>Nota média demonstrativa</p>
            </div>
            <div className="text-right">
              <div className="text-lg" style={{ color: "var(--figaro-tertiary)" }}>
                ★★★★★
              </div>
              <p style={suave}>32 avaliações de exemplo</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              ["5 estrelas", "82%"],
              ["4 estrelas", "12%"],
              ["3 estrelas", "6%"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-2 text-[10px]">
                <span className="w-16" style={suave}>
                  {label}
                </span>
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)" }}
                >
                  <div className="h-full rounded-full" style={{ width: value, background: "var(--figaro-tertiary)" }} />
                </div>
                <b className="w-7 text-right">{value}</b>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {[
            ["Mariana Costa", "Atendimento excelente!"],
            ["Rafael Lima", "Muito atenciosos e pontuais."],
          ].map(([nome, comentario]) => (
            <div key={nome} className="rounded-xl p-3" style={cartao}>
              <div className="flex items-center justify-between text-[10px]">
                <b>{nome}</b>
                <span style={{ color: "var(--figaro-tertiary)" }}>★★★★★</span>
              </div>
              <p className="mt-1 text-[10px]" style={suave}>
                {comentario}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoDesempenho() {
  return (
    <Aparelho nome="Exemplo visual de indicadores do negócio">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={ChartNoAxesCombined} titulo="Seu negócio" detalhe="Visão geral · Exemplo" />
        <div className="grid grid-cols-2 gap-2">
          {[
            ["1.240", "Visitas na página"],
            ["186", "Agendamentos"],
            ["15%", "Conversão"],
            ["R$ 10,8k", "Faturamento"],
          ].map(([valor, label]) => (
            <div key={label} className="rounded-xl p-3" style={cartao}>
              <b className="block text-lg tabular-nums">{valor}</b>
              <span className="text-[9px]" style={suave}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={cartao}>
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[11px]">Mais procurados</b>
            <span style={suave}>Dados ilustrativos</span>
          </div>
          {["Serviço completo", "Corte e finalização", "Cuidados especiais"].map((item, i) => (
            <div
              key={item}
              className="flex items-center justify-between border-t py-2 text-[10px]"
              style={{ borderColor: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)" }}
            >
              <span>{item}</span>
              <b>{[76, 48, 32][i]}</b>
            </div>
          ))}
        </div>
        <div
          className="flex items-center gap-2 rounded-xl p-2.5 text-[10px]"
          style={{ background: "var(--figaro-primary-container)", color: "var(--figaro-on-primary-container)" }}
        >
          <Check size={13} /> Acompanhe e ajuste seu negócio
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoFila() {
  return (
    <Aparelho nome="Exemplo visual de fila de espera e previsão de atendimento">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Users} titulo="Fila de espera" detalhe="Prévia demonstrativa" />
        <div className="grid grid-cols-3 gap-2">
          {[
            ["03", "Na fila"],
            ["15 min", "Próximo"],
            ["3", "Pessoas"],
          ].map(([valor, rotulo]) => (
            <div key={rotulo} className="rounded-xl p-2 text-center" style={cartao}>
              <b className="block text-sm tabular-nums">{valor}</b>
              <span className="text-[9px]" style={suave}>{rotulo}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-xl p-3" style={cartao}>
          {[
            ["1", "Ana", "Em atendimento"],
            ["2", "Carlos", "Próximo"],
            ["3", "Mariana", "Aguardando"],
          ].map(([ordem, nome, estado]) => (
            <div key={ordem} className="flex items-center gap-2 text-[11px]">
              <span
                className="grid size-7 shrink-0 place-items-center rounded-full font-bold"
                style={{ background: "var(--figaro-primary-container)", color: "var(--figaro-on-primary-container)" }}
              >
                {ordem}
              </span>
              <b className="flex-1">{nome}</b>
              <span style={suave}>{estado}</span>
            </div>
          ))}
        </div>
      </div>
    </Aparelho>
  );
}
