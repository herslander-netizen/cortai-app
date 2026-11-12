import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rota = readFileSync("src/routes/agendar.$slug.tsx", "utf8");
const figaro = readFileSync("src/components/agendamento/ReservaFigaro.tsx", "utf8");
const chat = readFileSync("src/components/agendamento/AgendamentoChat.tsx", "utf8");
const site = readFileSync("src/components/marca/modelos/SiteCompleto.tsx", "utf8");
const pagina = readFileSync("src/components/marca/PaginaPublica.tsx", "utf8");
const raizes = readFileSync("src/components/marca/modelos/Raizes.tsx", "utf8");
const css = readFileSync("src/styles.css", "utf8");

describe("fluxos de atendimento e movimento das páginas para clientes", () => {
  it("reserva confirmada permanece acessível depois que o estabelecimento desativa novas reservas", () => {
    const guarda = rota.indexOf("if (\n    !confirmado &&\n    (limiteAtingido");
    const comprovante = rota.indexOf("if (confirmado && modeloFigaro");
    expect(guarda).toBeGreaterThan(0);
    expect(comprovante).toBeGreaterThan(guarda);
    expect(rota).toContain("onCancelar={() => cancelar.mutate()}");
    expect(rota).toContain("onAlterar={() => {");
  });

  it("modelos de site compartilham a rota com serviço escolhido", () => {
    expect(pagina).toContain("search={{ ...buscaParaAgendar(origem), servico: servico.id }}");
    expect(site).toContain('renderAgendar("fg-btn-linha", "Agendar", s.id)');
    expect(raizes).toContain('renderAgendar("rz-link-agendar", "Agendar", s.id)');
  });

  it("Reserva Figaro respeita exceções e oferece confirmação com estado de carregamento", () => {
    expect(rota).toContain("intervalosPorData={data.intervalosPorData}");
    expect(figaro).toContain("intervalosPorData: p.intervalosPorData");
    expect(figaro).toContain('data-etapa="servicos"');
    expect(figaro).toContain('data-etapa="dados"');
    expect(figaro).toContain('data-etapa="horarios"');
    expect(figaro).toContain("p.setProfissionalId(null)");
    expect(figaro).toContain("loading={p.enviando}");
  });

  it("Site, Chat, Clássica, Raízes e reserva têm movimento leve com redução de movimento", () => {
    expect(site).toContain("function SecaoComMovimento");
    expect(site).toContain("viewport={{ once: true, amount: 0.12 }}");
    expect(chat).toContain("key={etapa}");
    expect(chat).toContain("initial={reduzirMovimento ? false");
    expect(chat).toContain("<TypingIndicator />");
    expect(pagina).toContain("useReducedMotion");
    expect(raizes).toContain("function Aparece(");
    expect(css).toContain("@keyframes flow-publico-entrar");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("motor público segue com conflito, verificação do telefone e confirmação", () => {
    expect(rota).toContain("agendarComoConvidado({");
    expect(rota).toContain('if (res.tipo === "conflito")');
    expect(rota).toContain('if (res.tipo === "verificar")');
    expect(rota).toContain("setConfirmado(res.confirmacao)");
    expect(rota).toContain("aoConfirmar={concluirComTelefoneConfirmado}");
  });
});
