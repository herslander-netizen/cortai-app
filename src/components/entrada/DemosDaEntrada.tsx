import type { CSSProperties, ReactNode } from "react";

function Aparelho({
  children,
  nome,
}: {
  children: ReactNode;
  nome: string;
}) {
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
        "--entrada-suave": "var(--figaro-on-primary)",
        "--ec": "var(--figaro-primary)",
        "--er": "var(--figaro-tertiary)",
      } as CSSProperties}
    >
      <style>{`
        @keyframes flow-card-shift { 0%,18% { transform:translateY(-10px); } 52%,100% { transform:translateY(8px); } }
        @keyframes flow-pill-in { 0%,35% { opacity:0; transform:scale(.8); } 58%,100% { opacity:1; transform:scale(1); } }
        @keyframes flow-ticket { 0%,18% { opacity:0; transform:translateY(18px) rotate(2deg); } 48%,100% { opacity:1; transform:translateY(0) rotate(0); } }
        @keyframes flow-message { 0%,20% { opacity:0; transform:translateY(12px); } 48%,100% { opacity:1; transform:translateY(0); } }
        @keyframes flow-bar { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes flow-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(72,187,120,0); } 50% { box-shadow:0 0 0 5px rgba(72,187,120,.12); } }
      `}</style>
      <div style={{ width: "100%", maxWidth: 270 }}>{children}</div>
    </div>
  );
}

const cartao: CSSProperties = {
  borderRadius: 16,
  padding: 13,
  background: "color-mix(in oklab, var(--figaro-on-primary) 9%, transparent)",
  border: "1px solid color-mix(in oklab, var(--figaro-on-primary) 12%, transparent)",
};

const textoSuave: CSSProperties = { opacity: 0.62, fontSize: 10, fontWeight: 600 };

export function DemoAgenda() {
  return (
    <Aparelho nome="Cartão de agendamento deslizando meia hora na agenda e recebendo confirmação">
      <div style={{ ...cartao, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
          <b style={{ fontSize: 13 }}>Quarta-feira, 21</b>
          <span style={textoSuave}>AGENDA</span>
        </div>
        {["09:00", "09:30", "10:00", "10:30"].map((hora, i) => (
          <div key={hora} style={{ height: 38, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ ...textoSuave, width: 34 }}>{hora}</span>
            {i === 2 ? (
              <div style={{ flex: 1, borderRadius: 9, padding: "8px 10px", background: "var(--figaro-tertiary)", color: "var(--figaro-on-tertiary)", fontSize: 10, fontWeight: 700, animation: "flow-card-shift 3.8s ease-in-out infinite" }}>
                Atendimento · 30 min
              </div>
            ) : null}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 5 }}>
          <span style={{ ...textoSuave, color: "#86efac", animation: "flow-pill-in 3.8s ease-out infinite" }}>● Confirmado</span>
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoCaixa() {
  return (
    <Aparelho nome="Tela de caixa com Pix selecionado e comprovante de pagamento sendo emitido">
      <div style={{ ...cartao, padding: 15 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
          <b style={{ fontSize: 14 }}>Fechar atendimento</b><span style={textoSuave}>CAIXA</span>
        </div>
        <div style={{ ...textoSuave, marginBottom: 5 }}>Total do atendimento</div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>R$ 85,00</div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1, border: "1px solid #86efac", borderRadius: 10, padding: 10, color: "#bbf7d0", fontSize: 11, fontWeight: 700 }}>✓ Pix</div>
          <div style={{ flex: 1, border: "1px solid rgba(255,255,255,.14)", borderRadius: 10, padding: 10, fontSize: 11, opacity: .6 }}>Cartão</div>
        </div>
        <div style={{ marginTop: 12, padding: 11, borderRadius: 10, background: "rgba(134,239,172,.12)", color: "#bbf7d0", fontSize: 11, fontWeight: 700, textAlign: "center", animation: "flow-ticket 3.8s ease-out infinite" }}>
          ✓ Pagamento registrado · R$ 85,00
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoWhatsApp() {
  return (
    <Aparelho nome="Mensagem de WhatsApp com opções de confirmar ou remarcar um horário">
      <div style={{ ...cartao, background: "#123d35", padding: 14, color: "#f0fdf4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ width: 26, height: 26, borderRadius: 99, background: "#25d366" }} />
          <div><b style={{ display: "block", fontSize: 12 }}>Flow · Notificações</b><span style={{ fontSize: 9, opacity: .7 }}>WhatsApp Business</span></div>
        </div>
        <div style={{ maxWidth: "94%", padding: 12, borderRadius: "4px 13px 13px 13px", background: "#1d5548", fontSize: 11, lineHeight: 1.55, animation: "flow-message 3.8s ease-out infinite" }}>
          Oi, Ana! Seu horário é amanhã às 10h. Podemos confirmar?
          <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span style={{ borderRadius: 7, padding: 7, textAlign: "center", background: "#26745b", fontWeight: 700 }}>1 · Confirmar</span>
            <span style={{ borderRadius: 7, padding: 7, textAlign: "center", background: "#26745b", fontWeight: 700 }}>2 · Remarcar</span>
          </div>
        </div>
        <div style={{ marginTop: 8, textAlign: "right", fontSize: 9, opacity: .65 }}>Entregue · agora</div>
      </div>
    </Aparelho>
  );
}

export function DemoClientes() {
  return (
    <Aparelho nome="Ficha de cliente com frequência de visitas e preferência de serviços">
      <div style={{ ...cartao, padding: 15 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 99, background: "linear-gradient(135deg,#A8C7FA,#BB86FC)", display: "grid", placeItems: "center", color: "#171923", fontWeight: 800 }}>AM</div>
          <div><b style={{ display: "block", fontSize: 13 }}>Ana Martins</b><span style={textoSuave}>Cliente desde 2024</span></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ borderRadius: 10, padding: 10, background: "rgba(255,255,255,.07)" }}><b style={{ display: "block", fontSize: 20 }}>18</b><span style={textoSuave}>visitas</span></div>
          <div style={{ borderRadius: 10, padding: 10, background: "rgba(255,255,255,.07)" }}><b style={{ display: "block", fontSize: 20 }}>15 dias</b><span style={textoSuave}>frequência média</span></div>
        </div>
        <div style={{ marginTop: 13, fontSize: 10, opacity: .7 }}>PREFERÊNCIA DE SERVIÇO</div>
        <div style={{ marginTop: 6, borderRadius: 9, padding: 10, background: "rgba(168,199,250,.14)", fontSize: 11, fontWeight: 700 }}>Design de sobrancelhas</div>
      </div>
    </Aparelho>
  );
}

export function DemoMetricas() {
  const valores = [35, 48, 42, 62, 70, 84, 100];
  return (
    <Aparelho nome="Painel de métricas com barras de faturamento crescendo e indicador de alta">
      <div style={{ ...cartao, padding: 15 }}>
        <div style={{ ...textoSuave, marginBottom: 5 }}>FATURAMENTO DO MÊS</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
          <b style={{ fontSize: 25 }}>R$ 12.480</b>
          <span style={{ color: "#86efac", fontSize: 11, fontWeight: 800, animation: "flow-pulse 2.5s infinite" }}>↗ 18,6%</span>
        </div>
        <div style={{ height: 112, display: "flex", alignItems: "end", gap: 7, marginTop: 18, borderBottom: "1px solid rgba(255,255,255,.2)", paddingBottom: 5 }}>
          {valores.map((v, i) => (
            <span key={i} style={{ height: `${v}%`, flex: 1, borderRadius: "5px 5px 0 0", background: i === valores.length - 1 ? "var(--figaro-tertiary)" : "rgba(168,199,250,.65)", transformOrigin: "bottom", animation: `flow-bar 1.1s ${i * 90}ms cubic-bezier(.2,.8,.2,1) both` }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, ...textoSuave }}><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span></div>
      </div>
    </Aparelho>
  );
}
