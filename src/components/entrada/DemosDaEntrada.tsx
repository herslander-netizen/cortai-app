import type { CSSProperties, ReactNode } from "react";

/**
 * Demonstrações animadas da tela de entrada. São feitas só com CSS (transform/opacity) e não
 * usam foto nem vídeo: cada uma conta, em loop curto, o que o passo promete.
 * Os tempos ficam em `.entrada-demo` no styles.css.
 */

function Aparelho({ children, nome }: { children: ReactNode; nome: string }) {
  return (
    <div
      className="entrada-demo"
      role="img"
      aria-label={nome}
      style={
        {
          background: "var(--identity-deep)",
          color: "var(--identity-white)",
          borderRadius: 18,
          margin: 10,
          width: "calc(100% - 20px)",
          height: "calc(100% - 20px)",
          padding: 10,
          "--entrada-suave": "var(--identity-muted)",
          "--ec": "var(--figaro-primary)",
          "--er": "var(--flow-rosa, #f48fb1)",
        } as CSSProperties
      }
    >
      <div style={{ width: "100%", transform: "scale(0.78)", transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}

export function DemoSeuSite() {
  return (
    <Aparelho nome="Uma página de negócio sendo montada: capa, serviços e botão de agendar">
      <div className="ed-site">
        <div className="ed-site-capa" />
        <div className="ed-site-logo" />
        <div className="ed-linha ed-linha--titulo" />
        <div className="ed-linha ed-linha--meia" />
        <div className="ed-site-servicos">
          <span />
          <span />
          <span />
        </div>
        <div className="ed-site-botao">Agendar</div>
      </div>
    </Aparelho>
  );
}

export function DemoAgendar() {
  const horas = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
  return (
    <Aparelho nome="Um cliente escolhe um horário livre e o agendamento é confirmado">
      <div className="ed-agendar">
        <div className="ed-agendar-dias">
          {["S", "T", "Q", "Q", "S"].map((d, i) => (
            <span key={i} data-ativo={i === 2 ? "" : undefined}>
              {d}
            </span>
          ))}
        </div>
        <div className="ed-agendar-horas">
          {horas.map((h, i) => (
            <span
              key={h}
              data-alvo={i === 3 ? "" : undefined}
              data-ocupado={i === 1 ? "" : undefined}
            >
              {h}
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
    <Aparelho nome="Mensagens de lembrete chegando e o cliente confirmando presença">
      <div className="ed-lembretes">
        <div className="ed-balao ed-balao--1">
          Oi, Ana! Amanhã às 10:30 você tem horário. Confirma?
        </div>
        <div className="ed-balao ed-balao--2">Confirmo ✓</div>
        <div className="ed-balao ed-balao--3">Tudo certo! Te esperamos.</div>
      </div>
    </Aparelho>
  );
}

export function DemoAvaliacoes() {
  const barras = [92, 70, 38, 16, 8];
  return (
    <Aparelho nome="Estrelas de avaliação sendo preenchidas e barras de nota crescendo">
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
    <Aparelho nome="Gráfico de faturamento crescendo ao longo da semana">
      <div className="ed-desempenho">
        <div className="ed-desempenho-valor">
          <small>Faturamento</small>
          <b>R$ 12.480</b>
        </div>
        <div className="ed-desempenho-colunas" aria-hidden>
          {[34, 48, 42, 62, 70, 88, 100].map((h, i) => (
            <span key={i} style={{ ["--h" as string]: `${h}%`, ["--i" as string]: i }} />
          ))}
        </div>
      </div>
    </Aparelho>
  );
}
