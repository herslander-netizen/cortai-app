import { describe, expect, it } from "vitest";

import { listaDeHorarios, paraWhatsApp, resumoDoAgendamento } from "./formatacao";

describe("paraWhatsApp", () => {
  it("negrito e itálico do markdown viram os do WhatsApp", () => {
    expect(paraWhatsApp("Seu horário é **amanhã** às __15:00__")).toBe(
      "Seu horário é *amanhã* às _15:00_",
    );
  });

  it("formatação do WhatsApp já correta fica igual", () => {
    const t = "*Limpeza de pele* com _Ana_ — ~R$ 150~ R$ 120";
    expect(paraWhatsApp(t)).toBe(t);
  });

  it("título vira negrito; marcadores viram •", () => {
    expect(paraWhatsApp("## Horários livres\n- 09:00\n* 10:30\n+ 14:00")).toBe(
      "*Horários livres*\n• 09:00\n• 10:30\n• 14:00",
    );
  });

  it("lista numerada e texto sem formatação ficam como estão", () => {
    const t = "Qual horário prefere?\n1. 09:00\n2. 10:30";
    expect(paraWhatsApp(t)).toBe(t);
  });

  it("link em markdown vira texto e link visível", () => {
    expect(paraWhatsApp("Agende [pelo site](https://flow.app/agendar/x)")).toBe(
      "Agende pelo site: https://flow.app/agendar/x",
    );
  });

  it("espaços e linhas em branco excessivas são organizados", () => {
    expect(paraWhatsApp("Olá!   \n\n\n\nTudo bem?  ")).toBe("Olá!\n\nTudo bem?");
  });

  it("bloco monoespaçado não é alterado", () => {
    const t = "Código:\n```**não mexe** # nem aqui```";
    expect(paraWhatsApp(t)).toBe(t);
  });

  it("caracteres especiais e emojis passam intactos", () => {
    expect(paraWhatsApp("Até já! 😊 R$ 45,00 — 50% & ação")).toBe(
      "Até já! 😊 R$ 45,00 — 50% & ação",
    );
  });
});

describe("blocos de apresentação", () => {
  it("resumo com um dado por linha, dia da semana com maiúscula", () => {
    expect(
      resumoDoAgendamento({
        servico: "Limpeza de pele",
        profissional: "Ana",
        quando: "quinta-feira, 12/11, às 14:00",
        valor: "R$ 120,00",
      }),
    ).toBe(
      "*Serviço:* Limpeza de pele\n*Profissional:* Ana\n*Quando:* Quinta-feira, 12/11, às 14:00\n*Valor:* R$ 120,00",
    );
  });

  it("resumo sem profissional omite a linha", () => {
    expect(resumoDoAgendamento({ servico: "Manicure", quando: "sábado, 08/11, às 10:00" })).toBe(
      "*Serviço:* Manicure\n*Quando:* Sábado, 08/11, às 10:00",
    );
  });

  it("horários na vertical, numerados, com o dia em negrito", () => {
    expect(listaDeHorarios({ dia: "quinta-feira, 12/11", horarios: ["09:00", "10:30"] })).toBe(
      "*Quinta-feira, 12/11*\n1. 09:00\n2. 10:30",
    );
  });
});
