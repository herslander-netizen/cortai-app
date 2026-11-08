import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/ia/acoes.server", () => ({ ACOES_DO_AGENTE: {} }));
const estado = vi.hoisted(() => ({ obter: vi.fn() }));
vi.mock("@/lib/crm/indicadores.server", () => ({
  consultarIndicadoresCRMDoTenant: (...args: unknown[]) => estado.obter(...args),
}));
import { ACOES, acaoPermitida, ferramentasDoContexto, type ContextoDoCerebro } from "./acoes.server";
const contexto: ContextoDoCerebro = {
  tenantId: "tenant_teste", canal: "painel", ator: "dono_1",
  papel: "dono", permissoes: ["relatorios"],
};
describe("consulta do CRM no catálogo único", () => {
  it("usa o serviço existente e só oferece leitura autorizada", async () => {
    expect(acaoPermitida("consultar_indicadores_crm", contexto)).toBe(true);
    expect(ferramentasDoContexto(contexto).map((x) => x.name)).toContain("consultar_indicadores_crm");
    estado.obter.mockResolvedValueOnce({ atendimentosMes: 7 });
    await expect(ACOES["consultar_indicadores_crm"]!.executar(contexto, {}))
      .resolves.toEqual({ atendimentosMes: 7 });
    expect(estado.obter).toHaveBeenCalledWith("tenant_teste");
  });
  it("nega profissional e todos os canais de WhatsApp e site", async () => {
    for (const c of [
      { ...contexto, permissoes: [] },
      { ...contexto, papel: "profissional" as const },
      { ...contexto, canal: "whatsapp" as const },
      { ...contexto, canal: "site" as const },
    ]) {
      expect(acaoPermitida("consultar_indicadores_crm", c)).toBe(false);
      await expect(ACOES["consultar_indicadores_crm"]!.executar(c, {}))
        .rejects.toThrow(/Sem permissão/);
    }
  });
});
