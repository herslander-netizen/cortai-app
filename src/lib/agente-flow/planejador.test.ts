import { describe, expect, it } from "vitest";

import {
  planejarTurno,
  type EstadoParaPlanejamento,
  type PendenciaConhecida,
  type TurnoParaPlanejamento,
} from "./planejador";

const agora = Date.parse("2026-11-07T15:05:00.000Z");
const turno: TurnoParaPlanejamento = {
  id: "evento-1",
  tenantId: "negocio-A",
  conversaId: "conversa-A",
  texto: "quero saber os serviços",
  agora,
  intencao: "SERVICOS",
};
const estado: EstadoParaPlanejamento = { versao: 8, modo: "automatico" };
const pendencia: PendenciaConhecida = {
  id: "pedido-1",
  tenantId: turno.tenantId,
  conversaId: turno.conversaId,
  acao: "criar_agendamento",
  criadaEm: "2026-11-07T15:00:00.000Z",
};
const simular = (
  texto: string,
  intencao: TurnoParaPlanejamento["intencao"],
  alteracao: Partial<EstadoParaPlanejamento> = {},
) => planejarTurno({ ...turno, texto, intencao }, { ...estado, ...alteracao });

describe("Agente Flow v0: planejamento puro, sem custo e sem execução", () => {
  it("sempre devolve plano em modo sombra, com versão e idempotência", () => {
    const plano = simular("tem serviços?", "SERVICOS");
    expect(plano).toMatchObject({
      proximaEtapa: "consultar",
      ferramenta: "listar_servicos",
      versaoLida: 8,
      sombra: true,
    });
    expect(plano.chaveIdempotencia).toBe(
      JSON.stringify(["negocio-A", "conversa-A", "evento-1"]),
    );
    expect("executar" in plano).toBe(false);
  });

  it("consulta preço, equipe, funcionamento, endereço e agendamentos só via ferramentas oficiais", () => {
    const casos = [
      ["PRECO", "listar_servicos"],
      ["PROFISSIONAIS", "listar_profissionais"],
      ["FUNCIONAMENTO", "consultar_horarios_funcionamento"],
      ["LOCALIZACAO", "consultar_informacoes"],
      ["BARBEARIA", "consultar_informacoes"],
      ["MEUS_AGENDAMENTOS", "consultar_agendamentos_cliente"],
    ] as const;
    for (const [intencao, ferramenta] of casos) {
      expect(simular("pedido", intencao)).toMatchObject({
        proximaEtapa: "consultar",
        ferramenta,
      });
    }
  });

  it("nunca executa agendar, remarcar ou cancelar pela nova camada", () => {
    for (const intencao of ["AGENDAR", "REMARCAR", "CANCELAR"] as const) {
      const plano = simular("quero agendar", intencao);
      expect(plano.proximaEtapa).toBe("delegar");
      expect(plano.acaoConfirmada).toBeUndefined();
    }
  });

  it("pendência da mesma conversa permite confirmação apenas como PLANO", () => {
    expect(simular("sim", "CONFIRMAR", { pendencia })).toMatchObject({
      proximaEtapa: "solicitar_execucao_confirmada",
      motivo: "confirmacao_da_pendencia",
      acaoConfirmada: "criar_agendamento",
      pendenciaId: "pedido-1",
      sombra: true,
    });
  });

  it("'pode marcar' confirma a pendência existente mesmo classificada como AGENDAR", () => {
    expect(simular("pode marcar", "AGENDAR", { pendencia }).proximaEtapa).toBe(
      "solicitar_execucao_confirmada",
    );
  });

  it("não confirma operação diferente da pendência existente", () => {
    const plano = simular("pode cancelar", "CANCELAR", { pendencia });
    expect(plano.proximaEtapa).toBe("delegar");
    expect(plano.acaoConfirmada).toBeUndefined();
  });

  it("impede confirmação de pendência de outro negócio", () => {
    const plano = simular("sim", "CONFIRMAR", {
      pendencia: { ...pendencia, tenantId: "negocio-B" },
    });
    expect(plano).toMatchObject({
      proximaEtapa: "delegar",
      motivo: "pendencia_de_outra_conversa",
    });
    expect(plano.acaoConfirmada).toBeUndefined();
  });

  it("impede confirmação de pendência de outra conversa do mesmo negócio", () => {
    const plano = simular("sim", "CONFIRMAR", {
      pendencia: { ...pendencia, conversaId: "conversa-B" },
    });
    expect(plano.proximaEtapa).toBe("delegar");
    expect(plano.acaoConfirmada).toBeUndefined();
  });

  it("número solto nunca confirma escrita de IA", () => {
    const plano = simular("1", "SELECAO", { pendencia });
    expect(plano).toMatchObject({
      proximaEtapa: "perguntar",
      motivo: "numero_nao_confirma_acao",
    });
  });

  it("negação inequívoca não executa a pendência", () => {
    const plano = simular("não", "NEGAR", { pendencia });
    expect(plano).toMatchObject({ proximaEtapa: "delegar", motivo: "recusa_de_pendencia" });
    expect(plano.acaoConfirmada).toBeUndefined();
  });

  it("não aceita confirmação de pendência vencida", () => {
    const plano = simular("sim", "CONFIRMAR", {
      pendencia: { ...pendencia, criadaEm: "2026-11-07T14:40:00.000Z" },
    });
    expect(plano).toMatchObject({ proximaEtapa: "perguntar", motivo: "pendencia_expirada" });
  });

  it("não aceita confirmação de pendência criada no futuro", () => {
    const plano = simular("sim", "CONFIRMAR", {
      pendencia: { ...pendencia, criadaEm: "2026-11-07T15:40:00.000Z" },
    });
    expect(plano.acaoConfirmada).toBeUndefined();
  });

  it("sem pendência, 'sim' não autoriza nada", () => {
    expect(simular("sim", "CONFIRMAR")).toMatchObject({
      proximaEtapa: "perguntar",
      motivo: "sem_confirmacao_valida",
    });
  });

  it("silencia quando o atendimento humano tem prazo ativo", () => {
    expect(simular("oi", "SAUDACAO", {
      modo: "humano",
      humanoAte: "2026-11-07T15:20:00.000Z",
    })).toMatchObject({ proximaEtapa: "silenciar", motivo: "humano_no_controle_com_prazo" });
  });

  it("não perpetua silêncio humano sem prazo (P1)", () => {
    for (const humanoAte of [null, "invalido", "2026-11-07T14:59:00.000Z"]) {
      expect(simular("oi", "SAUDACAO", { modo: "humano", humanoAte })).toMatchObject({
        proximaEtapa: "delegar",
        motivo: "revisar_controle_humano_expirado_ou_sem_prazo",
      });
    }
  });

  it("reentrega do mesmo turno gera plano de ignorar", () => {
    expect(simular("marcar", "AGENDAR", { ultimoTurnoId: "evento-1" })).toMatchObject({
      proximaEtapa: "ignorar",
      motivo: "turno_reentregue",
    });
  });

  it("não confunde ids iguais de conversas em negócios diferentes", () => {
    const outro = planejarTurno({ ...turno, tenantId: "negocio-B" }, estado);
    expect(outro.chaveIdempotencia).not.toBe(simular("pedido", "SERVICOS").chaveIdempotencia);
  });

  it("pedido humano e caso desconhecido usam o caminho oficial", () => {
    expect(simular("quero atendente", "HUMANO")).toMatchObject({
      proximaEtapa: "delegar",
      motivo: "atendimento_humano_oficial",
    });
    expect(simular("alguma coisa", "DESCONHECIDA").proximaEtapa).toBe("delegar");
  });

  it("rejeita turno sem identidade ou relógio válido", () => {
    expect(() => planejarTurno({ ...turno, tenantId: "" }, estado)).toThrow();
    expect(() => planejarTurno({ ...turno, agora: NaN }, estado)).toThrow();
  });

  it("rejeita estado sem versão segura", () => {
    expect(() => planejarTurno(turno, { ...estado, versao: -1 })).toThrow();
    expect(() => planejarTurno(turno, { ...estado, versao: 1.5 })).toThrow();
  });
});
