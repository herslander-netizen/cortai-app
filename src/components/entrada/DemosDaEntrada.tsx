import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Clock3,
  CreditCard,
  Globe,
  HandHelping,
  MapPin,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const suave: CSSProperties = { color: "var(--figaro-on-primary)", opacity: 0.72, fontSize: 10, fontWeight: 600 };
const cartao: CSSProperties = {
  borderRadius: 12,
  padding: 12,
  background: "color-mix(in oklab, var(--figaro-on-primary) 9%, transparent)",
  border: "1px solid color-mix(in oklab, var(--figaro-on-primary) 16%, transparent)",
};

function Aparelho({ children, nome }: { children: ReactNode; nome: string }) {
  return (
    <div
      className="entrada-demo"
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
        overflow: "hidden",
        padding: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </div>
  );
}

function CabecalhoDemo({ icone: Icone, titulo, detalhe }: { icone: typeof Globe; titulo: string; detalhe: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)", color: "var(--figaro-on-primary)" }}
        >
          <Icone size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <b className="block truncate text-xs">{titulo}</b>
          <span style={suave}>{detalhe}</span>
        </div>
      </div>
      <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>
        Ativo
      </span>
    </div>
  );
}

export function DemoSite() {
  return (
    <Aparelho nome="Página pública do Flow com apresentação do negócio, serviços e ação de agendamento">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Globe} titulo="Studio Flow Concept" detalhe="Página pública do negócio" />
        <div className="rounded-xl p-3" style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 11%, transparent)" }}>
          <div className="mb-2 flex items-center gap-1 text-[10px]" style={{ color: "var(--figaro-on-primary)", opacity: 0.75 }}>
            <MapPin size={11} aria-hidden /> Jardins · São Paulo
          </div>
          <b className="block text-sm">Seu próximo atendimento começa aqui</b>
          <p className="mt-1 text-[10px] leading-relaxed" style={suave}>Conheça os serviços, veja os detalhes e escolha seu melhor horário.</p>
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={suave}>Serviços em destaque</p>
          <div className="flex items-center justify-between gap-2 rounded-xl p-2.5" style={cartao}>
            <div className="flex min-w-0 items-center gap-2">
              <HandHelping size={16} aria-hidden />
              <div className="min-w-0"><b className="block truncate text-[11px]">Atendimento completo</b><span style={suave}>45 min · Profissional</span></div>
            </div>
            <b className="shrink-0 text-xs">R$ 85</b>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-xs font-bold" style={{ background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" }}>
          <Sparkles size={14} aria-hidden /> Agendar horário online
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAgendamento() {
  return (
    <Aparelho nome="Agendamento online em três passos com horário confirmado">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={Clock3} titulo="Escolha seu horário" detalhe="Agendamento online" />
        <div className="flex items-center gap-1.5">
          {["Serviço", "Horário", "Confirmação"].map((etapa, i) => (
            <div key={etapa} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="grid size-6 place-items-center rounded-full text-[10px] font-bold" style={{ background: i === 2 ? "var(--figaro-tertiary)" : "var(--figaro-primary-container)", color: i === 2 ? "var(--figaro-on-tertiary)" : "var(--figaro-on-primary-container)" }}>
                {i < 2 ? <Check size={12} /> : "3"}
              </span>
              <span className="text-[9px]" style={suave}>{etapa}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={cartao}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider" style={suave}>Horários disponíveis</p>
          <div className="grid grid-cols-3 gap-1.5">
            {["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"].map((hora, i) => (
              <span key={hora} className="rounded-lg px-1 py-2 text-center text-[10px] font-semibold" style={i === 2 ? { background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)" } : { background: "color-mix(in oklab, var(--figaro-on-primary) 8%, transparent)", color: "var(--figaro-on-primary)" }}>
                {hora}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-xl p-2.5" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold"><Check size={14} /> Horário reservado!</span>
          <span className="text-[10px] font-semibold">14:00</span>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoWhatsApp() {
  const reduzir = useReducedMotion();
  return (
    <Aparelho nome="Lembrete no WhatsApp com ações para confirmar ou remarcar">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={MessageCircle} titulo="Lembrete automático" detalhe="Notificação do atendimento" />
        <motion.div
          initial={reduzir ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduzir ? 0.12 : 0.22 }}
          className="space-y-2 rounded-xl p-3"
          style={{ background: "color-mix(in oklab, var(--whatsapp) 18%, var(--figaro-primary))", border: "1px solid color-mix(in oklab, var(--whatsapp) 35%, transparent)" }}
        >
          <p className="text-[11px] leading-relaxed">Olá, <b>Lucas</b>! Seu horário é hoje às <b>14:00</b>. Podemos confirmar seu atendimento?</p>
          <div className="flex items-center justify-end gap-1 text-[9px]" style={suave}><Clock3 size={10} /> 09:01 · Enviado</div>
        </motion.div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>
            <Check size={13} /> 1 · Confirmar horário
          </div>
          <div className="rounded-lg px-2 py-2 text-center text-[11px] font-semibold" style={{ background: "color-mix(in oklab, var(--figaro-on-primary) 8%, transparent)", color: "var(--figaro-on-primary)" }}>
            2 · Remarcar
          </div>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAgenda() {
  const reduzir = useReducedMotion();
  return (
    <Aparelho nome="Agenda do Flow com timeline em tempo real e modo foco">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={CalendarDays} titulo="Terça-feira · Hoje" detalhe="3 atendimentos restantes" />
        <div className="space-y-2">
          <motion.div
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduzir ? 0.12 : 0.22 }}
            className="rounded-xl p-3"
            style={{ background: "color-mix(in oklab, var(--figaro-tertiary) 16%, transparent)", border: "1px solid var(--figaro-tertiary)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <b className="text-[11px]">14:00 · Atendimento</b>
              <span className="text-[10px] font-bold" style={{ color: "var(--figaro-tertiary)" }}>R$ 85</span>
            </div>
            <p className="mt-1 text-[10px]" style={suave}>Lucas Silveira</p>
            <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold" style={{ color: "var(--sage)" }}>● Em andamento</span>
          </motion.div>
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-[10px]" style={cartao}>
            <span>15:00 · Próximo atendimento</span><b style={{ color: "var(--figaro-tertiary)" }}>Em 45 min</b>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px]" style={suave}>
          <Clock3 size={12} /> Timeline sincronizada em tempo real
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoCaixa() {
  const reduzir = useReducedMotion();
  return (
    <Aparelho nome="Fechamento de comanda com Pix recebido e total do caixa">
      <div className="w-full max-w-[280px] space-y-3">
        <CabecalhoDemo icone={CreditCard} titulo="Fechar atendimento" detalhe="COMANDA #4082" />
        <div className="rounded-xl p-3" style={cartao}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={suave}>Resumo da comanda</span>
            <span className="rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: "var(--sage-soft)", color: "var(--sage)" }}>PAGO</span>
          </div>
          <div className="space-y-2 text-[10px]" style={{ color: "var(--figaro-on-primary)" }}>
            <div className="flex justify-between"><span style={suave}>Serviço realizado</span><b>R$ 55,00</b></div>
            <div className="flex justify-between"><span style={suave}>Produto / adicional</span><b>R$ 42,00</b></div>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t pt-3" style={{ borderColor: "color-mix(in oklab, var(--figaro-on-primary) 18%, transparent)" }}>
            <span className="text-[10px]" style={suave}>Total recebido</span>
            <b className="text-xl tabular-nums">R$ 97,00</b>
          </div>
        </div>
        <motion.div
          initial={reduzir ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduzir ? 0.12 : 0.22 }}
          className="flex items-center justify-center gap-1.5 rounded-xl p-2.5 text-[11px] font-bold"
          style={{ background: "var(--sage-soft)", color: "var(--sage)" }}
        >
          <Check size={14} /> Pix recebido e confirmado
        </motion.div>
      </div>
    </Aparelho>
  );
}
