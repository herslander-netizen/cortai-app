import { Aparelho, CabecalhoDemo, cartaoDemo as cartao, suaveDemo as suave } from "./DemoFrame";
import { CalendarDays, Check, Clock3, Globe, HandHelping, MapPin, Sparkles } from "lucide-react";

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
