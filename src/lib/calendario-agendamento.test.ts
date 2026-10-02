import { describe, expect, it } from "vitest";
import { gerarIcs } from "./previa";
import { linkGoogleAgenda } from "./calendario-agendamento";
import type { ConfirmacaoPublica } from "./agendamento-publico.functions";

const confirmacao: ConfirmacaoPublica = {
  agendamentoId: "agenda-1",
  preferenciasToken: "segredo",
  inicio: "2026-10-05T15:00:00.000Z",
  fim: "2026-10-05T15:30:00.000Z",
  cliente: "Ana",
  servico: "Atendimento",
  profissional: "Bia",
  barbearia: "Estúdio",
  endereco: "Rua Um, 10",
  whatsapp: null,
  valor_centavos: 5000,
};

describe("calendário do agendamento", () => {
  it("monta template completo do Google Agenda", () => {
    const url = new URL(linkGoogleAgenda(confirmacao));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261005T150000Z/20261005T153000Z");
    expect(url.searchParams.get("location")).toBe("Rua Um, 10");
  });
  it("gera conteúdo ICS real e compatível", () => {
    const conteudo = gerarIcs({
      id: confirmacao.agendamentoId,
      inicio: confirmacao.inicio,
      fim: confirmacao.fim,
      titulo: confirmacao.servico,
      local: confirmacao.endereco,
    });
    expect(conteudo).toContain("BEGIN:VCALENDAR\r\n");
    expect(conteudo).toContain("DTSTART:20261005T150000Z");
  });
});
