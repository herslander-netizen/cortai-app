import { describe, expect, it } from "vitest";

import {
  JANELA_RECONEXAO_MS,
  MAX_TENTATIVAS_AUTOMATICAS,
  decidirAcaoDoMonitor,
  esperaDaTentativa,
  eventoEhMaisNovo,
  mesclarEstado,
  podeEnviarPelaConexao,
  podeTentarReconectar,
} from "./saude-conexao";

const agora = new Date("2026-10-08T12:00:00Z");
const minutosAtras = (m: number) => new Date(agora.getTime() - m * 60_000).toISOString();

describe("monitor de conexões", () => {
  it("conexão continua conectada: nada a fazer", () => {
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "conectado",
        statusReal: "conectado",
        tentativas: 0,
        tentadaEm: null,
        agora,
      }),
    ).toEqual({ tipo: "nada" });
  });

  it("queda silenciosa: banco conectado, serviço desconectado → queda com reconexão", () => {
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "conectado",
        statusReal: "desconectado",
        tentativas: 0,
        tentadaEm: null,
        agora,
      }),
    ).toEqual({ tipo: "queda", reconectar: true });
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "conectado",
        statusReal: "erro",
        tentativas: 0,
        tentadaEm: null,
        agora,
      }).tipo,
    ).toBe("queda");
  });

  it("reconexão limitada: no máximo 1 por janela, com espera crescente e teto", () => {
    expect(podeTentarReconectar(1, minutosAtras(5), agora)).toBe(false);
    expect(podeTentarReconectar(1, minutosAtras(15), agora)).toBe(true);
    expect(podeTentarReconectar(2, minutosAtras(20), agora)).toBe(false);
    expect(podeTentarReconectar(2, minutosAtras(30), agora)).toBe(true);
    expect(esperaDaTentativa(1)).toBe(JANELA_RECONEXAO_MS);
    expect(esperaDaTentativa(20)).toBe(6 * 3600_000);
    expect(podeTentarReconectar(MAX_TENTATIVAS_AUTOMATICAS, minutosAtras(10_000), agora)).toBe(
      false,
    );
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "desconectado",
        statusReal: "desconectado",
        tentativas: 1,
        tentadaEm: minutosAtras(3),
        agora,
      }),
    ).toEqual({ tipo: "queda", reconectar: false });
  });

  it("QR necessário: nunca reconecta sozinho, só aguarda a pessoa", () => {
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "conectado",
        statusReal: "qr_pronto",
        tentativas: 0,
        tentadaEm: null,
        agora,
      }),
    ).toEqual({ tipo: "aguardando_qr" });
  });

  it("voltou a conectar depois de tentativas: zera o ciclo", () => {
    expect(
      decidirAcaoDoMonitor({
        statusBanco: "desconectado",
        statusReal: "conectado",
        tentativas: 2,
        tentadaEm: minutosAtras(1),
        agora,
      }),
    ).toEqual({ tipo: "conectado" });
  });
});

describe("CONNECTION_UPDATE", () => {
  it("evento fora de ordem é ignorado", () => {
    expect(eventoEhMaisNovo("2026-10-08T12:00:00Z", "2026-10-08T11:59:00Z")).toBe(false);
    expect(eventoEhMaisNovo("2026-10-08T12:00:00Z", "2026-10-08T12:00:01Z")).toBe(true);
    expect(eventoEhMaisNovo(null, "2026-10-08T12:00:00Z")).toBe(true);
  });

  it("número e nome preservados quando o evento não traz", () => {
    const atual = { status: "conectado", numero: "5579999990000", nome_exibicao: "Aurora" };
    const r = mesclarEstado(atual, { status: "desconectado", numero: null, nomeExibicao: "" });
    expect(r.numero).toBe("5579999990000");
    expect(r.nome_exibicao).toBe("Aurora");
    expect(r.mudou).toBe(true);
  });

  it("mesmo estado não conta como mudança (sem auditoria repetida)", () => {
    const atual = { status: "conectado", numero: "1", nome_exibicao: null };
    expect(mesclarEstado(atual, { status: "conectado" }).mudou).toBe(false);
  });
});

describe("isolamento entre negócios", () => {
  const a = { tenant_id: "tenant-a", compartilhada: false };
  const b = { tenant_id: "tenant-b", compartilhada: false };
  it("um negócio nunca envia pela sessão de outro", () => {
    expect(podeEnviarPelaConexao(a, "tenant-a")).toBe(true);
    expect(podeEnviarPelaConexao(b, "tenant-a")).toBe(false);
    expect(podeEnviarPelaConexao(a, "tenant-b")).toBe(false);
    expect(podeEnviarPelaConexao(null, "tenant-a")).toBe(false);
  });
  it("número oficial compartilhado é a única exceção", () => {
    expect(
      podeEnviarPelaConexao({ tenant_id: "plataforma", compartilhada: true }, "tenant-a"),
    ).toBe(true);
  });
});
