import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ia/acoes.server", () => ({ ACOES_DO_AGENTE: {} }));
import { consultarAjudaOperacional } from "./ajuda-operacional";
import { ACOES, acaoPermitida } from "./acoes.server";

const dono = { canal: "painel" as const, papel: "dono" as const, permissoes: [] as string[] };
const profissional = {
  canal: "painel" as const,
  papel: "profissional" as const,
  permissoes: ["criar_agendamento", "ver_cortai"],
};

describe("Flow Core — ajuda operacional com fontes oficiais", () => {
  it("integra a consulta ao cérebro oficial sem escrita ou exposição a clientes", async () => {
    const ctx = { tenantId: "t1", ator: "usuario-1", ...dono };
    expect(ACOES["consultar_ajuda_flow"]?.risco).toBe("leitura");
    expect(acaoPermitida("consultar_ajuda_flow", ctx)).toBe(true);
    expect(
      acaoPermitida("consultar_ajuda_flow", {
        tenantId: "t1",
        ator: "cliente-1",
        canal: "whatsapp",
        papel: "cliente",
      }),
    ).toBe(false);
    expect(
      acaoPermitida("consultar_ajuda_flow", {
        tenantId: "t1",
        ator: "visitante",
        canal: "site",
      }),
    ).toBe(false);
    const resultado = await ACOES["consultar_ajuda_flow"]?.executar(ctx, {
      assunto: "Como conectar o WhatsApp?",
    });
    expect(resultado).toMatchObject({
      encontrado: true,
      caminho: "/barbeiro/cortai",
    });
  });

  it("localiza a Agenda e reutiliza as etapas do guia existente", () => {
    const resposta = consultarAjudaOperacional("Flow, como faço para agendar?", dono);
    expect(resposta).toMatchObject({ encontrado: true, titulo: "Agenda", caminho: "/barbeiro" });
    if (resposta.encontrado) expect(resposta.passos?.length).toBeGreaterThan(0);
  });

  it("entende uma dúvida de funcionamento ditada por voz, com acentos", () => {
    const resposta = consultarAjudaOperacional("Como ajustar o horário de funcionamento?", dono);
    expect(resposta).toMatchObject({
      encontrado: true,
      titulo: "Horários",
      caminho: "/barbeiro/horarios",
    });
  });

  it("indica a área real do WhatsApp sem alegar que houve alteração", () => {
    const resposta = consultarAjudaOperacional("Como conectar o WhatsApp Evolution?", dono);
    expect(resposta).toMatchObject({
      encontrado: true,
      titulo: "WhatsApp",
      caminho: "/barbeiro/cortai",
    });
    if (resposta.encontrado) {
      expect(resposta.aviso).toContain("Nenhuma alteração foi realizada");
      expect(resposta.passos).toEqual([]);
    }
  });

  it("respeita módulos disponíveis por permissão do colaborador", () => {
    const resposta = consultarAjudaOperacional("Como acesso o caixa financeiro?", profissional);
    expect(resposta).toMatchObject({
      encontrado: false,
      motivo: "assunto_sem_guia_verificado",
    });
    if (!resposta.encontrado) {
      expect(resposta.areasDisponiveis).not.toContain("Financeiro");
      expect(resposta.areasDisponiveis).toContain("WhatsApp");
    }
  });

  it("permite ajuda à equipe verificada pelo WhatsApp", () => {
    expect(
      consultarAjudaOperacional("Quero ver a agenda", {
        canal: "whatsapp",
        papel: "profissional",
        permissoes: ["criar_agendamento"],
      }),
    ).toMatchObject({ encontrado: true, titulo: "Agenda" });
  });

  it("nunca oferece o catálogo da equipe para cliente ou visitante", () => {
    for (const contexto of [
      { canal: "whatsapp" as const, papel: "cliente" as const, permissoes: [] },
      { canal: "site" as const, papel: "cliente" as const, permissoes: [] },
    ]) {
      expect(consultarAjudaOperacional("Financeiro", contexto)).toEqual({
        encontrado: false,
        motivo: "canal_nao_autorizado",
      });
    }
  });

  it("sem assunto, pede especificação sem inventar um tutorial", () => {
    const resposta = consultarAjudaOperacional("  ", dono);
    expect(resposta).toMatchObject({ encontrado: false, motivo: "assunto_ausente" });
  });

  it("assunto desconhecido devolve áreas reais, não passos fictícios", () => {
    const resposta = consultarAjudaOperacional("Como configurar um foguete?", dono);
    expect(resposta).toMatchObject({
      encontrado: false,
      motivo: "assunto_sem_guia_verificado",
    });
    expect("passos" in resposta).toBe(false);
  });
});
