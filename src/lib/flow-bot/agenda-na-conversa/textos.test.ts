import { describe, expect, it } from "vitest";
import { paraWhatsApp } from "@/lib/whatsapp/formatacao";
import {
  confirmacaoDeReserva,
  confirmacaoDeRemarcacao,
  confirmacaoDeCancelamento,
  menu,
} from "./textos";

describe("identidade WhatsApp da agenda", () => {
  it("menus usam título em negrito, numeração estável e observação em itálico", () => {
    const enviado = paraWhatsApp(
      menu(
        "Qual serviço você quer?",
        [
          { valor: "s1", rotulo: "Massagem — R$ 150,00" },
          { valor: "s2", rotulo: "Corte — R$ 45,00" },
        ],
        "Se preferir, diga o nome do serviço.",
      ),
    );
    expect(enviado).toBe(
      "📋 *Qual serviço você quer?*\n\n*1)* Massagem — R$ 150,00\n*2)* Corte — R$ 45,00\n\n_Se preferir, diga o nome do serviço._",
    );
    expect(enviado).not.toContain("http");
  });

  it("confirmação informa dados reais, agradece e encerra sem reabrir menu", () => {
    const msg = paraWhatsApp(
      confirmacaoDeReserva({
        nome: "Maria Souza",
        servico: "Massagem relaxante",
        profissional: "Ana",
        quando: "segunda-feira, 09/11, às 18:00",
        valor: "R$ 150,00",
      }),
    );
    expect(msg).toContain("✅ *Agendamento confirmado, Maria!*");
    expect(msg).toContain("*Serviço:* Massagem relaxante");
    expect(msg).toContain("*Profissional:* Ana");
    expect(msg).toContain("*Data e horário:* Segunda-feira, 09/11, às 18:00");
    expect(msg).toContain("*Valor do serviço:* R$ 150,00");
    expect(msg).toContain("Obrigado por escolher a gente!");
    expect(msg).toContain("*remarcar* ou *cancelar*");
    expect(msg).not.toMatch(/como posso ajudar|https?:\/\/|responda \*sim\*/i);
  });

  it("não inventa profissional nem valor", () => {
    const msg = confirmacaoDeReserva({ servico: "Manicure", quando: "terça-feira, 10/11, às 09:00" });
    expect(msg).toContain("✅ *Agendamento confirmado!*");
    expect(msg).not.toContain("*Profissional:*");
    expect(msg).not.toContain("*Valor do serviço:*");
  });

  it("remarcação distingue horário novo de agendamento novo", () => {
    const msg = paraWhatsApp(confirmacaoDeRemarcacao("quarta-feira, 11/11, às 16:30"));
    expect(msg).toContain("✅ *Horário remarcado com sucesso!*");
    expect(msg).toContain("*Novo horário:* Quarta-feira, 11/11, às 16:30");
    expect(msg).not.toContain("Agendamento confirmado");
  });

  it("cancelamento mantém horário original claramente identificado", () => {
    const msg = paraWhatsApp(confirmacaoDeCancelamento("Corte", "sábado, 14/11, às 15:00"));
    expect(msg).toContain("✅ *Cancelamento realizado.*");
    expect(msg).toContain("*Serviço:* Corte");
    expect(msg).toContain("*Horário cancelado:* sábado, 14/11, às 15:00");
  });

  it("preserva riscado, citação, itálico, monoespaçado e emojis", () => {
    const texto = "🗓️ ~Segunda, 09/11~ *Terça, 10/11*\n> Cliente pediu outra data\n_Chegando 10 minutos antes_";
    expect(paraWhatsApp(texto)).toBe(texto);
    expect(paraWhatsApp("Código: " + String.fromCharCode(96) + "123456" + String.fromCharCode(96))).toContain("123456");
  });
});
