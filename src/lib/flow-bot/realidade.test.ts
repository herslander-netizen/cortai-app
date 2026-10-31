import { describe, expect, it } from "vitest";

import { PerfilDeRealidade } from "./nucleo/contratos";
import { compilar, novaSessao, processar } from "./nucleo/motor";
import {
  abertoAgora,
  horarioDeHojeEmTexto,
  montarRealidade,
  proximaAbertura,
  servicoEmTexto,
} from "./realidade";
import atendimento from "./modelos/atendimento.json";
import perfil from "./modelos/perfil.json";
import type { HorarioDeFuncionamento } from "@/lib/horarios";

// 2026-11-02 é segunda-feira. Segunda a sexta 09:00–18:00 com pausa 12:00–13:00; sábado 08:00–14:00; domingo fechado.
const semana: HorarioDeFuncionamento[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
  diaSemana: d,
  fechado: d === 0,
  abre: d === 6 ? "08:00" : "09:00",
  fecha: d === 6 ? "14:00" : "18:00",
  intervaloInicio: d >= 1 && d <= 5 ? "12:00" : null,
  intervaloFim: d >= 1 && d <= 5 ? "13:00" : null,
}));
const agenda = { horarios: semana };
const min = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe("aberto agora e horário de hoje", () => {
  it("dentro do expediente, na pausa, antes e depois", () => {
    expect(abertoAgora("2026-11-02", min("10:00"), agenda)).toBe(true);
    expect(abertoAgora("2026-11-02", min("12:30"), agenda)).toBe(false);
    expect(abertoAgora("2026-11-02", min("08:59"), agenda)).toBe(false);
    expect(abertoAgora("2026-11-02", min("18:00"), agenda)).toBe(false);
    expect(abertoAgora("2026-11-01", min("10:00"), agenda)).toBe(false);
  });
  it("horário especial na data muda o dia (domingo aberto só nesta data)", () => {
    const especial = {
      horarios: semana,
      intervalosPorData: { "2026-11-01": { abre: "10:00", fecha: "16:00" } },
    };
    expect(abertoAgora("2026-11-01", min("11:00"), especial)).toBe(true);
    expect(horarioDeHojeEmTexto("2026-11-01", especial)).toBe("das 10:00 às 16:00");
  });
  it("virada da noite: expediente de ontem que passa da meia-noite", () => {
    const noite = {
      horarios: semana.map((h) =>
        h.diaSemana === 6 ? { ...h, abre: "20:00", fecha: "02:00" } : h,
      ),
    };
    expect(abertoAgora("2026-11-08", min("01:30"), noite)).toBe(true);
    expect(abertoAgora("2026-11-08", min("02:30"), noite)).toBe(false);
  });
  it("texto do horário de hoje", () => {
    expect(horarioDeHojeEmTexto("2026-11-02", agenda)).toBe(
      "das 09:00 às 18:00, com pausa das 12:00 às 13:00",
    );
    expect(horarioDeHojeEmTexto("2026-11-01", agenda)).toBe("fechado hoje");
  });
});

describe("próxima abertura", () => {
  it("mais tarde hoje, depois da pausa, amanhã ou outro dia da semana", () => {
    expect(proximaAbertura("2026-11-02", min("07:00"), agenda)).toBe("Abrimos hoje às 09:00.");
    expect(proximaAbertura("2026-11-02", min("12:10"), agenda)).toBe("Voltamos hoje às 13:00.");
    expect(proximaAbertura("2026-11-02", min("19:00"), agenda)).toBe("Abrimos amanhã às 09:00.");
    expect(proximaAbertura("2026-11-07", min("15:00"), agenda)).toBe(
      "Abrimos segunda, 09/11, às 09:00.",
    );
  });
  it("sem nenhum horário cadastrado: vazio (o modelo não inventa)", () => {
    expect(proximaAbertura("2026-11-02", min("10:00"), { horarios: [] })).toBe("");
  });
});

describe("realidade no perfil flow/v1 com o modelo padrão", () => {
  const perfilFlow = PerfilDeRealidade.parse(perfil);
  const plano = compilar(atendimento, { perfis: [perfilFlow] });
  const base = {
    nome: "Studio Teste",
    endereco: null,
    linkDeAgendar: "https://flow.exemplo/agendar/studio",
    servicos: [{ nome: "Corte", preco_centavos: 4500 }],
    dia: "2026-11-02",
    minuto: min("10:00"),
    agenda,
  };
  const responder = (texto: string, realidade = montarRealidade(base)) =>
    processar(
      plano,
      novaSessao(plano.doc.flow.id),
      { type: "message", id: "m1", at: 0, text: texto },
      { realidade },
    ).acoes.flatMap((a) => (a.type === "send_text" ? [a.text] : []));

  it("só fatos que o perfil conhece", () => {
    const nomes = new Set(perfilFlow.facts.map((f) => f.name));
    expect(Object.keys(montarRealidade(base)).filter((k) => !nomes.has(k))).toEqual([]);
  });
  it("preço com o catálogo do banco", () => {
    expect(servicoEmTexto({ nome: "Corte", preco_centavos: 4500 })).toBe("Corte — R$ 45,00");
    expect(responder("quanto custa?")[0]).toContain("• Corte — R$ 45,00");
  });
  it("sem endereço, sem pagamento e sem próximo horário: promete a equipe ou manda só o link, sem frase vazia", () => {
    expect(responder("onde fica?")).toEqual([
      "Vou confirmar com a equipe o endereço certinho e já te passo por aqui.",
    ]);
    expect(responder("aceita pix?")).toEqual([
      "Vou confirmar com a equipe as formas de pagamento e já te passo por aqui.",
    ]);
    expect(responder("quero agendar")).toEqual([
      "Para agendar em Studio Teste, escolha o horário por aqui: https://flow.exemplo/agendar/studio",
    ]);
  });
  it("fechado: diz a próxima abertura", () => {
    const fechado = montarRealidade({ ...base, minuto: min("19:00") });
    expect(responder("vocês estão abertos?", fechado)).toEqual([
      "No momento estamos fechados. Abrimos amanhã às 09:00.",
    ]);
  });
});
