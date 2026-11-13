import { useState } from "react";
import { createRoot } from "react-dom/client";

import { ConfirmacaoAgendamento, type SituacaoPublica } from "../../src/components/agendamento/ConfirmacaoAgendamento";
import type { ConfirmacaoPublica } from "../../src/lib/agendamento-publico.functions";
import { aplicarTema, normalizarPagina } from "../../src/lib/pagina-config";
import { estiloDaConfirmacao, varianteDaConfirmacao } from "../../src/lib/tema-da-confirmacao";
import { atributosDaAgendaDireta } from "../../src/lib/tema-da-agenda-direta";
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

const CENARIOS = {
  "figaro-rock": {
    tema: "figaro-rock-n-roll", layout: "figaro-agendamento", experiencia: "direta",
  },
  "figaro-classico": {
    tema: "figaro-classico", layout: "figaro-agendamento", experiencia: "direta",
  },
  "feminino-lavanda": {
    tema: "feminino-lavanda", layout: "figaro-agendamento", experiencia: "direta",
  },
  "vitrine-rose": {
    tema: "rose", layout: "figaro-site-completo", experiencia: "vitrine",
  },
  "vitrine-clean": {
    tema: "clean", layout: "figaro-site-completo", experiencia: "vitrine",
  },
  "chat-flow": {
    tema: "cortai", layout: "cortai-chat", experiencia: "conversa",
  },
} as const;
type Cenario = keyof typeof CENARIOS;

function App() {
  const [situacao, setSituacao] = useState<SituacaoPublica>("confirmado");
  const [gestao, setGestao] = useState<string>("");
  const [cenario, setCenario] = useState<Cenario>("figaro-rock");
  const dados = CENARIOS[cenario];
  const config = aplicarTema(normalizarPagina({
    ...dados,
    ...(cenario === "chat-flow" ? { chat: { superficie: "escura", corDestaque: "ciano" } } : {}),
  }), dados.tema);
  const fluxo = dados.experiencia === "conversa" ? "conversa" : "passo_a_passo";
  const visual = varianteDaConfirmacao(config, fluxo);

  return (
    <div
      className="agendamento-marca"
      data-testid="demo"
      data-cenario={cenario}
      style={estiloDaConfirmacao(config, visual)}
      {...atributosDaAgendaDireta(config)}
    >
      <nav className="mx-auto flex max-w-[520px] flex-wrap gap-2 px-5 pt-2" aria-label="Controles da bancada">
        <label className="sr-only" htmlFor="tema-demo">Tema de teste</label>
        <select
          id="tema-demo"
          data-testid="tema"
          value={cenario}
          onChange={(e) => setCenario(e.target.value as Cenario)}
        >
          {Object.keys(CENARIOS).map((key) => <option key={key} value={key}>{key}</option>)}
        </select>
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
        visual={visual}
        onAlterar={() => setGestao("alterar")}
        onCancelar={() => setSituacao("cancelado")}
        onNovo={() => setGestao("novo")}
        onFechar={() => setGestao("fechar")}
        avisos={null}
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
