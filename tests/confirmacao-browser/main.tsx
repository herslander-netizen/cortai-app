import { useState } from "react";
import { createRoot } from "react-dom/client";

import { ConfirmacaoAgendamento, type SituacaoPublica } from "../../src/components/agendamento/ConfirmacaoAgendamento";
import type { ConfirmacaoPublica } from "../../src/lib/agendamento-publico.functions";
import "../../src/styles.css";

const confirmacao: ConfirmacaoPublica = {
  agendamentoId: "00000000-0000-4000-8000-000000000001",
  preferenciasToken: "a".repeat(64),
  inicio: "2026-11-14T17:00:00Z",
  fim: "2026-11-14T18:00:00Z",
  cliente: "Cliente Fictício",
  servico: "Hidratação profunda",
  profissional: "Marina Costa",
  barbearia: "Bella Rosa Studio de Beleza",
  endereco: "Rua das Acácias, 120 — Jardins, Aracaju/SE",
  whatsapp: null,
  valor_centavos: 9500,
};

function App() {
  const [situacao, setSituacao] = useState<SituacaoPublica>("confirmado");
  const [gestao, setGestao] = useState<string>("");
  const [escuro, setEscuro] = useState(true);
  return (
    <div
      className="agendamento-marca"
      data-testid="demo"
      style={{
        "--chat-page": escuro ? "#292929" : "#F1F5F1",
        "--chat-page-text": escuro ? "#ECECE6" : "#262B28",
        "--chat-superficie-1": escuro ? "#303631" : "#E3EBE6",
        "--chat-primary": escuro ? "#CDB993" : "#2467BB",
        "--chat-primary-foreground": escuro ? "#172030" : "#FFFFFF",
        "--chat-texto-auxiliar": escuro ? "#ADAFA9" : "#626962",
      } as React.CSSProperties}
    >
      <nav className="mx-auto flex max-w-[520px] gap-2 px-5 pt-2" aria-label="Controles da bancada">
        <button data-testid="tema" type="button" onClick={() => setEscuro((x) => !x)}>
          {escuro ? "Tema claro" : "Tema escuro"}
        </button>
        <button data-testid="cancelar-fake" type="button" onClick={() => setSituacao("cancelado")}>
          Estado cancelado
        </button>
        <button data-testid="confirmar-fake" type="button" onClick={() => setSituacao("confirmado")}>
          Estado confirmado
        </button>
      </nav>
      <ConfirmacaoAgendamento
        confirmacao={confirmacao}
        situacao={situacao}
        fuso="America/Sao_Paulo"
        assinaturaVisivel
        onAlterar={() => setGestao("alterar")}
        onCancelar={() => setSituacao("cancelado")}
        onNovo={() => setGestao("novo")}
        extras={
          <>
            <section aria-labelledby="demo-preferencias" className="rounded-[20px] border border-line bg-ink2 p-4">
              <h2 id="demo-preferencias" className="text-base font-bold">Deixe seu atendimento do seu jeito</h2>
              <p className="mt-1 text-sm text-mute">Seu horário já está confirmado. Preferências opcionais.</p>
              <button className="mt-3 min-h-12 rounded-full border border-line px-4" type="button">Personalizar atendimento</button>
            </section>
            <section aria-label="Comanda" className="confirmacao-comanda">
              <p className="font-semibold">Comanda #12112026-2148-1061</p>
              <p className="text-sm text-mute">Pendente</p>
            </section>
          </>
        }
      />
      <div data-testid="gestao" className="sr-only">{gestao}</div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
