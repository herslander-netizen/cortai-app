import { describe, expect, it } from "vitest";

import fluxo from "./atendimento.json";
import perfil from "./perfil.json";
import { PerfilDeRealidade, realidadeDeExemplo } from "../nucleo/contratos";
import { compilar, novaSessao, processar, type Sessao } from "../nucleo/motor";
import { semRegraReconhecida } from "../decisao";

const PERFIL = PerfilDeRealidade.parse(perfil);
const PLANO = compilar(fluxo, { perfis: [PERFIL] });
const REALIDADE = realidadeDeExemplo(PERFIL);
const AGORA = Date.parse("2026-11-08T13:00:00Z");

function conversar(texto: string, sessao: Sessao = novaSessao(PLANO.doc.flow.id), i = 0) {
  return processar(
    PLANO,
    sessao,
    { type: "message", id: "msg-" + i + "-" + texto, at: AGORA + i * 1000, text: texto },
    { realidade: REALIDADE },
  );
}

function mensagens(r: ReturnType<typeof conversar>): string[] {
  return r.acoes
    .filter((a) => a.type === "send_text" || a.type === "send_quick_replies")
    .map((a) => a.text);
}

describe("menu padrão WhatsApp unificado", () => {
  it("compila com o catálogo vigente, sem arestas órfãs nem mensagens de agendamento pelo site", () => {
    expect(PLANO.nos.size).toBe(fluxo.nodes.length);
    expect(JSON.stringify(fluxo)).not.toContain("reality.bookingLink");
    expect(JSON.stringify(fluxo)).not.toContain("https://");
    expect(fluxo.nodes.some((n) => n.id === "agendar-sem-proximo")).toBe(false);
    expect(fluxo.nodes.some((n) => n.id === "tem-proximo-horario")).toBe(false);
  });

  it("ao cumprimentar oferece menu e aguarda a escolha", () => {
    const r = conversar("Oi");
    expect(r.sessao.status).toBe("waiting_input");
    expect(r.sessao.cursor).toBe("espera-menu");
    expect(mensagens(r).join("\n")).toContain("Como posso ajudar?");
    expect(
      r.acoes.some((a) => a.type === "send_quick_replies" &&
        a.options.some((o) => o.value === "1" && o.label === "Agendar aqui pelo WhatsApp")),
    ).toBe(true);
  });

  it.each([
    ["1", "Certo! Vou chamar alguém da equipe", true],
    ["2", "Serviços de", false],
    ["3", "Horário:", false],
    ["4", "Certo! Vou chamar alguém da equipe", true],
  ])("opção %s continua válida e não envia links de agendamento", (opcao, trecho, handoff) => {
    const saudacao = conversar("Oi");
    const r = conversar(opcao, saudacao.sessao, 1);
    expect(mensagens(r).join("\n")).toContain(trecho);
    expect(r.acoes.some((a) => a.type === "handoff")).toBe(handoff);
    expect(mensagens(r).join("\n")).not.toContain("https://");
  });

  it.each([
    ["qual o preço?", "Serviços de"],
    ["onde fica?", "Estamos em"],
    ["que horas abre?", "Estamos abertos"],
    ["aceita pix?", "Aceitamos"],
    ["quero atendente", "Certo! Vou chamar alguém da equipe"],
  ])("intenção direta %s usa o caminho correto", (texto, esperado) => {
    const r = conversar(texto);
    expect(mensagens(r).join("\n")).toContain(esperado);
    expect(mensagens(r).join("\n")).not.toContain("https://");
  });

  it("pedido de agendamento sem motor disponível é transferido à equipe, nunca ao link legado", () => {
    // No app, o condutor da agenda intercepta AGENDAR antes de executar este plano.
    // Este teste cobre a falha desse condutor: o caminho de reserva antigo não deve reaparecer.
    const r = conversar("quero agendar");
    expect(r.acoes.some((a) => a.type === "handoff")).toBe(true);
    expect(mensagens(r).join("\n")).not.toContain("https://");
  });

  it("assunto livre continua elegível à Flow IA, sem impor o menu antigo", () => {
    const r = conversar("obrigado");
    expect(semRegraReconhecida(r.passos)).toBe(true);
  });
});
