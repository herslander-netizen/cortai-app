import { describe, expect, it } from "vitest";

import { PerfilDeRealidade, realidadeDeExemplo } from "./nucleo/contratos";
import { ArquivoDeCenarios, compilar, simular } from "./nucleo/motor";
import atendimento from "./modelos/atendimento.json";
import cenarios from "./modelos/atendimento.cenarios.json";
import perfil from "./modelos/perfil.json";

// O motor copiado do flow-bot precisa se comportar dentro do Flow exatamente como no repositório dele: os mesmos
// cenários do modelo de atendimento passam aqui.
describe("motor do Flow Bot dentro do Flow", () => {
  const perfilFlow = PerfilDeRealidade.parse(perfil);
  const plano = compilar(atendimento, { perfis: [perfilFlow] });
  const arquivo = ArquivoDeCenarios.parse(cenarios);

  it.each(arquivo.scenarios.map((c) => [c.name, c] as const))("%s", (_nome, cenario) => {
    const r = simular(plano, cenario, { realidade: realidadeDeExemplo(perfilFlow) });
    expect(r.passos.flatMap((p) => p.falhas)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("modelo usa só fatos do perfil flow/v1", () => {
    expect(perfilFlow.id).toBe("flow/v1");
    expect(arquivo.scenarios.length).toBeGreaterThanOrEqual(18);
  });
});
