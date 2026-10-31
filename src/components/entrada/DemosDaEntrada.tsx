import type { CSSProperties, ReactNode } from "react";

/**
 * Demonstrações animadas da tela de entrada. São feitas só com CSS (transform/opacity) e não
 * usam foto nem vídeo: cada uma conta, em loop curto, o que o passo promete.
 * O painel usa o par primary/onPrimary para manter contraste nos dois temas.
 */
function Aparelho({
  children,
  nome,
  escala = 0.78,
}: {
  children: ReactNode;
  nome: string;
  escala?: number;
}) {
  return (
    <div
      className="entrada-demo"
      role="img"
      aria-label={nome}
      style={
        {
          background: "var(--figaro-primary)",
          color: "var(--figaro-on-primary)",
          borderRadius: 20,
          margin: 10,
          width: "calc(100% - 20px)",
          height: "calc(100% - 20px)",
          boxSizing: "border-box",
          overflow: "hidden",
          padding: 8,
          "--entrada-suave": "var(--figaro-on-primary)",
          "--ec": "var(--figaro-primary)",
          "--er": "var(--figaro-tertiary)",
        } as CSSProperties
      }
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,
          transform: `scale(${escala})`,
          transformOrigin: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DemoSeuSite() {
  return (
    <Aparelho
      nome="Uma página de negócio sendo montada: capa, serviços e botão de agendar"
      escala={0.74}
    >
      <div className="ed-site" style={{ paddingBottom: 0 }}>
        <div className="ed-site-capa" style={{ height: 64 }} />
        <div
          className="ed-site-logo"
          style={{ width: 36, height: 36, margin: "-18px 0 0 14px" }}
        />
        <div className="ed-linha ed-linha--titulo" />
        <div className="ed-linha ed-linha--meia" />
        <div className="ed-site-servicos" style={{ marginTop: 8, gap: 6 }}>
          <span style={{ height: 28 }} />
          <span style={{ height: 28 }} />
          <span style={{ height: 28 }} />
        </div>
        <div className="ed-site-botao" style={{ marginTop: 8, height: 30 }}>
          Agendar
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoAgendar() {
  const horas = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  return (
    <Aparelho
      nome="Um cliente escolhe um horário livre e o agendamento é confirmado"
      escala={0.74}
    >
      <div className="ed-agendar">
        <div className="ed-agendar-dias">
          {["S", "T", "Q", "Q", "S"].map((dia, i) => (
            <span
              key={i}
              data-ativo={i === 2 ? "" : undefined}
              style={
                i === 2
                  ? {
                      background: "var(--figaro-primary-container)",
                      color: "var(--figaro-on-primary-container)",
                    }
                  : undefined
              }
            >
              {dia}
            </span>
          ))}
        </div>
        <div className="ed-agendar-horas">
          {horas.map((hora, i) => (
            <span
              key={hora}
              data-alvo={i === 3 ? "" : undefined}
              data-ocupado={i === 1 ? "" : undefined}
              style={{
                ...(i === 1 ? { opacity: 0.58 } : {}),
                ...(i === 3
                  ? {
                      background: "var(--figaro-tertiary)",
                      color: "var(--figaro-on-tertiary)",
                      animation: "ed-entra 360ms 180ms ease-out both",
                    }
                  : {}),
              }}
            >
              {hora}
            </span>
          ))}
        </div>
        <div className="ed-agendar-ok">
          <i aria-hidden />
          Horário confirmado
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoLembretes() {
  return (
    <Aparelho nome="Mensagens de lembrete chegando e o cliente confirmando presença" escala={0.82}>
      <div className="ed-lembretes">
        <div className="ed-balao ed-balao--1">
          Oi, Ana! Amanhã às 10:30 você tem horário. Confirma?
        </div>
        <div
          className="ed-balao ed-balao--2"
          style={{
            background: "var(--figaro-tertiary)",
            color: "var(--figaro-on-tertiary)",
          }}
        >
          Confirmo ✓
        </div>
        <div className="ed-balao ed-balao--3">Tudo certo! Te esperamos.</div>
      </div>
    </Aparelho>
  );
}

export function DemoAvaliacoes() {
  const barras = [92, 70, 38, 16, 8];
  return (
    <Aparelho nome="Estrelas de avaliação sendo preenchidas e barras de nota crescendo" escala={0.9}>
      <div className="ed-aval">
        <div className="ed-aval-estrelas" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <svg key={i} viewBox="0 0 24 24" style={{ ["--i" as string]: i }}>
              <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
            </svg>
          ))}
        </div>
        <div className="ed-aval-barras">
          {barras.map((b, i) => (
            <span key={i} style={{ ["--w" as string]: `${b}%`, ["--i" as string]: i }} />
          ))}
        </div>
      </div>
    </Aparelho>
  );
}

export function DemoDesempenho() {
  return (
    <Aparelho nome="Gráfico de faturamento crescendo ao longo da semana" escala={0.72}>
      <div className="ed-desempenho">
        <div className="ed-desempenho-valor">
          <small>Faturamento</small>
          <b>R$ 12.480</b>
        </div>
        <div className="ed-desempenho-colunas" aria-hidden>
          {[34, 48, 42, 62, 70, 88, 100].map((altura, i) => (
            <span key={i} style={{ ["--h" as string]: `${altura}%`, ["--i" as string]: i }} />
          ))}
        </div>
      </div>
    </Aparelho>
  );
}
