import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monitor = readFileSync("src/lib/whatsapp/monitor-conexoes.server.ts", "utf8");
const inicio = monitor.indexOf("export async function monitorarConexoesWhatsapp");
const varredura = monitor.slice(inicio);

describe("monitor de WhatsApp: não mascarar falhas internas", () => {
  it("diferencia consulta Supabase com erro de lista vazia legítima", () => {
    expect(inicio).toBeGreaterThan(0);
    expect(varredura).toContain("const { data, error: erroConsulta } = await db");
    expect(varredura).toContain('if (erroConsulta) {');
    expect(varredura).toContain('logConexao("monitor_consulta_falhou"');
    expect(varredura).toContain('throw new Error("Não foi possível carregar as conexões do monitor de WhatsApp.")');
    expect(varredura.indexOf("if (erroConsulta)")).toBeLessThan(varredura.indexOf("const linhas = (data ?? [])"));
  });

  it("contabiliza exceções de sessões que falharam após Promise.allSettled", () => {
    expect(varredura).toContain('if (x.status !== "fulfilled") {');
    expect(varredura).toContain("resumo.falhasInternas++");
    expect(varredura).toContain("if (resumo.falhasInternas > 0)");
    expect(varredura).toContain('throw new Error("Algumas conexões não puderam ser verificadas pelo monitor.")');
  });

  it("não altera reconexão nem afirma que timeout do gateway é conexão verificada", () => {
    const verificar = monitor.slice(monitor.indexOf("async function verificarUma"), inicio);
    const falha = verificar.slice(verificar.indexOf("} catch (e) {"), verificar.indexOf("// O serviço respondeu:"));
    expect(falha).not.toContain("verificado_em:");
    expect(verificar).toContain("decidirAcaoDoMonitor");
    expect(verificar).toContain("gw.reiniciarSessao");
  });
});
