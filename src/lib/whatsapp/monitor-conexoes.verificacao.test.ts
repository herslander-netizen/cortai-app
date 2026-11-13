import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monitor = readFileSync("src/lib/whatsapp/monitor-conexoes.server.ts", "utf8");

describe("monitor de conexões: verificação real", () => {
  it("não renova verificado_em quando o gateway falha ou expira", () => {
    const verificar = monitor.slice(monitor.indexOf("async function verificarUma"));
    const inicio = verificar.indexOf("} catch (e) {");
    const fim = verificar.indexOf("// O serviço respondeu:");
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
    const falha = verificar.slice(inicio, fim);
    expect(falha).toContain("await registrarFalhaDoServico(linha, classe, agora)");
    expect(falha).toContain('return "sem_resposta" as const');
    expect(falha).not.toContain("verificado_em:");
  });

  it("renova a confirmação somente após resposta do gateway", () => {
    const verificar = monitor.slice(monitor.indexOf("async function verificarUma"));
    const sucesso = verificar.slice(verificar.indexOf("// O serviço respondeu:"));
    const statusAtualizado = sucesso.indexOf(".update({ verificado_em: agora.toISOString() })");
    const verificacaoReal = sucesso.indexOf("registrarServicoOk(linha, agora)");
    expect(verificacaoReal).toBeGreaterThanOrEqual(0);
    expect(statusAtualizado).toBeGreaterThan(verificacaoReal);
  });
});
