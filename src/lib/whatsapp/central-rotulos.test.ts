import { describe, expect, it } from "vitest";

import { derivarCentral } from "./central-automacao";
import { haQuanto, linhasDaCentral } from "./central-rotulos";

const agora = new Date("2026-10-10T12:00:00Z");
const base = () =>
  derivarCentral({
    conexao: {
      status: "conectado",
      numero: "+55 79",
      verificadoEm: "2026-10-10T11:55:00Z",
      vistoEm: null,
      conectadoEm: null,
    },
    automacaoLigada: true,
    iaPausadaEm: "2026-10-10T10:00:00Z",
    iaPausaMotivo: null,
    iaNoServidor: true,
    planoLibera: true,
    avisosAtivos: false,
    servicoConfigurado: true,
    ultimoEventoDoServico: null,
    ultimoEventoDoServicoEm: null,
    agora,
  });

describe("linhas da Central", () => {
  it("mostra cinco estados independentes: canal conectado, IA pausada, avisos desativados", () => {
    const l = Object.fromEntries(linhasDaCentral(base()).map((x) => [x.chave, x]));
    expect(Object.keys(l)).toEqual(["whatsapp", "ia", "evolution", "avisos", "monitoramento"]);
    expect(l["whatsapp"]).toMatchObject({ estado: "Conectado", tom: "ok" });
    expect(l["ia"]).toMatchObject({ estado: "Pausada", tom: "alerta" });
    expect(l["avisos"]).toMatchObject({ estado: "Desativados" });
    expect(l["evolution"]).toMatchObject({ estado: "Online" });
    expect(l["monitoramento"]).toMatchObject({ estado: "Ativo" });
  });
});

describe("haQuanto", () => {
  it("formata a idade da última verificação", () => {
    expect(haQuanto(null, agora)).toBe("sem registro");
    expect(haQuanto("2026-10-10T11:59:40Z", agora)).toBe("agora há pouco");
    expect(haQuanto("2026-10-10T11:50:00Z", agora)).toBe("há 10 min");
    expect(haQuanto("2026-10-10T09:00:00Z", agora)).toBe("há 3 h");
    expect(haQuanto("2026-10-07T12:00:00Z", agora)).toBe("há 3 dias");
  });
});
