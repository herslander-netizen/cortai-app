import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  aberturaDaVespera,
  dentroDoHorarioDeEnvio,
  filaDaVespera,
  horaDoLembreteDeVespera,
} from "./calendario-de-lembretes";

const FUSO = "America/Maceio"; // UTC−3
/** "2026-11-06 15:10" no fuso do negócio. */
const local = (dia: string, hora: string) => new Date(`${dia}T${hora}:00-03:00`);

describe("lembrete de véspera às 15h (dono, 06/11/2026)", () => {
  const inicio = local("2026-11-07", "09:00").toISOString();

  it("sai das 15:00 às 20:00 do dia anterior, no fuso do negócio", () => {
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-06", "14:50"), fuso: FUSO }),
    ).toBe(false);
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-06", "15:00"), fuso: FUSO }),
    ).toBe(true);
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-06", "19:45"), fuso: FUSO }),
    ).toBe(true);
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-06", "20:00"), fuso: FUSO }),
    ).toBe(false);
    // Atendimento de depois de amanhã ou de hoje: não é véspera.
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-05", "16:00"), fuso: FUSO }),
    ).toBe(false);
    expect(
      horaDoLembreteDeVespera({ inicio, agora: local("2026-11-07", "08:00"), fuso: FUSO }),
    ).toBe(false);
  });

  it("quem marcou há pouco não recebe (a confirmação é recente)", () => {
    const agora = local("2026-11-06", "16:00");
    const criadoEm = local("2026-11-06", "15:30").toISOString();
    expect(horaDoLembreteDeVespera({ inicio, criadoEm, agora, fuso: FUSO })).toBe(false);
    const antigo = local("2026-11-02", "10:00").toISOString();
    expect(horaDoLembreteDeVespera({ inicio, criadoEm: antigo, agora, fuso: FUSO })).toBe(true);
  });

  it("silêncio das 21:00 às 08:00", () => {
    expect(dentroDoHorarioDeEnvio(local("2026-11-06", "07:59"), FUSO)).toBe(false);
    expect(dentroDoHorarioDeEnvio(local("2026-11-06", "08:00"), FUSO)).toBe(true);
    expect(dentroDoHorarioDeEnvio(local("2026-11-06", "20:59"), FUSO)).toBe(true);
    expect(dentroDoHorarioDeEnvio(local("2026-11-06", "21:00"), FUSO)).toBe(false);
  });

  it("ordem sorteada e teto por negócio em cada varredura", () => {
    const itens = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      tenant_id: i < 15 ? "t1" : "t2",
    }));
    let n = 0;
    const fila = filaDaVespera(itens, () => (n = (n * 7 + 3) % 11) / 11, 12);
    expect(fila.filter((x) => x.tenant_id === "t1")).toHaveLength(12);
    expect(fila.filter((x) => x.tenant_id === "t2")).toHaveLength(5);
    expect(fila.map((x) => x.id)).not.toEqual(itens.slice(0, 17).map((x) => x.id));
  });

  it("abertura varia entre clientes e é estável para o mesmo atendimento", () => {
    const aberturas = new Set(
      ["ag-1", "ag-2", "ag-3", "ag-4", "ag-5"].map((id) => aberturaDaVespera("Carla", id)),
    );
    expect(aberturas.size).toBeGreaterThan(1);
    expect(aberturaDaVespera("Carla", "ag-1")).toBe(aberturaDaVespera("Carla", "ag-1"));
  });

  it("a varredura usa a véspera, não mais as 24h antes", () => {
    const s = readFileSync("src/lib/whatsapp/notificacoes.server.ts", "utf8");
    expect(s).toContain("await candidatosDaVespera()");
    expect(s).not.toContain('janela("lembrete_24h", 24, 30)');
    expect(s).toContain("Horário de silêncio (21h–8h).");
  });
});
