import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, MessageCircle, TrendingUp, Check, Clock3, Sparkles, ArrowUpRight, Scissors } from "lucide-react";

const azul = "#A8C7FA";
const rosa = "#F48FB1";
const verde = "#86D6B0";
const suave: CSSProperties = { opacity: .62, fontSize: 10, fontWeight: 600 };
const cartao: CSSProperties = {
  borderRadius: 16,
  padding: 13,
  background: "color-mix(in oklab, var(--figaro-on-primary) 8%, transparent)",
  border: "1px solid color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
};

function Aparelho({ children, nome }: { children: ReactNode; nome: string }) {
  return (
    <div className="entrada-demo" role="img" aria-label={nome} style={{
      background: "var(--figaro-primary)", color: "var(--figaro-on-primary)",
      borderRadius: 20, margin: 10, width: "calc(100% - 20px)",
      height: "calc(100% - 20px)", boxSizing: "border-box", overflow: "hidden",
      padding: 12, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </div>
  );
}

export function DemoAgenda() {
  const reduzir = useReducedMotion();
  return <Aparelho nome="Agenda do Flow com atendimento em andamento e confirmação">
    <div style={{ width: "100%", maxWidth: 280 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", color: azul, background: "rgba(168,199,250,.12)" }}><CalendarDays size={16} /></span>
          <div><b style={{ display: "block", fontSize: 12 }}>Hoje, 14:00</b><span style={suave}>4 atendimentos restantes</span></div>
        </div>
        <span style={{ fontSize: 9, color: azul, border: "1px solid rgba(168,199,250,.25)", background: "rgba(168,199,250,.1)", borderRadius: 99, padding: "4px 7px" }}>MODO FOCO</span>
      </div>
      <div style={{ ...cartao, padding: 10 }}>
        {["13:30", "14:00", "15:00"].map((hora, i) => <div key={hora} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: i === 1 ? 65 : 39, borderBottom: i === 2 ? 0 : "1px solid rgba(255,255,255,.09)", opacity: i === 0 ? .48 : 1 }}>
          <span style={{ width: 34, flexShrink: 0, fontSize: 9, fontFamily: "monospace", color: i === 1 ? azul : "inherit" }}>{hora}</span>
          {i === 1 ? <motion.div initial={reduzir ? false : { opacity: 0, scale: .96, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }} style={{ flex: 1, padding: "8px 9px", borderRadius: 10, background: "linear-gradient(110deg, rgba(168,199,250,.22), rgba(187,134,252,.16))", border: "1px solid rgba(168,199,250,.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 5 }}><b style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 5 }}><Scissors size={12} color={azul} /> Serviço agendado</b><span style={{ fontSize: 9, color: azul }}>R$ 85</span></div>
            <div style={{ marginTop: 5, display: "flex", justifyContent: "space-between", fontSize: 9, opacity: .72 }}><span>Cliente · profissional</span><span style={{ color: verde }}>● Em andamento</span></div>
          </motion.div> : <div style={{ flex: 1, borderRadius: 8, padding: "8px 9px", background: "rgba(255,255,255,.045)", display: "flex", justifyContent: "space-between", fontSize: 9 }}><span>{i === 0 ? "Atendimento anterior" : "Próximo atendimento"}</span><span style={{ color: i === 0 ? verde : rosa }}>{i === 0 ? "Concluído" : "Próximo"}</span></div>}
        </div>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: 9, opacity: .62 }}><span>Próximo cliente em 45 min</span><span style={{ color: azul }}>+ Encaixe</span></div>
    </div>
  </Aparelho>;
}

export function DemoCaixa() {
  const reduzir = useReducedMotion();
  return <Aparelho nome="Caixa do Flow com serviço, item adicional e pagamento Pix registrado">
    <div style={{ width: "100%", maxWidth: 280, ...cartao, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}><div><b style={{ display: "block", fontSize: 13 }}>Fechar atendimento</b><span style={suave}>COMANDA #4082</span></div><span style={{ fontSize: 9, color: verde, borderRadius: 99, padding: "4px 8px", background: "rgba(134,214,176,.12)", border: "1px solid rgba(134,214,176,.25)" }}>PAGO</span></div>
      <div style={{ display: "grid", gap: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: .78 }}><span>Serviço realizado</span><span>R$ 55,00</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, opacity: .78 }}><span>Produto / adicional</span><span>R$ 42,00</span></div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontSize: 10, opacity: .6 }}>Total recebido</span><b style={{ fontSize: 19, fontFamily: "monospace" }}>R$ 97,00</b></div>
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 12 }}><span style={{ flex: 1, textAlign: "center", borderRadius: 9, padding: 8, color: verde, border: "1px solid rgba(134,214,176,.45)", background: "rgba(134,214,176,.1)", fontSize: 10, fontWeight: 700 }}>✓ Pix</span><span style={{ flex: 1, textAlign: "center", borderRadius: 9, padding: 8, border: "1px solid rgba(255,255,255,.12)", fontSize: 10, opacity: .6 }}>Cartão</span></div>
      <motion.div initial={reduzir ? false : { opacity: 0, y: 12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .55, delay: .15 }} style={{ marginTop: 11, borderRadius: 9, padding: 9, background: "rgba(134,214,176,.12)", border: "1px solid rgba(134,214,176,.24)", color: verde, textAlign: "center", fontSize: 10, fontWeight: 700 }}><Check size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />Pagamento registrado</motion.div>
    </div>
  </Aparelho>;
}

export function DemoWhatsApp() {
  const reduzir = useReducedMotion();
  return <Aparelho nome="Demonstração de lembrete com opções para confirmar ou remarcar">
    <div style={{ width: "100%", maxWidth: 280, ...cartao, background: "#17382F", color: "#F2FFF8", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}><span style={{ width: 29, height: 29, borderRadius: 10, background: "rgba(134,214,176,.16)", color: verde, display: "grid", placeItems: "center" }}><MessageCircle size={16} /></span><div><b style={{ display: "block", fontSize: 12 }}>Lembrete automático</b><span style={{ fontSize: 9, opacity: .65 }}>Canal de notificações</span></div><span style={{ marginLeft: "auto", fontSize: 9, opacity: .6 }}>24h antes</span></div>
      <motion.div initial={reduzir ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 350, damping: 25, delay: .1 }} style={{ padding: 12, borderRadius: "5px 14px 14px 14px", background: "#205044", fontSize: 10, lineHeight: 1.55 }}>
        Olá, <b style={{ color: "#B8F0D1" }}>Gabriel</b>! Seu horário é amanhã às <b>10:30</b>. Podemos confirmar?
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 8, fontSize: 9, opacity: .6 }}><Clock3 size={11} />09:00 · Enviado</div>
        <div style={{ display: "grid", gap: 6, marginTop: 9, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.12)" }}><span style={{ borderRadius: 7, padding: 7, textAlign: "center", background: "rgba(134,214,176,.17)", color: "#B8F0D1", fontWeight: 700 }}><Check size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />1 · Confirmar</span><span style={{ borderRadius: 7, padding: 7, textAlign: "center", background: "rgba(255,255,255,.07)" }}>2 · Remarcar</span></div>
      </motion.div>
      <div style={{ marginTop: 10, textAlign: "center", fontSize: 9, opacity: .62, display: "flex", justifyContent: "center", alignItems: "center", gap: 5 }}><Sparkles size={11} color={rosa} />Menos tarefas manuais no dia a dia</div>
    </div>
  </Aparelho>;
}

export function DemoClientes() {
  return <Aparelho nome="Ficha de cliente com histórico, frequência e preferências de atendimento">
    <div style={{ width: "100%", maxWidth: 280, ...cartao, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.1)" }}><div style={{ width: 40, height: 40, borderRadius: 99, background: "linear-gradient(135deg,#A8C7FA,#BB86FC)", display: "grid", placeItems: "center", color: "#171923", fontWeight: 800, fontSize: 12 }}>RA</div><div><b style={{ display: "block", fontSize: 12 }}>Rodrigo Alves</b><span style={suave}>Cliente · 18 visitas</span></div><span style={{ marginLeft: "auto", color: rosa, fontSize: 9, fontWeight: 700 }}>VIP</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <div style={{ borderRadius: 10, padding: 10, background: "rgba(255,255,255,.06)" }}><span style={suave}>ÚLTIMO SERVIÇO</span><b style={{ display: "block", fontSize: 11, marginTop: 5 }}>Atendimento completo</b><span style={{ fontSize: 9, color: azul }}>Há 12 dias</span></div>
        <div style={{ borderRadius: 10, padding: 10, background: "rgba(255,255,255,.06)" }}><span style={suave}>FREQUÊNCIA</span><b style={{ display: "block", fontSize: 18, marginTop: 5 }}>15 dias</b><span style={{ fontSize: 9, color: verde }}>Regular</span></div>
      </div>
      <div style={{ marginTop: 12, fontSize: 9, opacity: .62 }}>PREFERÊNCIA DE ATENDIMENTO</div><div style={{ marginTop: 5, borderRadius: 9, padding: 9, background: "rgba(168,199,250,.12)", border: "1px solid rgba(168,199,250,.18)", fontSize: 10, fontWeight: 700 }}>Serviço e profissional favoritos</div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, opacity: .75 }}><span>Ciclo de retorno estimado</span><b style={{ color: azul }}>Em 3 dias</b></div>
    </div>
  </Aparelho>;
}

export function DemoMetricas() {
  const reduzir = useReducedMotion();
  const valores = [35, 50, 45, 70, 60, 85, 100];
  return <Aparelho nome="Painel de faturamento e métricas com evolução semanal">
    <div style={{ width: "100%", maxWidth: 280, ...cartao, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 29, height: 29, borderRadius: 10, background: "rgba(134,214,176,.12)", color: verde, display: "grid", placeItems: "center" }}><TrendingUp size={16} /></span><div><b style={{ display: "block", fontSize: 11 }}>Faturamento do mês</b><span style={suave}>Meta mensal · 82%</span></div></div><span style={{ color: verde, background: "rgba(134,214,176,.1)", borderRadius: 99, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}><ArrowUpRight size={11} style={{ verticalAlign: "middle" }} />+28,4%</span></div>
      <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -1 }}>R$ 14.850<span style={{ fontSize: 13, opacity: .5 }}>,00</span></div>
      <div style={{ display: "flex", alignItems: "end", gap: 7, height: 100, marginTop: 15, paddingBottom: 5, borderBottom: "1px solid rgba(255,255,255,.13)" }}>
        {valores.map((valor, i) => <div key={i} style={{ height: "100%", flex: 1, display: "flex", alignItems: "end", background: "rgba(255,255,255,.04)", borderRadius: "5px 5px 0 0" }}><motion.div initial={reduzir ? false : { height: 0 }} animate={{ height: valor + "%" }} transition={reduzir ? { duration: 0 } : { duration: .65, delay: i * .05, ease: "easeOut" }} style={{ width: "100%", borderRadius: "5px 5px 0 0", background: i === 6 ? "linear-gradient(0deg,#A8C7FA,#BB86FC)" : "rgba(168,199,250,.5)" }} /></div>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, ...suave }}><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
      <div style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", fontSize: 9, opacity: .65 }}><span>Equipe e operação</span><span style={{ color: azul }}>Visão completa</span></div>
    </div>
  </Aparelho>;
}
