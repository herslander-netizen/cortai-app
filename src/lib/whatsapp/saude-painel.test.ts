import { describe, expect, it } from "vitest";
import type { CentralDeAutomacao } from "./central-automacao";
import { saudeParaAdmin, saudeParaNegocio } from "./saude-painel";

const agora = new Date("2026-11-11T19:00:00Z");
const minutosAtras = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();
const baseAdmin = {
  status: "conectado", compartilhada: false, verificadoEm: minutosAtras(15),
  incidenteAberto: false, tentativasReconexao: 0,
};
const negocio = (campos: Partial<CentralDeAutomacao>): CentralDeAutomacao =>
  ({
    whatsapp: "conectado",
    evolution: "online",
    monitoramento: "ativo",
    ...campos,
  }) as CentralDeAutomacao;

describe("saúde visível no administrador", () => {
  it("não afirma saúde a partir de status conectado antigo", () => {
    expect(saudeParaAdmin({ ...baseAdmin, verificadoEm: minutosAtras(41) }, agora).categoria)
      .toBe("nao_confirmado");
    expect(saudeParaAdmin({ ...baseAdmin, verificadoEm: null }, agora).categoria)
      .toBe("nao_confirmado");
  });

  it("só considera saudável uma sessão própria verificada recentemente", () => {
    expect(saudeParaAdmin(baseAdmin, agora).categoria).toBe("saudavel");
    expect(saudeParaAdmin({ ...baseAdmin, compartilhada: true }, agora).categoria)
      .toBe("nao_confirmado");
  });

  it("prioriza incidente confirmado mesmo com status conectado", () => {
    expect(saudeParaAdmin({ ...baseAdmin, incidenteAberto: true }, agora).categoria)
      .toBe("critico");
  });

  it("não oculta incidentes abertos em canais sem sessão própria", () => {
    expect(saudeParaAdmin({ ...baseAdmin, status: "sem_conexao", incidenteAberto: true }, agora).categoria)
      .toBe("critico");
    expect(saudeParaAdmin({ ...baseAdmin, compartilhada: true, incidenteAberto: true }, agora).categoria)
      .toBe("critico");
  });

  it("distingue ação do responsável, desconexão e ausência de configuração", () => {
    expect(saudeParaAdmin({ ...baseAdmin, status: "qr_pronto" }, agora).categoria).toBe("atencao");
    expect(saudeParaAdmin({ ...baseAdmin, status: "desconectado" }, agora).categoria).toBe("atencao");
    expect(saudeParaAdmin({ ...baseAdmin, status: "sem_conexao" }, agora).categoria)
      .toBe("nao_configurado");
  });
});

describe("orientações para o estabelecimento", () => {
  it("não exibe termos de infraestrutura ou credenciais", () => {
    const resultado = saudeParaNegocio(negocio({}));
    expect(resultado.tom).toBe("ok");
    expect(JSON.stringify(resultado)).not.toMatch(/Redis|Postgres|API key|token|webhook/i);
  });

  it("distingue ausência de conexão de uma queda real", () => {
    const r = saudeParaNegocio(negocio({ possuiConexao: false, whatsapp: "desconectado" }));
    expect(r.titulo).toBe("Configure o WhatsApp");
    expect(r.tom).toBe("neutro");
  });

  it("orienta QR sem prometer resolução automática", () => {
    const r = saudeParaNegocio(negocio({ whatsapp: "aguardando_leitura" }));
    expect(r.tom).toBe("alerta");
    expect(r.orientacao).toMatch(/responsável/i);
  });

  it("não chama de queda um monitoramento desatualizado", () => {
    const r = saudeParaNegocio(negocio({ monitoramento: "nao_confirmado" }));
    expect(r.tom).toBe("neutro");
    expect(r.descricao).toMatch(/não significa/i);
  });

  it("mostra incidente mesmo que a sessão ainda esteja marcada conectada", () => {
    expect(saudeParaNegocio(negocio({ evolution: "offline" })).tom).toBe("erro");
  });
});
