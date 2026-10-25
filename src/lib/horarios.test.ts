import { describe, expect, it } from "vitest";

import { slotsDoDia } from "@/lib/horarios";

describe("slotsDoDia com intervalo personalizado", () => {
  const horario = {
    diaSemana: 1,
    fechado: false,
    abre: "09:00",
    fecha: "10:45",
    intervaloInicio: null,
    intervaloFim: null,
  };

  it("inclui o último início possível mesmo quando falta menos que um passo para fechar", () => {
    const slots = slotsDoDia("2026-10-26", [horario], 45, "America/Maceio").slots;

    expect(slots.map((slot) => slot.label)).toEqual(["09:00", "09:45", "10:30"]);
  });

  it("não descarta o início anterior à pausa só porque o passo cruza a pausa", () => {
    const slots = slotsDoDia(
      "2026-10-26",
      [
        {
          ...horario,
          fecha: "12:00",
          intervaloInicio: "10:00",
          intervaloFim: "10:30",
        },
      ],
      45,
      "America/Maceio",
    ).slots;

    expect(slots.map((slot) => slot.label)).toEqual(["09:00", "09:45", "10:30", "11:15"]);
  });

  it("mantém os horários alinhados ao passo escolhido", () => {
    const slots = slotsDoDia(
      "2026-10-26",
      [{ ...horario, fecha: "12:00" }],
      25,
      "America/Maceio",
    ).slots;

    expect(slots.map((slot) => slot.label)).toEqual([
      "09:00",
      "09:25",
      "09:50",
      "10:15",
      "10:40",
      "11:05",
      "11:30",
      "11:55",
    ]);
  });
});
